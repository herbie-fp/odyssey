import { create } from "domain";
import { applyTransformDependencies } from "mathjs";
import { expression } from "mathjs11";
import { html, For, Show, Switch, Match, unwrap, untrack } from "../../dependencies/dependencies.js";
import { createStore, createEffect, createRenderEffect, createMemo, produce, createSignal, createResource } from "../../dependencies/dependencies.js";
import { math, Plot, Inputs, math11 } from "../../dependencies/dependencies.js"

const vscodeApi = await (window as any).acquireVsCodeApi()

window.addEventListener('message', event => {
  console.log("FOOBAR got message")
  const message = event.data 
  switch (message.command) {
    case 'openNewTab':
      const { mathjs, ranges } = message
      //@ts-ignore
      document.querySelector('#newSpecInput textarea').value = JSON.stringify({ mathjs, ranges })
      //@ts-ignore
      document.querySelector('button').click()
      break;
  }
})

let specId = 1
let sampleId = 1
let expressionId = 1
let variableId = 1

let RETRY = true

function getColorCode(seed) {
  var makeColorCode = '0123456789ABCDEF';
  var code = '#';
  // 1993 Park-Miller LCG, courtesy of https://gist.github.com/blixt/f17b47c62508be59987b
  function LCG(s) {
    return function() {
      s = Math.imul(48271, s) | 0 % 2147483647;
      return (s & 2147483647) / 2147483648;
    }
  }
  const rand = LCG(seed + 15)
  rand()  //burn first result
  for (var count = 0; count < 6; count++) {
     code =code+ makeColorCode[Math.floor(rand() * 16)];
  }
  return code;
}

/**
 * 
 * @param cacheValue a signal for the value being computed
 * @param fn the function to run, can be async; must set cacheValue to mark the value as computed
 * @param args other arguments to pass to the function
 * @returns an object representing the computation state with a status field whose value may be 'unrequested', 'requested', 'computed', or 'error'.
 */
function computable(cacheValue=()=>undefined, fn, ...args) {
  // promise-ish, but not exactly the same
  const computeN = COMPUTE_N++
  console.log('make compute:', computeN)

  const compute = async () => {
      setStore(produce(store => {
        //store.promise = p
        store.status = 'requested'
      }))
    //const p = new Promise((resolve, reject) => {
      try {
        // TODO something with log capture here
        await fn(...args)
        // NOTE we rely on fn to set the cacheValue for termination
        //resolve(out)
        // setStore(produce(store => {
        //   store.status = 'computed'
        //   store.value = out
        // }))
      } catch (e) {
        //reject(e)
        setStore(produce(store => {
          store.error = e
          store.status = 'error'
        }))
      }
    //})
  }

  const [store, setStore] = createStore({
    status: 'unrequested',
    compute,
    //promise: undefined as Promise<any> | undefined,
    error: undefined as any,
    log: undefined,  // technically should be able to log operations...
    value: undefined
  })

  createEffect(() => {  // if the cache gets updated before compute, just resolve
    // TODO might need to bail here if already computed? Don't want to constantly reset value...
    console.log('effect running for', computeN)
    const value = cacheValue()
    console.log(value)
    if (value !== undefined) {
      console.log('setting computed', value, 'for', computeN)
      setStore(produce(store => {
        store.status = 'computed'
        store.value = value
      }))
      //console.log(store.status)
    }
  })
  return store
}

const fpcorejs = (() => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const CONSTANTS = { "PI": "real", "E": "real", "TRUE": "bool", "FALSE": "bool" }

  const FUNCTIONS = {}

  "+ - * / pow copysign fdim fmin fmax fmod hypot remainder".split(" ").forEach(function (op) {
    FUNCTIONS[op] = [["real", "real"], "real"];
  });
  ("fabs sqrt exp log sin cos tan asin acos atan sinh cosh tanh asinh acosh atanh " +
    "cbrt ceil erf erfc exp2 expm1 floor lgamma log10 log1p log2 logb rint " +
    "round tgamma trunc").split(" ").forEach(function (op) {
      FUNCTIONS[op] = [["real"], "real"];
    });
  FUNCTIONS["fma"] = [["real", "real", "real"], "real"];
  "< > == != <= >=".split(" ").forEach(function (op) {
    FUNCTIONS[op] = [["real", "real"], "bool"];
  });
  "and or".split(" ").forEach(function (op) {
    FUNCTIONS[op] = [["bool", "bool"], "bool"];
  });

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const SECRETFUNCTIONS = { "^": "pow", "**": "pow", "abs": "fabs", "min": "fmin", "max": "fmax", "mod": "fmod" }

  function tree_errors(tree, expected) /* tree -> list */ {
    var messages = [] as any[];
    var names = [] as any[];

    function node_processor(node, path, parent) {
      switch (node.type) {
        case "ConstantNode":
          if (["number", "boolean"].indexOf(node.valueType) === -1) {
            messages.push("Constants that are " + node.valueType + "s not supported.");
          }
          return ({ "number": "real", "boolean": "bool" })[node.valueType] || "real";
        case "FunctionNode":
          const name = SECRETFUNCTIONS[node.name] || node.name;
          if (!FUNCTIONS[name]) {
            messages.push("Function <code>" + name + "</code> unsupported.");
          } else if (FUNCTIONS[name][0].length !== node.args.length) {
            messages.push("Function <code>" + name + "</code> expects " +
              FUNCTIONS[name][0].length + " arguments");
          } else if ("" + extract(node.args) !== "" + FUNCTIONS[name][0]) {
            messages.push("Function <code>" + name + "</code>" +
              " expects arguments of type " +
              FUNCTIONS[name][0].join(", ") +
              ", got " + extract(node.args).join(", "));
          }
          return (FUNCTIONS[name] || [[], "real"])[1];
        case "OperatorNode":
          // NOTE changed from node.op reassignment to be compatible with mathjs 4.4.2
          node = { ...node, op: SECRETFUNCTIONS[node.op] || node.op }
          //node.op = SECRETFUNCTIONS[node.op] || node.op;
          if (!FUNCTIONS[node.op]) {
            messages.push("Operator <code>" + node.op + "</code> unsupported.");
          } else if (FUNCTIONS[node.op][0].length !== node.args.length &&
            !(node.op === "-" && node.args.length === 1)) {
            messages.push("Operator <code>" + node.op + "</code> expects " +
              FUNCTIONS[node.op][0].length + " arguments");
          } else if ("" + extract(node.args) !== "" + FUNCTIONS[node.op][0] &&
            !(node.op === "-" && "" + extract(node.args) === "real") &&
            !(is_comparison(node.op) /* TODO improve */)) {
            messages.push("Operator <code>" + node.op + "</code>" +
              " expects arguments of type " +
              FUNCTIONS[node.op][0].join(", ") +
              ", got " + extract(node.args).join(", "));
          }
          return (FUNCTIONS[node.op] || [[], "real"])[1];
        case "SymbolNode":
          if (!CONSTANTS[node.name]) {
            names.push(node.name);
            return "real";
          } else {
            return CONSTANTS[node.name];
          }
        case "ConditionalNode":
          if (node.condition.res !== "bool") {
            messages.push("Conditional has type " + node.condition.res + " instead of bool");
          }
          if (node.trueExpr.res !== node.falseExpr.res) {
            messages.push("Conditional branches have different types " + node.trueExpr.res + " and " + node.falseExpr.res);
          }
          return node.trueExpr.res;
        // case "ParenthesisNode":
        //   return node_processor(node.content, path, parent)
        default:
          messages.push("Unsupported syntax; found unexpected <code>" + node.type + "</code>.")
          return "real";
      }
    }

    var rtype = bottom_up(tree, node_processor).res;

    if (rtype !== expected) {
      messages.push("Expected an expression of type " + expected + ", got " + rtype);
    }

    return messages;
  }

  function bottom_up(tree, cb) {
    if (tree.args) {
      tree.args = tree.args.map(function (node) { return bottom_up(node, cb) });
    } else if (tree.condition) {
      tree.condition = bottom_up(tree.condition, cb);
      tree.trueExpr = bottom_up(tree.trueExpr, cb);
      tree.falseExpr = bottom_up(tree.falseExpr, cb);
    }
    tree.res = cb(tree);
    return tree;
  }

  function dump_fpcore(formula, ranges) {  // NOTE modified get_precondition...
    var tree = math.parse(formula);

    var names = [];
    var body = dump_tree(tree, names);
    var precondition = ranges ? get_precondition_from_input_ranges(ranges) : null;

    var dnames = [];
    for (var i = 0; i < names.length; i++) {
      if (dnames.indexOf(names[i]) === -1) dnames.push(names[i]);
    }

    var name = formula.replace("\\", "\\\\").replace("\"", "\\\"");
    var fpcore = "(FPCore (" + dnames.join(" ") + ")\n  :name \"" + name + "\"";
    if (precondition) fpcore += "\n  :pre " + precondition;

    return fpcore + "\n  " + body + ")";
  }

  function is_comparison(name) {
    return ["==", "!=", "<", ">", "<=", ">="].indexOf(name) !== -1;
  }

  function flatten_comparisons(node) {
    var terms = [] as any[];
    (function collect_terms(node) {
      if (node.type == "OperatorNode" && is_comparison(node.op)) {
        collect_terms(node.args[0]);
        collect_terms(node.args[1]);
      } else {
        terms.push(node.res);
      }
    })(node);
    var conjuncts = [] as any[];
    var iters = 0;
    (function do_flatten(node) {
      if (node.type == "OperatorNode" && is_comparison(node.op)) {
        do_flatten(node.args[0]);
        var i = iters++; // save old value and increment it
        var prev = conjuncts[conjuncts.length - 1];
        if (prev && prev[0] == node.op && prev[2] == terms[i]) {
          prev.push(terms[i + 1]);
        } else {
          conjuncts.push([node.op, terms[i], terms[i + 1]]);
        }
        do_flatten(node.args[1]);
      }
    })(node);
    var comparisons = [] as any[];
    for (var i = 0; i < conjuncts.length; i++) {
      comparisons.push("(" + conjuncts[i].join(" ") + ")");
    }
    if (comparisons.length == 0) {
      return "TRUE";
    } else if (comparisons.length == 1) {
      return comparisons[0];
    } else {
      return "(and " + comparisons.join(" ") + ")";
    }
  }

  function extract(args) { return args.map(function (n) { return n.res }); }

  function dump_tree(tree, names) {
    function node_processor(node) {
      switch (node.type) {
        case "ConstantNode":
          return "" + node.value;
        case "FunctionNode":
          // NOTE changed from node.name reassignment to be compatible with mathjs 4.4.2
          const name = SECRETFUNCTIONS[node.name] || node.name;
          return "(" + name + " " + extract(node.args).join(" ") + ")";
        // case "ParenthesisNode":
        //   return node_processor(node.content)
        case "OperatorNode":
          // NOTE changed from node.op reassignment to be compatible with mathjs 4.4.2
          const op = SECRETFUNCTIONS[node.op] || node.op;
          if (is_comparison(op)) {
            return flatten_comparisons({ ...node, op });
          } else {
            return "(" + op + " " + extract(node.args).join(" ") + ")";
          }
        case "SymbolNode":
          if (!CONSTANTS[node.name])
            names.push(node.name);
          return node.name;
        case "ConditionalNode":
          return "(if " + node.condition.res +
            " " + node.trueExpr.res +
            " " + node.falseExpr.res + ")";
        default:
          throw SyntaxError("Invalid tree!");
      }
    }
    return bottom_up(tree, node_processor).res;
  }
  //@ts-ignore
  window.dump_tree = dump_tree
  //@ts-ignore
  window.math = math

  function get_varnames_mathjs(mathjs_text) {
    const names = []
    dump_tree(math.parse(mathjs_text), names)
    var dnames = [];
    for (var i = 0; i < names.length; i++) {
      if (dnames.indexOf(names[i]) === -1) dnames.push(names[i]);
    }
    return dnames
  }

  function get_varnames_fpcore(fpcore) {
    return fpcore.split(/[()]/)[2].split(' ')
  }

  function get_precondition_from_input_ranges(ranges) {  // NOTE modified get_precondition...
    // ranges should be like [["x", [-1, 1]], ["y", [0, 1000]]
    // assumes ranges was already checked for validity using eg. get_input_range_errors
    const exprs = ranges.map(([name, [start, end]]) => `(<= ${start} ${name} ${end})`).join(' ')
    return `(and ${exprs})`
  }

  function get_input_range_errors([low, high] = [undefined, undefined], empty_if_missing = false) {
    if ((low === undefined || low === '') || (high === undefined || high === '')) return empty_if_missing ? [] : ['input missing']
    const A = [] as any[]
    if (!(low === undefined || low === '') && isNaN(Number(low))) {
      A.push(`The start of the range (${low}) is not a number.`)
    } else if (!Number.isFinite(Number(low))) {
      A.push(`The start of the range (${low}) is outside the floating point range.`)
    }

    if (!(high === undefined || high === '') && isNaN(Number(high))) {
      A.push(`The end of the range (${high}) is not a number.`)
    } else if (!Number.isFinite(Number(high))) {
      A.push(`The end of the range (${high}) is outside the floating point range.`)
    }

    if (Number(low) > Number(high)) A.push(`The start of the range is higher than the end.`)

    return A
  }
  function FPCoreBody(mathJSExpr) {
    return dump_tree(math.parse(mathJSExpr), [])
  }

  function FPCoreGetBody(fpcore) {
    function readToken (token) {
      if (token === '(') {
        return {
          type: 'OPENING_PARENS'
        };
      } else if (token === ')') {
        return {
          type: 'CLOSING_PARENS'
        };
      } else if (token.match(/^\d+$/)) {
        return {
          type: 'INTEGER',
          value: parseInt(token)
        };
      } else {
        return {
          type: 'SYMBOL',
          value: token
        };
      }
    }
    
    function tokenize (expression) {
      return expression
        .replace(/\(/g, ' ( ')
        .replace(/\)/g, ' ) ')
        .trim()
        .split(/\s+/)
        .map(readToken);
    }
    
    function buildAST (tokens) {
      return tokens.reduce((ast, token) => {
        if (token.type === 'OPENING_PARENS') {
          ast.push([]);
        } else if (token.type === 'CLOSING_PARENS') {
          const current_expression = ast.pop();
          ast[ast.length - 1].push(current_expression);
        } else {
          const current_expression = ast.pop();
          current_expression.push(token);
          ast.push(current_expression);
        }
        return ast;
      }, [[]])[0][0];
    }
    
    function parse (expression) {
      return buildAST(tokenize(expression));
    }

    function astToString(ast) {
      return ast.value === 0 ? ast.value.toString() : ast.value?.toString() || `(${ast.map(t => astToString(t)).join(' ')})`
    }

    return astToString(parse(fpcore).slice(-1)[0])
  }

  return {
    //dumpFPCore: dump_fpcore,  // Currently has no error handling!
    rangeErrors: get_input_range_errors,
    FPCorePrecondition: get_precondition_from_input_ranges,
    getVarnamesMathJS: get_varnames_mathjs,
    getVarnamesFPCore: get_varnames_fpcore,
    parseErrors: mathJSExpr => {
      function mathJSErrors(mathJSExpr) {
        try { math.parse(mathJSExpr) } catch (e : any) { return [e.message] }
        return []
      }
      const mjserrors = mathJSErrors(mathJSExpr)
      return mjserrors.length > 0 ? mjserrors : tree_errors(math.parse(mathJSExpr), 'real')
    },
    FPCoreBody,
    FPCoreGetBody,  // HACK just the fpcore version of the above, gets just the body
    makeFPCore: ({ specMathJS, ranges, specFPCore, targetFPCoreBody=undefined, name=specMathJS }) => {
      const vars = specFPCore ? get_varnames_fpcore(specFPCore) : get_varnames_mathjs(specMathJS)
      const target = targetFPCoreBody ? `:herbie-target ${targetFPCoreBody}\n  ` : ''
      return `(FPCore (${vars.join(' ')})\n  :name "${name}"\n  :pre ${get_precondition_from_input_ranges(ranges)}\n  ${target}${specFPCore ? FPCoreGetBody(specFPCore) : FPCoreBody(specMathJS)})`
    },
    mathjsToFPCore: (mathjs) => `(FPCore (${get_varnames_mathjs(mathjs).join(' ')}) ${FPCoreBody(mathjs)})`
  }
})()

// let REQUEST_ID = 0

// async function fetch(url, data) : Promise<Response> {
  
//   // HACK We want to avoid CORS restrictions, so we pass the request to the
//   // server via [message passing](https://code.visualstudio.com/api/extension-guides/webview#scripts-and-message-passing)
//   // and wait for a result.
//   //@ts-ignore
//   const vscode = acquireVsCodeApi();
//   const requestId = REQUEST_ID++

//   // Removes the listener via controller.abort()
//   const controller = new AbortController();
//   const signal = controller.signal;

//   let resolve;  // get a promise resolve function
//   const promise = new Promise(r => resolve = r)

//   window.addEventListener('message', event => {
//     const message = event.data; // The JSON data our extension sent
//     if (message.command === 'fetchResponse' && message.requestId === requestId) {
//       resolve(message.response)
//       controller.abort() // + { signal } below removes listener.
//     }
//   }, { signal });

//   vscode.postMessage({
//     command: 'fetch',  // switch for the command to invoke
//     url,
//     data,
//     requestId
//   })
  
//   return promise as Promise<Response>
// }
//@ts-ignore
window.Plot = Plot

interface Point {
  x: number,
  y: number
}
interface PlotArgs {
  /** For each function being plotted, for each `x` in the input, a `y` for the error. */
  data: Point[][]

  /** styles for each function */
  styles: { line: { stroke: string }, dot: { stroke: string } }[]

  /** A string<->ordinal mapping to let us label ticks, eg [['1e10', 12345678], ...] */
  ticks: [string, number][]
  splitpoints: [number]

  /** SVG width */
  width?: number
  /** SVG height */
  height?: number

  [propName: string]: any  // could have other properties
}

const zip = (arr1, arr2) => arr1.reduce((acc, _, i) => (acc.push([arr1[i], arr2[i]]), acc), [])
/**
   * Generate a plot with the given data and associated styles.
   */
// eslint-disable-next-line @typescript-eslint/naming-convention
function plotError({ ticks, splitpoints, data, bits, styles, width=800, height=400 }: PlotArgs, Plot) : SVGElement {
  const tickStrings = ticks.map(t => t[0])
  const tickOrdinals = ticks.map(t => t[1])
  const tickZeroIndex = tickStrings.indexOf("0")
  const domain = [Math.min(...tickOrdinals), Math.max(...tickOrdinals)]

  /** Compress `arr` to length `outLen` by dividing into chunks and applying `chunkCompressor` to each chunk. */
  function compress(arr, outLen, chunkCompressor = points => points[0]) {
    return arr.reduce((acc, pt, i) =>
      i % Math.floor(arr.length / outLen) !== 0 ? acc
      : (acc.push(chunkCompressor(arr.slice(i, i + Math.floor(arr.length / outLen)))), acc)
      , [])
  }

  /** Compute a new array of the same length as `points` by averaging on a window of size `size` at each point. */
  const slidingWindow = (points: Point[], size : number) => {
    const half = Math.floor(size / 2)
    const runningSum = points.reduce((acc, v) => (
        acc.length > 0 ? acc.push(v.y + acc[acc.length - 1])
        : acc.push(v.y), acc)
      , [] as number[])
    return runningSum.reduce((acc, v, i) => {
      const length = 
          (i - half) < 0 ? half + i
          : (i + half) >= runningSum.length ? (runningSum.length - (i - half))
          : size
      const top =
          (i + half) >= runningSum.length ? runningSum[runningSum.length - 1]
          : runningSum[i + half]
      const bottom =
          (i - half) < 0 ? 0
          : runningSum[i - half]
      acc.push({y: (top - bottom) / length, x: points[i].x})
      return acc
    }, [] as Point[])
  }

  /** Takes an array of {x, y} data points.
   * Creates a line graph based on a sliding window of width binSize.
   * Further compresses points to width.
   * */
  function lineAndDotGraphs({data, style: { line, dot }, binSize = 128, width = 800 }) {
    const average = points => ({
      y: points.reduce((acc, e) => e.y + acc, 0) / points.length,
      x: points.reduce((acc, e) => e.x + acc, 0) / points.length
    })
    // console.log(data)
    // console.log(slidingWindow(data, binSize))
    const compressedSlidingWindow = compress(
      slidingWindow(data, binSize), width, average)
    //console.log(compressedSlidingWindow)
    return [
        Plot.line(compressedSlidingWindow, {
            x: "x",
            y: "y",
            strokeWidth: 2, ...line,
        }),
        Plot.dot(compress(data, width), {x: "x", y: "y", r: 1.3,
            title: d => `x: ${d.x} \n i: ${d.i} \n bits of error: ${d.y}`,
            ...dot
        })
    ]
  }

  const out = Plot.plot({
    width: width.toString(),
    height: height.toString(),                
    x: {
        tickFormat: d => tickStrings[tickOrdinals.indexOf(d)],
        ticks: tickOrdinals, /*label: `value of ${varName}`,*/  // LATER axis label
        labelAnchor: 'center', /*labelOffset: [200, 20], tickRotate: 70, */
        domain,
        grid: true
    },
    y: {
        label: "Bits of Error", domain: [0, bits],
        ticks: new Array(bits / 4 + 1).fill(0).map((_, i) => i * 4),
        tickFormat: d => d % 8 !== 0 ? '' : d
    },
    marks: [
      ...[ // Vertical bars ("rules")
        // The splitpoints
        ...splitpoints.map(p => Plot.ruleX([p], { stroke: "lightgray", strokeWidth: 4 })),
        // The 0-rule
        ...(tickZeroIndex > -1 ? [Plot.ruleX([tickOrdinals[tickZeroIndex]])] : []),
      ],
      // The graphs
      ...zip(data, styles).map(([data, style]) => lineAndDotGraphs({ data, style, width })).flat()]
  })
  out.setAttribute('viewBox', `0 0 ${width} ${height + 30}`)
  return out
}

const herbiejs = (() => {
  async function graphHtmlAndPointsJson(fpcore, host, log) {
    const improveStartLoc = host === 'http://127.0.0.1:8080/http://herbie.uwplse.org' ? host + '/demo/improve-start' : host + '/improve-start'
    const sendJobResponse = await fetch( improveStartLoc, {
      "headers": {
          // eslint-disable-next-line @typescript-eslint/naming-convention
        "Content-Type": "application/x-www-form-urlencoded",
        "Sec-Fetch-Site": "same-origin"
      },
      "body": `formula=${encodeURIComponent(fpcore)}`,
      "referrer": "https://herbie.uwplse.org/demo/",
      "method": "POST",
      "mode": "cors"
    });
    // await fetch("https://herbie.uwplse.org/demo/improve-start", {
    // "credentials": "omit",
    // "headers": {
    //     "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0",
    //     "Accept": "*/*",
    //     "Accept-Language": "en-US,en;q=0.5",
    //     "Content-Type": "application/x-www-form-urlencoded",
    //     "Sec-Fetch-Dest": "empty",
    //     "Sec-Fetch-Mode": "cors",
    //     "Sec-Fetch-Site": "same-origin"
    // },
    // ,

    const checkStatusLocation = sendJobResponse.headers.get('location')
    const checkStatusResponse = await (async () => {
      let out = null as any
      while (!out) {
        const check = await fetch(`${host}${checkStatusLocation}`, {
          "method": "GET",
          "mode": "cors"
        });
        const text = await check.text()
        if (text) {log(text); await new Promise(resolve => setTimeout(() => resolve(null), 500))}
        else {out = check}
      }
      return out
    })()
    const graphHtmlLocation = checkStatusResponse.headers.get('location')
    const graphHtmlResponse = await fetch(`${host}${graphHtmlLocation}`, {
      "method": "GET",
      "mode": "cors"
    });
    const graphHtml = await graphHtmlResponse.text()
    const pointsJsonLocation = [...graphHtmlLocation.split('/').slice(0, -1), 'points.json'].join('/')
    const pointsJsonResponse = await fetch(`${host}${pointsJsonLocation}`, {
      "method": "GET",
      "mode": "cors"
    });
    const pointsJson = await pointsJsonResponse.json()
    return { graphHtml, pointsJson }
  }
  return ({
    getSample: async (fpcore, host, log=txt=>console.log(txt)) => {
      try {
        return (await (await fetch(`${host}/api/sample`, { method: 'POST', body: JSON.stringify({ formula: fpcore, seed: 5}) })).json())  // TODO change seed to resample
      } catch (e) {
        console.error('Bad /sample call, error was', e)
        if (RETRY) {  // HACK to just retry once
          RETRY = false
          console.log('retrying /sample')
          return (await (await fetch(`${host}/api/sample`, { method: 'POST', body: JSON.stringify({ formula: fpcore, seed: 5}) })).json())  // TODO change seed to resample
        } else {
          throw e
        }
      }
      
      const { graphHtml, pointsJson } = await graphHtmlAndPointsJson(fpcore, host, log)
      return pointsJson
    },
    suggestExpressions: async (fpcore, sample, host, log, html) => {
      return (await (await fetch(`${host}/api/alternatives`, { method: 'POST', body: JSON.stringify({ formula: fpcore, sample: sample.points }) })).json())
      const { graphHtml, pointsJson } = await graphHtmlAndPointsJson(fpcore, host, log)
      //console.log(graphHtml)
      //@ts-ignore
      window.html = html
      const page = document.createElement('div') as any
      page.innerHTML = graphHtml
      //const page = html`${graphHtml}`
      //console.log('good parse')
      return [ Object.fromEntries([...page.querySelectorAll('.implementation')].map(d => [d.getAttribute('data-language'), {spec: d.textContent.split('↓')[0], suggestion: d.textContent.split('↓')[1]}])).FPCore.suggestion ].map( v => {
        const body = v.slice(v.slice(9).indexOf('(') + 9, -1)
        return body
    })
    },
    analyzeExpression: async (fpcore, sample, host, log) => {
      // const floatToOrdinal = float => 42  // TODO
      // const chooseTicks = sample => []  // TODO
      console.trace('host', host, fpcore)//(await fetch(`${host}/api/analyze`, { method: 'POST', body: JSON.stringify({ formula: fpcore, sample }) })))
      const pointsAndErrors = (await (await fetch(`${host}/api/analyze`, { method: 'POST', body: JSON.stringify({ formula: fpcore.split('\n').join(''), sample: sample.points }) })).json()).points
      const ordinalSample = sample.points.map(p => p[0].map(v => ordinalsjs.floatToApproximateOrdinal(v)))
      
      const vars = fpcorejs.getVarnamesFPCore(fpcore)
      const ticksByVarIdx = vars.map((v, i) => {
        const values = sample.points.map(p => p[0][i])
        return ordinalsjs.chooseTicks(fastMin(values), fastMax(values)).map(v => [displayNumber(v), ordinalsjs.floatToApproximateOrdinal(v)])
      })

      console.log(`ticksByVarIdx`, sample, ticksByVarIdx)
      
      const splitpointsByVarIdx = vars.map(v => [])  // HACK no splitpoints for now
      //console.log('pointsAndErrors', pointsAndErrors)
      const errors = pointsAndErrors.map(([point, error]) => new Number(error))
      const meanBitsError = new Number((errors.reduce((sum, v) => sum + v, 0)/errors.length).toFixed(2))
      return { pointsJson: { points: ordinalSample, ticks_by_varidx: ticksByVarIdx, splitpoints_by_varidx: splitpointsByVarIdx, bits: 64, vars, error: { target: errors } }, meanBitsError }
      // fields: { points, ticks_by_varidx, splitpoints_by_varidx: splitpointsByVarIdx, bits, vars, error.target }
        // const { graphHtml, pointsJson } = await graphHtmlAndPointsJson(fpcorejs.makeFPCore({specMathJS: spec.mathjs, specFPCore: spec.fpcore, ranges: spec.ranges, targetFPCoreBody }).split('\n').join(''), host, log)
        // const meanBitsError = new Number((pointsJson.error.target.reduce((sum, v) => sum + v, 0)/pointsJson.error.target.length).toFixed(2))
        // return {graphHtml, pointsJson, meanBitsError}
    },
    fPCoreToMathJS: async (fpcore, host) => {
      return (await (await fetch(`${host}/api/mathjs`, { method: 'POST', body: JSON.stringify({ formula: fpcore}) })).json()).mathjs
    }
  })
})()

const displayNumber = v => {
  const s = v.toPrecision(1)
  const [base, exponent] = s.split('e')
  if (!exponent) {
    return v.toPrecision(1) == v ? v.toPrecision(1) : v.toPrecision(6)
  }
  if (exponent <= 1 && -1 <= exponent) {
    const a = v.toString()
    const b = v.toPrecision(6)
    return a.length < b.length ? a : b
  }
  return v.toPrecision(1)
}

function fastMin(arr) {
  var len = arr.length, min = Infinity;
  while (len--) {
    if (arr[len] < min) {
      min = arr[len];
    }
  }
  return min;
};

function fastMax(arr) {
  var len = arr.length, max = -Infinity;
  while (len--) {
    if (arr[len] > max) {
      max = arr[len];
    }
  }
  return max;
};

const ordinalsjs = (() => {
  const math = math11
  function to_signed_int (float64) {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setFloat64(0, float64)
    return view.getBigInt64(0)
  }

  function real_from_signed_int (signed) {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)
    view.setBigInt64(0, signed)
    return view.getFloat64(0)
  }

  function mbn(x) {
    return math.bignumber(to_signed_int(x).toString())
  }

  const mbn_neg_0 = mbn(-0.0)

  function real_to_ordinal(real) {
    let signed = to_signed_int(real)
    let mbn = math.bignumber(signed.toString())
    return signed >= 0 ? mbn : math.subtract(mbn_neg_0, mbn)
  }

  function ordinal_to_real(ordinal) {
    return ordinal >=0 ? real_from_signed_int(BigInt(ordinal)) : real_from_signed_int(BigInt(math.subtract(mbn_neg_0, math.bignumber(ordinal))))
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(x, lo))
  }

  function first_power10(min, max) {
    let value = max < 0 ? - (10 ** Math.ceil(Math.log(-max)/ Math.log(10))) : 10 ** (Math.floor(Math.log(max) / Math.log(10)))
    return value <= min ? false : value
  }

  function choose_between(min, max, number) {
    // ; Returns a given number of ticks, roughly evenly spaced, between min and max
    // ; For any tick, n divisions below max, the tick is an ordinal corresponding to:
    // ;  (a) a power of 10 between n and (n + ε) divisions below max where ε is some tolerance, or
    // ;  (b) a value, n divisions below max
    let sub_range = Math.round((max - min) / (1 + number))
    let near = (x, n) => (x <= n) && (Math.abs((x - n) / sub_range) <= .2)  // <= tolerance
    return [...Array(number)].map((_, i) => i + 1).map(itr => {
      let power10 = first_power10(
        ordinal_to_real(clamp(max - ((itr + 1) * sub_range), min, max)),
        ordinal_to_real(clamp(max - (itr * sub_range), min, max))
      )
      return power10 && near(real_to_ordinal(power10), max - (itr * sub_range)) ? real_to_ordinal(power10)
        : max - (itr * sub_range)
    })
  }

  function pick_spaced_ordinals(necessary, min, max, number) {
    // NOTE that subtle use of mathjs bignumbers is required in this function...
    let sub_range = math.divide(math.bignumber(math.subtract(math.bignumber(max), math.bignumber(min))), math.bignumber(number)) // size of a division on the ordinal range
    let necessary_star = (function loop(necessary) {
      return necessary.length < 2 ? necessary
        : math.smaller(math.subtract(necessary[1], necessary[0]), sub_range) ? loop(necessary.slice(1)) 
        : [necessary[0], ...loop(necessary.slice(1))]
    })(necessary) // filter out necessary points that are too close
    let all = (function loop(necessary, min_star, start) {
      if (start >= number) { return [] }
      if (necessary.length == 0) { return choose_between(min_star, max, number - start) }
      let idx :any = false
      for (let i = 0; i < number; i++) {
        //@ts-ignore
        if (math.smallerEq(math.subtract(necessary[0], math.add(min, math.bignumber(math.multiply(i, sub_range)))), sub_range)) {
          idx = i
          break
        }
      }
      return [...choose_between(min_star, necessary[0], idx - start), ...loop(necessary.slice(1), necessary[0], idx + 1)]
    })(necessary_star, min, 0)
    return [...all, ...necessary_star].sort((a, b) => math.subtract(math.bignumber(a), math.bignumber(b)))
  }

  function choose_ticks(min, max) {
    let tick_count = 13
    let necessary = [min, -1.0, 0, 1.0, max].filter(v => (min <= v) && (v <= max) && (min <= max)).map(v => real_to_ordinal(v))
    let major_ticks = pick_spaced_ordinals(necessary, real_to_ordinal(min), real_to_ordinal(max), tick_count).map(v => ordinal_to_real(v))
    return major_ticks
  }

  function float_to_approximate_ordinal(float) {
    return real_to_ordinal(float).toNumber()
  }
  return {
    chooseTicks: choose_ticks,
    floatToApproximateOrdinal: float_to_approximate_ordinal
  }
})()

function mainPage(api) {
  //console.clear()
  console.log('Setting up main demo page...')
  const defaultSpec = { mathjs: "sqrt(x+1) - sqrt(x)", ranges: [["x", [1, 1e9]]] }
  //const defaultSpec = { mathjs: "sqrt(x+1) - sqrt(y)", ranges: [["x", [1, 1e9]], ["y", [-1e9, 1]]] }
  const textarea = (value: any = JSON.stringify(defaultSpec), setValue = (v) => { }) => html`<textarea value="${value}" oninput=${e => setValue(e.target.value)}></textarea>` as HTMLInputElement

  const addSpec = async ({ mathjs, ranges, fpcore }) => {
    const id = specId++
    const spec = { mathjs, fpcore: fpcorejs.makeFPCore({ specMathJS: mathjs, specFPCore: fpcore, ranges }), ranges, id }
    await api.action('create', 'demo', 'Specs', spec)
    api.select('Specs', id)
    api.multiselect('Expressions', expressions().filter(e => e.specId === id).map(e => e.id))
  }

  const newSpecInput = () => {
    const text = textarea()
    return html`
  <div id="newSpecInput">
    Add Spec:
    <div>
    ${text}
    </div>
    <button onClick=${() => addSpec(JSON.parse(text.value))}>Submit</button>
  </div>
  `}
  /*
    <div>Add input range:</div>
    <div>Other spec config here...</div>
    <button onClick=${submit}>Add input range</button>
  */
  const modifyRange = startingSpec => {
    const text = textarea(JSON.stringify(startingSpec.ranges))
    return html`
      <div id="modifyRange">
        Add Ranges:
          <div>
          ${text}
          </div>
        <button onClick=${() => addSpec({ ...startingSpec, ranges: JSON.parse(text.value) })}>Add input range</button>
      </div>
      `
  }
  const specs = () => api.tables.find(t => t.name === 'Specs').items

  // HACK just use stores, put into tables later
  const [samples, setSamples] = createStore([] as any[])
  //const [expressions, setExpressions] = createStore([] as any[])
  const expressions = () => api.tables.find(t => t.name === 'Expressions')?.items
  
  // TODO rename as specRow for consistency, no get...
  const getSpecRow = spec => {
    // HACK all samples are relevant for now
    //const samples = relevantSamples(spec)
    const relevantSamples = () => samples.filter(sample => sample.specId === spec.id)
    // HACK mock sample retrieval
    const getSampleHandler = () => setSamples(produce(samples => samples.push({ specId: spec.id, id: sampleId++ })))
    const addSampleButton = html`<button onClick=${getSampleHandler}>Add Sample</button>`
    const sampleSelect = html`<select>
      <${For} each=${relevantSamples}>${sample => html`<option>${sample.id}</option>`}<//>
    </select>`

    const request = () => api.tables.find(t => t.name === "Requests").items.find(r => r.specId === spec.id)
    const makeRequest = () => api.action('create', 'demo', 'Requests', { specId: spec.id })//, api.tables, api.setTables)
    console.log('rerendering')
    const herbieSuggestion = () => expressions().find(o => o.specId === spec.id && o.provenance === 'herbie')

    const selectSpec = spec => api.select('Specs', spec.id)//, api.tables, api.setTables)
    return html`<div class="specRow">
      <span onClick=${() => selectSpec(spec)}>Range with id ${spec.id}</span>
      <${Show} when=${() => relevantSamples().length !== 0}>
        <span>${sampleSelect}</span>
        <span>...Spec/sample summary goes here...</span>
      <//>
      <span>
        <${Switch}>
          <${Match} when=${() => /*c.status === 'unrequested' &&*/!request() && !herbieSuggestion()}>
            <button onClick=${() => (genHerbieAlts(spec, api), makeRequest())}>Ask Herbie for alternative expressions</button>
          <//>
          <${Match} when=${() => /*c.status === 'requested' */ request() && !herbieSuggestion()}>
            waiting for alternatives...
          <//>
          <${Match} when=${() => herbieSuggestion()}>
            [alternatives shown]
          <//>
          <${Match} when=${() => /* TODO check associated request for error */ false}>
            error during computation :(
          <//>
          <${Match} when=${() => true}>
            ${() => {
        return 'other case'
      }
      }
          <//>
        <//>
      </span>
    </div>`
  }
  const selectExpression = expression => () => {
    console.log
    if (lastSelectedExpression()?.id === expression.id) { return }
    api.select('Expressions', expression.id)//, api.tables, api.setTables)
  }

  const analyses = () => api.tables.find(t => t.name === 'Analyses').items

  const getExpressionRow = (expression, spec) => {
    const analysis = () => analyses().find(a => a.expressionId === expression.id)
    

    //console.log(currentSelection())
    const toggleMultiselected = () => {
      const newSelectionIds = [
        ...currentMultiselection(api).map(o => o.id).filter(id => id !== expression.id),
        ...[boxChecked() ? [] : expression.id]]
      //console.log(newSelectionIds)
      //api.select('Specs', expression.specId)//, api.tables, api.setTables)
      api.multiselect('Expressions', newSelectionIds)//, api.tables, api.setTables)
    }
    // <button onClick=${c.compute}>Run Analysis</button>
    // 
    const boxChecked = () => currentMultiselection(api).find(o => o.id === expression.id)
    // <span>
    // <button>inline details</button>
    // </span>
    //console.log('here 800', c, analysis, expression)
    //style="color: ${() => getColorCode(expression.id)};"
    // onClick=${selectExpression(expression)}
    // onClick=${() => api.select('Specs', expression.specId)}
    const hideExpression = async expression => {
      await api.action('create', 'demo', 'HiddenExpressions', { specId: spec.id, expressionId: expression.id })//, api.tables, api.setTables) // TODO implement

      const curr = currentMultiselection(api).map(o => o.id)
      api.multiselect('Expressions', curr.filter(id => !getByKey(api, 'HiddenExpressions', 'expressionId', id)))//, api.tables, api.setTables)
    }
    return html`<tr class="expressionRow" >
      <td style=${() => ({ "background-color": getColorCode(expression.id) })}>&nbsp;</td>
      <td>
        <input type="checkbox" onClick=${toggleMultiselected} checked=${boxChecked}>
      </td>
      <td class="expression ${(expression.mathjs === spec.mathjs || expression.fpcore === spec.fpcore) ? 'naive-expression' : ''}" onClick=${selectExpression(expression)}>${expression.mathjs}</td>
      
      <td class="meanBitsError">
        <${Switch}>
          <${Match} when=${() => false && /* c.status === 'unrequested' && */ !analysis() /* && !request() */}>
            waiting for analysis (unreq)...
          <//>
          <${Match} when=${() => /*c.status === 'requested' */ !analysis() /*&& request() */}>
            ...
          <//>
          <${Match} when=${() => analysis() /*c.status === 'computed'*/}>
            ${() => JSON.stringify(analysis().meanBitsError)/*.meanBitsError/*JSON.stringify(Object.fromEntries(Object.entries(analysis()).filter(([k, v]) => ['meanBitsError', 'performance', 'expressionId'].includes(k)).map(([k, v]) => k === 'expressionId' ? ['rangeId', expressions().find(e => e.id === v)?.specId] : [k, v])))*/}
          <//>
          <${Match} when=${() => false /*(c.status === 'error' */}>
            error during computation :(
          <//>
        <//>
      </td>
      <td >
        <button onClick=${() => hideExpression(expression)} class="hideExpression">x</button>
      </td>
    </tr>`
  }

  const getExprSpec = expr => specs().find(spec => spec.id === expr.specId)

  /** expressions where spec.mathjs === expr's spec.mathjs (or ditto fpcore) */
  const expressionsForSpec = spec => {
    return expressions().filter(e => e.specId === spec.id)
    // console.debug('Checking expressions for the spec...', spec, unwrap(expressions()), unwrap(specs()), getExprSpec((expressions() || [{}])[0] || {}))
    // return expressions().filter(expr => {
    //   const exprSpec = getExprSpec(expr)
    //   return spec.id === exprSpec.mathjs 
    //   || spec.fpcore === exprSpec.fpcore
    // })
  }
  const noExpressionsForSpec = spec => expressionsForSpec(spec).length === 0
  
  const makeExpression = (spec, fpcore, mathjs) => () => {
    //console.log('makeExpression called')
    const id = expressionId++
    // ugly HACK duplicate the spec on the expression, see analyzeExpression
    api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore, id, spec, mathjs })//, api.tables, api.setTables)
    //api.action('select', 'demo', 'Expressions', (o, table) => o.id === id, api.tables, api.setTables, api)
    const curr = currentMultiselection(api).map(o => o.id)
    api.multiselect('Expressions', [...curr, id])//, api.tables, api.setTables)
  }
  
  const makeExpressionFromSpec = spec => console.log('Not implemented yet.')//makeExpression(spec, spec.fpcore /*fpcorejs.FPCoreGetBody(spec.fpcore) || fpcorejs.FPCoreBody(spec.mathjs)*/, spec.mathjs)

  const noExpressionsRow = spec => {
    return html`<div class="noExpressionsRow">
      <span><button onClick=${makeExpressionFromSpec(spec)}>Create the default expression for this spec</button></span>
    </div>`
  }
  // const [spec0] : any= createResource(async () => {
  //   await waitUntil(() => specs().length > 0)
  //   return specs()[0]
  // })
  const [addExpressionText, setAddExpressionText] = createSignal('')
  //setTimeout(() => setAddExpressionText(specs()?.[0]?.mathjs), 1000)
  createEffect(() => specs()?.[0]?.mathjs && setAddExpressionText(specs()[0].mathjs))
  let firstTime = true
  const addExpressionRow = spec => {
    const text = addExpressionText
    const setText = setAddExpressionText
    function debounce( callback, delay ) {
      let timeout;
      return function(...args) {
          clearTimeout( timeout );
          timeout = setTimeout(() => callback(...args), delay );
      }
  }
    const textArea = textarea(text, debounce(v => setText(v), 500))
    const rangeText = textarea(JSON.stringify(spec.ranges))
    const specWithRanges = ranges => getTable(api, 'Specs').find(s => JSON.stringify(ranges) === JSON.stringify(s.ranges))
    async function ensureSpecWithThoseRangesExists(ranges) {
      if (specWithRanges(ranges)) { return; }
      await addSpec({ ...spec, ranges })
    }
    async function addExpression() {
      const ranges = JSON.parse(rangeText.value)
      await ensureSpecWithThoseRangesExists(ranges)
      makeExpression(specWithRanges(ranges), text().startsWith('[[') ? text().slice(2) : fpcorejs.mathjsToFPCore(text()), text().startsWith('[[') ? text().slice(2) : text())()  // HACK to support FPCore submission
    }
    // <div id="modifyRange">
    //   Ranges:
    //     <div>
    //     ${rangeText}
    //     </div>
    // </div>
    const [projectedError, { refetch }] = createResource(text, async (text) => {
      if (text === '') {
        return 0
      }
      try {
        return (await herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(text), getByKey(api, 'Samples', 'specId', spec.id), HOST, txt => console.log(txt))).meanBitsError
      } catch (err:any) {
        return 'loading...'  // HACK
      }
    })
    
    //setTimeout(() => refetch(), 7000)  // HACK
    const [projectedNaiveError] = createResource(text, async (text) => {
      if (text === '') {
        return 0
      }
      try {
        const result = (await herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(text), await herbiejs.getSample(fpcorejs.makeFPCore({ specMathJS: text, ranges: spec.ranges, specFPCore: undefined }), HOST, txt => console.log(txt)), HOST, txt => console.log(txt))).meanBitsError
        if (firstTime) {
          refetch() // HACK
          firstTime = false
        }
        return result
      } catch (err:any) {
        return err.toString()
      }
    })
    const openNewTab = () => vscodeApi.postMessage(JSON.stringify({command: 'openNewTab', mathjs: text(), ranges: spec.ranges}))
    return html`<div class="addExpressionRow">
    <div>
    ${textArea}
    </div>
    
    <button onClick=${addExpression}>Add approximation</button>
    <button onClick=${openNewTab}>Open in New Tab</button>
    <div style="height: 50px; overflow: auto;">
    ${() => {
      try {
        if (text() === '') { return '' }
        return html`<span innerHTML=${(window as any).katex.renderToString(math2Tex(text()), {
          throwOnError: false
        })}></span>`
      } catch (err :any) {
        return err.toString()
      }
    }}
      </div>
      <div>
      <div>
        Projected error (vs. Spec): 
        <${Switch}>
           <${Match} when=${() => projectedError.loading}> loading...<//>
           <${Match} when=${() => true}> ${() => projectedError()?.toString()}<//>
          <//>
        </div>
        <div>
        Projected error (vs. self-as-spec): 
          <${Switch}>
           <${Match} when=${() => projectedNaiveError.loading}> loading...<//>
           <${Match} when=${() => true}> ${() => projectedNaiveError()?.toString()}<//>
          <//>
        </div>
      </div>
    </div>`
  }
  // <div>[todo] sort by <select><${For} each=${() => new Set(expressions().map(o => Object.keys(o)).flat())}><option>${k => k}</option><//></select></div>
  // ${getSpecRow(spec)}
  const sortBy = fn => (a, b) => fn(a) - fn(b)
  
  // super super ugly HACK: use a timer to keep the list sorted. Works.
  setInterval(() => {
    api.setTables(produce((tables: any) => {
      tables.find(t => t.name === 'Expressions').items = tables.find(t => t.name === 'Expressions').items?.sort(sortBy(e => analyses().find(a => a.expressionId === e.id)?.meanBitsError)) 
    }))
    //console.log('effect finished!!2')
  }, 1000)
  
  const getSpecBlock = spec => {
    // createEffect(() => {  // HACK keep the expressions sorted by error (also this doesn't work...)
    //   console.log('effect ran!!')
    //   const analyses1 = analyses()
    //   //@ts-ignore
    //   api.setTables(produce((tables: any) => {
    //     tables.find(t => t.name === 'Expressions').items = []//tables.find(t => t.name === 'Expressions').items?.sort(sortBy(e => analyses1.find(a => a.expressionId === e.id)?.meanBitsError)) 
    //   }))
    //   console.log('effect finished!!')
    // })
    return html`<div id="specBlock">
    <div id="expressionTable">
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>&nbsp;</th>
            <th class="expression">Expression</th>
            <th class="meanBitsError">Error</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
    
      <${For} each=${() => expressions().filter(e => !getByKey(api, 'HiddenExpressions', 'expressionId', e.id)) /* expressionsForSpec(spec) */}>${(e) => getExpressionRow(e, spec)}<//>
      ${() => noExpressionsForSpec(spec) ? noExpressionsRow(spec) : ''}
        </tbody>
      </table>
      </div>
      ${() => addExpressionRow(spec)}
      
    </div>`
  }
  const lastSelectedExpression = () => api.tables.find(t => t.name === "Expressions")?.items?.find(api.getLastSelected((o, table) => table === "Expressions") || (() => undefined))

  const lastMultiselectedExpressions = () => {
    const specId = specs().find(api.getLastSelected((o, table) => table === "Specs") || (() => false))?.id
    //console.log('test', specId)
    return expressions()
      .filter(api.getLastMultiselected((objs, table) => table === 'Expressions') || (() => false))
      /*.filter(e => e.specId === specId)*/
  }
  const specView = () => html`<div>
    <h3>Details for ranges ${JSON.stringify(specs().find(api.getLastSelected((_, t) => t === "Specs"))?.ranges)}</h3>
    <div>[todo]</div>
    </div>`
  const comparisonView = () => expressionComparisonView(lastMultiselectedExpressions(), api)
  const exprView = () => lastSelectedExpression() && expressionView(lastSelectedExpression(), api)
  
  const makeRequest = (spec) => api.action('create', 'demo', 'Requests', { specId: spec.id })
  const herbieSuggestion = (spec) => expressions().find(o => o.specId === spec.id && o.provenance === 'herbie')
  const request = (spec) => api.tables.find(t => t.name === "Requests").items.find(r => r.specId === spec.id)
  //<${For} each=${specs}> ${spec => getSpecBlock(spec)}<//>
  // ${Inputs.table([{a: 42}, {a: 64}])}  TODO figure out tables
  const specsAndExpressions = (startingSpec) => html`
    <div id="specsAndExpressions">
      <div id="specInfo">
        <h4 style="margin-top: 0px; margin-bottom:0px;">Expression to approximate (the Spec)</h4>
        <div id="specTitle" style="margin-top:0px;">${renderTex(math11.parse(startingSpec.mathjs).toTex())}</div>
        
        <${Switch}>
          <${Match} when=${() => !request(startingSpec) && !herbieSuggestion(startingSpec)}>
            <button onClick=${() => (genHerbieAlts(startingSpec, api), makeRequest(startingSpec))}>Get alternative expressions with Herbie</button>
          <//>
          <${Match} when=${() => request(startingSpec) && !herbieSuggestion(startingSpec)}>
            <button disabled>waiting for alternatives... (may take up to 20 seconds)</button>
          <//>
          <${Match} when=${() => herbieSuggestion(startingSpec)}>
            <button disabled>alternatives shown</button>
          <//>
          <${Match} when=${() => /* TODO check associated request for error */ false}>
            error during computation :(
          <//>
          <${Match} when=${() => true}>
            ${() => {
      return 'other case'
              } 
            }
          <//>
        <//>
      </div>
      ${() => getSpecBlock(startingSpec)}
    </div>`

  const lastSelection = () => /*api.getLastSelected((objs, tname) => ['Expressions', 'Specs'].includes(tname))*/api.tables.find(t => t.name === 'Selections').items.findLast(s => s.table === 'Expressions' || s.table === 'Specs')  // may be selection or multiselection

  //@ts-ignore
  window.lastSelection = lastSelection
  const shownExpressions = () => expressions().filter(e => !getByKey(api, 'HiddenExpressions', 'expressionId', e.id))
//   <${Match} when=${() => {
//     console.log('when', lastSelection())
// return lastSelection() && !(lastSelection().multiselection)
// }
// }>
//     ${() => {
//       console.log('lastSelection', lastSelection(), lastSelection().multiselection)
//        return exprView()
//       }
//       }
//   <//>
// <${Switch}>
// <${Match} when=${() => lastSelection()?.table === 'Specs'}>
//   ${specView}
// <//>
// <${Match} when=${() => {
//   console.log('here', lastSelection(), lastSelection()?.multiselection)
//   return lastSelection()?.multiselection !== undefined
// }}>
//   ${() =>
// { console.log('compare', lastSelection());  return comparisonView() }
//   }
// <//>
// <${Match} when=${() => true}> other case <//>
// <//>
  // createEffect(() => {
  //   console.log('TEST 1')
  //   exprView()
  // })
  // createEffect(() => {
  //   console.log('TEST 2')
  //   specs()
  // })
  // createEffect(() => {
  //   console.log('TEST 3')
  //   specs()[0] && specsAndExpressions(specs()[0])
  // })
  // createEffect(() => {
  //   console.log('TEST 4')
  //   lastMultiselectedExpressions().length > 0 && expressionComparisonView(lastMultiselectedExpressions(), api)
  // })
  // createEffect(() => {
  //   console.log('TEST 5')
  //   lastMultiselectedExpressions()
  // })
  const analyzeUI = html`<div id="analyzeUI">
    <${Show} when=${() => specs()[0]}
      fallback=${newSpecInput()}>
      ${() => specsAndExpressions(specs()[0])}
      <div id="focus">
      <${Show} when=${() => lastMultiselectedExpressions().length > 0}> ${() => expressionComparisonView(lastMultiselectedExpressions(), api)} <//>
        
      </div>
      <${Show} when=${() => lastSelectedExpression()}>
        ${() => exprView()}
      <//>
    <//>
    
  </div>
  `
  
  const contents = () => analyzeUI
  const div = html`<div id="demo">
    <style>
      #analyzeUI div:not(.math *) {
        /*border: 1px solid black;*/
        margin: 2px;
        padding: 2px;
      }
      #analyzeUI span:not(.math *) {
        /*border: 1px solid black;*/
        margin: 2px;
      }
      #analyzeUI .expressionRow, #analyzeUI .noExpressionsRow, #analyzeUI .addExpressionRow {
        margin-left: 15px;
      }
      #analyzeUI .expressionRow .naive-expression {
        font-weight: bold;
      }
      #analyzeUI #specBlock table {
        width:100%;
        table-layout:auto;
      }
      #analyzeUI #expressionTable {
        max-height: 300px;
        overflow: auto;
        border: 1px solid #6161615c;
        border-radius: 5px;
        padding: 0px;
        width: fit-content;
        /*margin: auto;*/
      }
      #analyzeUI #expressionTable tbody {
        display:block;
        overflow:auto;
        max-height:200px;
        width:100%;
      }
      #expressionTable thead {
        box-shadow: 2px 1px 7px 2px lightblue;
      }
      #expressionTable th.expression {
        text-align: left;
        padding-left: 20px;
      }
      #expressionTable .expression {
        width:300px;
      }
      #expressionTable td.expression {
        cursor: pointer;
      }
      #expressionTable .meanBitsError {
        width:40px;
      }
      #expressionTable th, #expressionTable td {
        width:auto;
      }
      
      #analyzeUI #expressionTable thead tr {
        display: block;
      }

      .varname-selected {
        background-color: lightgrey;
      }
      .hideExpression {
        border: 1px solid gray;
        transition-duration: .2s;
      }
      .hideExpression:hover {
        background-color: #ff5555;
        color: white;
        border: 1px solid gray;
      }

      #analyzeUI .errorPlot svg {
        padding-top: 30px;
      }
      
      #analyzeUI #expressionTable button {
        width:-webkit-fill-available;
      }
      #analyzeUI #specBlock table tr:nth-child(even) {
        background-color: #D6EEEE;
      }
      #analyzeUI {
        display: grid;
        grid-template-areas: 
          'table focus';
        justify-content: start;
      }
      #analyzeUI #focus {
        grid-area: focus;
        width: 800px;
      }
      #analyzeUI textarea {
        width: 400px;
        height: 100px;
      }
      #analyzeUI .addExpressionRow textarea {
        width: 400px;
        height: 40px;
      }
    </style>
    ${contents}
  </div>
  `
  // HACK immediately multiselect the initial expression
  //setTimeout(() => api.multiselect('Expressions', expressions().map(e => e.id)), 1000)//, api.tables, api.setTables))
  // HACK jump to a submitted spec + expression
  //setTimeout(() => submit(), 0)  
  // createEffect(() => {
  //   if (specs().length === 1 && expressions().length === 0) {
  //     makeExpressionFromSpec(specs()[0])()
  //   }
  // })

  return {div}
}

const currentMultiselection = (api) => {
  //console.log(api.getLastMultiselected((objs, table) => table === 'Expressions'), expressions(), expressions().filter(api.getLastMultiselected((objs, table) => table === 'Expressions') || (() => false)))
  const expressions = () => api.tables.find(t => t.name === 'Expressions').items
  return expressions().filter(api.getLastMultiselected((objs, table) => table === 'Expressions') || (() => false))
}

async function genHerbieAlts(spec, api) {
  //let ids = [expressionId++] as any
  // HACK assuming only one suggestion for now
  console.log('spec fpcore is', spec.fpcore)
  const sample = await herbiejs.getSample(spec.fpcore, HOST, logval => console.log(logval))
  //const sample2 = sample.points.map((p, i) => [p, sample.exacts[i]])
  //console.log(sample2)
  const fetch = await herbiejs.suggestExpressions(spec.fpcore, sample, HOST, logval => console.log(logval), html)
  const alts = fetch.alternatives
  const histories = fetch.histories

  var derivExpressionId = expressionId
  const expressions = await Promise.all(alts.map(async alt => {
    return { fpcore: alt/*fpcorejs.FPCoreGetBody(alt)*/, specId: spec.id, id: expressionId++, provenance: 'herbie', spec, mathjs: await herbiejs.fPCoreToMathJS(alt, HOST)}
  }))
  const derivations = await Promise.all(histories.map(async html => {
    return { html: html, specId: spec.id, id: derivExpressionId++, provenance: 'herbie', spec, }
  }))

  const ids = expressions.map(e => e.id)
  // const expressions = ([await herbiejs.suggestExpressions(spec.fpcore, HOST, logval => console.log(logval), html)]).map(fpcorebody => {
  //   return { fpcore: fpcorebody, specId: spec.id, id: ids[0], provenance: 'herbie', spec}
  // })
  expressions.map(e => api.action('create', 'demo', 'Expressions', e))//, api.tables, api.setTables))
  derivations.map(e => api.action('create', 'demo', 'Histories', e))
  //ids = expressions.map(e => e.id)
  const curr = currentMultiselection(api).map(o => o.id)

  /* NOTE selects the alts after getting them */
  api.multiselect('Expressions', [...curr, ...ids.slice(0, 3)])
  //return 'done'  // uh, remove this
}

let COMPUTE_N = 0

function analysisComputable(expression, api) {
  /*TODO replace computable with Request table entry */
  const analyses = () => api.tables.find(t => t.name === 'Analyses').items
  const analysis = () => analyses().find(a => a.expressionId === expression.id)
  const specs = () => api.tables.find(t => t.name === 'Specs').items
  const samples = () => api.tables.find(t => t.name === 'Samples').items
  
  async function getHerbieAnalysis(expression, api) {
    const spec = specs().find(s => s.id === expression.specId)
    const data = {
      expression,
      spec,
      // NOTE sending the sample means a lot of data will be passed here...
      sample: samples().find(s => s.id === expression.sampleId)  // HACK for now, we are assuming expressions are per-sample
    }
    return (await fetch('localhost:8000/analyze', {
        method: 'POST',
        headers: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }))?.json()
  }


  function mockData(expression, api) {
    return new Promise(resolve => setTimeout(() => resolve({bitsError: 10, performance: 100 * Math.random(), expressionId: expression.id}), 2000))
  }

  return computable(analysis, async () => api.action('create', 'demo', 'Analyses', await analyzeExpression(expression, api)))//, api.tables, api.setTables, api))
}
const renderTex = h => {
  
  const el = document.createElement('span') as HTMLElement
  el.innerHTML = (window as any).katex.renderToString(h, {
    throwOnError: false
  });//'\\(' + html + '\\)';
  //(window as any).renderMathInElement(el)
  return el
}
const math2Tex = mathjs => {
  return math11.parse(mathjs).toTex()
}

function expressionView(expression, api) {
  //<div>...expression plot here...</div>
  const history = getByKey(api, 'Histories', 'id', expression.id)
  return html`<div>
    <h3>Expression Details: </h3>
    <div>${renderTex(math2Tex(expression.mathjs)) || expression.fpcore}</div>
    ${() => {
      if (expression.provenance !== 'herbie') {
        return 'You submitted this expression.'
      } else {
        const el = document.createElement('div') as HTMLElement
        el.innerHTML = history.html;
        (window as any).renderMathInElement(el.querySelector("#history"))
        return html`<div>
        <h3>
          Herbie's derivation
        </h3>
          ${el.querySelector('#history')}
        </div>`
      }
    }
    }
  </div>`
  // const c = analysisComputable(expression, api)
  // const history = getByKey(api, 'Histories', 'specId', expression.specId)
  // console.log(history)
  // return html`<div>
  //   <h3>Details for Expression ${expression.mathjs || expression.fpcore}</h3>
  //   <${Switch}>
  //     <${Match} when=${() => c.status === 'unrequested'}>
  //       <button onClick=${c.compute}>Run Analysis</button>
  //     <//>
  //     <${Match} when=${() => c.status === 'requested'}>
  //       waiting...
  //     <//>
  //     <${Match} when=${() => c.status === 'computed'}>
  //       ${() => {
  //   if (expression.provenance !== 'herbie') { return 'User-submitted expression.'}
  //     const el = document.createElement('div') as HTMLElement
  //   el.innerHTML = (c as any).value?.graphHtml;
  //   (window as any).renderMathInElement(el.querySelector('#history'))
  //     return html`
  //         <div>
  //           ${el.querySelector('#history')}
  //           ${el.querySelector('#reproduce')}
  //         </div>
  //   `
  //   }
  //   }
  //     <//>
  //     <${Match} when=${() => c.status === 'error'}>
  //       ${() => console.log(c)}
  //       error during computation :(
  //     <//>
  //   <//>
  // </div>`
}

//@ts-ignore
//async (url, module = {exports:{}}) =>
//  (Function('module', 'exports', await (await fetch(url)).text()).call(module, module, module.exports), module).exports
//import Plot from 'http://127.0.0.1:8080/https://cdn.skypack.dev/@observablehq/plot'
//console.log('got plot')
//let Plot = await import('https://cdn.skypack.dev/pin/@observablehq/plot@v0.6.0-abLuPgcZQ9pCNl0q9t7s/mode=imports,min/optimized/@observablehq/plot.js')
// eslint-disable-next-line @typescript-eslint/naming-convention
function expressionComparisonView(expressions, api) {
  //<div>...expression plot here...</div>
  // <button onClick=${c.compute}>Run Analysis</button>
  // <${Switch}>
  //     <${Match} when=${() => c.status === 'unrequested'}>
  //       waiting...
  //     <//>
  //     <${Match} when=${() => c.status === 'requested'}>
  //       waiting...
  //     <//>
  //     <${Match} when=${() => c.status === 'computed'}>
  //       ${() => JSON.stringify(c.value)}
  //     <//>
  //     <${Match} when=${() => c.status === 'error'}>
  //       error during computation :(
  //     <//>
  //   <//>
   
  const lastSpec = () => api.tables.find(t => t.name === "Specs").items.find(api.getLastSelected((o, table) => table === "Specs") || (() => false))
  const pointsJsons = () => expressions.map(expression => ({
    expression,
    pointsJson: api.tables
      .find(t => t.name === 'Analyses')
      .items
      .find(a => a.expressionId === expression.id)
      ?.pointsJson
  }))
  const currentVarname = () => getLastSelected(api, "Variables")?.varname || getTable(api, 'Variables')?.[0].varname
  const currentVarIdx = () => fpcorejs.getVarnamesFPCore(lastSpec().fpcore).indexOf(currentVarname())
  const points = () => {
    //return [-1, 1]
    const specId = lastSpec().id
    const idx = currentVarIdx()
    //await waitUntil(() => getByKey(api, 'Samples', 'specId', specId));
    return getByKey(api, 'Samples', 'specId', lastSpec().id).points.map(p => p[0][idx])
  }
  const minPt = () => displayNumber(fastMin(points()))
  const maxPt = () => displayNumber(fastMax(points()))

  return html`<div>
    <h3>Bits of error over the range ${currentVarname} = [${minPt} , ${maxPt}]:</h3>
    ${() => {
    const validPointsJsons = pointsJsons()
      .filter(({ expression, pointsJson }) => pointsJson)
      //console.log('pointsJson', pointsJson())
    if (validPointsJsons.length === 0) { return 'analysis incomplete' }
      //console.log(plotError('x', ['target'], ['x'], pointsJson(), Plot))
    let { points, ticks_by_varidx: ticksByVarIdx, splitpoints_by_varidx: splitpointsByVarIdx, bits, vars } = validPointsJsons[0].pointsJson
    /* TODO: open issues:
    * splitpoints can vary across expressions, how do we distinguish what they apply to?
    * how do we get the proper ticks for the full range? Probably Herbie has to pass us this information.
    * HACK: for now, just take the first one.
     */
    const idx = Math.max(vars.findIndex(v => v === currentVarname()), 0)
    console.log(idx)
    const ticks = ticksByVarIdx[idx]
    const splitpoints = splitpointsByVarIdx[idx]
    const pointsSlice = points.map(p => p[idx])
    const data = validPointsJsons.map(({ expression, pointsJson: { points, error } }) => {
      //let { error } = pointsJson
      const keyFn = fn => (a, b) => fn(a) - fn(b)
      return zip(points.map(p => p[idx]), error['target']).map(([x, y]) => ({ x, y })).sort(keyFn(p => p.x))
    })
    const styles = validPointsJsons.map(({ expression }) => {
      // LATER color should be RGB string, will append alpha
      const color = getColorCode(expression.id)//'#00ff00'
      //const color = api.tables.find(t => t.name === 'herbie.ExpressionColors').items.find(c => c.expressionId === expression.id).color
      /** alpha value for dots on the graph */
      const dotAlpha = '35'
      return { line: { stroke: color }, dot: { stroke: color + dotAlpha } }
    })
    //console.log(data)
    return html`<div class="errorPlot">${plotError({ data, styles, ticks, splitpoints, bits }, Plot)}</div>`
    }
    }
    <div>
    <span> Select input axis: </span>
    ${() => getTable(api, 'Variables').filter(v => v.specId === expressions?.[0]?.specId).map(v => {
      console.log('VARNAME', v, currentVarname())
      /* ts-styled-plugin: disable-next-line */
      // style=${ () => { return currentVarname() === v.varname ? ({ "background-color": 'lightgray' }) : ({}) }} onClick=${() => select(api, 'Variables', v.id)}
      return html`<span class="varname ${currentVarname() === v.varname ? 'varname-selected' : ''}" onclick=${() => select(api, 'Variables', v.id)}>${v.varname}</span>`
    })}
    </div>
  </div>`
}

function getTable(api, tname) {
  return api.tables.find(t => t.name === tname).items
}
function select(api, tname, id) {
  return api.select(tname, id)//, api.tables, api.setTables)
}
function getByKey(api, tname, key, value) {
  return getTable(api, tname).find(v => v[key]=== value)
}

function getLastSelected(api, tname) {
  return getTable(api, tname).find(api.getLastSelected((o, table) => table === tname) || (() => false))
}

// NOTE we have to pipe requests to Herbie through a CORS-anywhere proxy
let HOST = 'http://127.0.0.1:8080/http://herbie.uwplse.org/odyssey'//'http://127.0.0.1:8080/http://127.0.0.1:8000'//'http://127.0.0.1:8080/http://127.0.0.1:8000'//'http://127.0.0.1:8080/http://herbie.uwplse.org'//'http://127.0.0.1:8080/https://fa2c-76-135-106-225.ngrok.io'

// HACK to let us dynamically set the host
//@ts-ignore
window.setHOST = host => HOST = host

async function waitUntil(testFn, interval=1000) {
  if (testFn()) {return;}
  let resolve :any = undefined
  const p = new Promise(r => resolve = r)
  const id = setInterval(() => { if (testFn()) { clearInterval(id); resolve() }}, interval )
  await p
}

// NOTE passing api into rules was breaking reactivity before (even though it wasn't used, probably due to logging use?)
async function analyzeExpression(expression, api) {
  // const specs = () => api.tables.find(t => t.name === 'Specs').items
  // const spec = specs().find(s => s.id === expression.specId)
  // // TODO log properly
  // TODO there's a reactive loop being created by properly looking up the spec above, need to figure out later
  // and remove expression.spec
  //
  // HACK we will only have one sample per page for now, would have to add an analysis for each existing sample (and have a separate generator to add an analysis for each existing expression for a new sample)
  const getSample = () => getByKey(api, 'Samples', 'specId', expression.specId)
  await waitUntil(getSample, 1000)  // HACK kind of, we need to wait for a sample to be added (this is a general problem with things generated from multiple items)
  const sample = getSample()
  return { ...await herbiejs.analyzeExpression(expression.fpcore, sample, HOST, logval => console.log(logval)), expressionId: expression.id }
  //return await (new Promise(resolve => setTimeout(() => resolve({bitsError: Math.round(64 * Math.random()), performance: Math.round(100 * Math.random()), expressionId: expression.id}), 2000)))
}

// TODO def need to attach ids automatically on object generation in platform
function addNaiveExpression(spec) {
  // HACK expression.spec is duplicated, see analyzeExpression
  return { specId: spec.id, fpcore: spec.fpcore /*fpcorejs.FPCoreGetBody(spec.fpcore)*/ || fpcorejs.mathjsToFPCore(spec.mathjs), id: expressionId++, spec, mathjs: spec.mathjs, provenance: 'naive'}
}

// TESTING 
// {
//   "fpcore": "(FPCore modulus_sqr (re im) :name \"math.abs on complex (squared)\" (+ (* re re) (* im im)))",
//   "ranges": [
//     [
//       "re",
//       [
//         1,
//         1000000000
//       ]
//     ],
// [
//       "im",
//       [
//         1,
//         1000000000
//       ]
//     ]
//   ]
// }

function addVariables(spec) {
  return spec.fpcore ? fpcorejs.getVarnamesFPCore(spec.fpcore).map(v => ({specId: spec.id, varname: v, id: variableId++})) : fpcorejs.getVarnamesMathJS(spec.mathjs).map(v => ({specId: spec.id, varname: v, id: variableId++}))
}

async function addSample(spec) {
  return { ...(await herbiejs.getSample(spec.fpcore, HOST, txt => console.log(txt))), id: sampleId++, specId: spec.id }
}

function selectNaiveExpression(spec, api) {
  const curr = currentMultiselection(api).map(o => o.id)
  return {multiselection: true, selection: (o, table) => table === "Expressions" && o.fpcore === spec.fpcore || curr.includes(o.id)}
}

export default {mainPage, expressionView, expressionComparisonView, analyzeExpression, addNaiveExpression, selectNaiveExpression, addVariables, addSample}
