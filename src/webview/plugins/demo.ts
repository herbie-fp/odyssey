import { create } from "domain";
import { applyTransformDependencies } from "mathjs";
import { html, For, Show, Switch, Match, unwrap, untrack } from "../../dependencies/dependencies.js";
import { createStore, createEffect, createRenderEffect, createMemo, produce } from "../../dependencies/dependencies.js";
import { math, Plot } from "../../dependencies/dependencies.js"

let specId = 1
let sampleId = 1
let expressionId = 1

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
        case "ParenthesisNode":
          return node_processor(node.content, path, parent)
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
        case "ParenthesisNode":
          return node_processor(node.content)
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
      return ast.value || `(${ast.map(t => astToString(t)).join(' ')})`
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
    }
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
        label: "Bits of error", domain: [0, bits],
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
    getSample: async (fpcore, host, log) => {
      const { graphHtml, pointsJson } = await graphHtmlAndPointsJson(fpcore, host, log)
      return pointsJson.points
    },
    suggestExpressions: async (fpcore, host, log, html) => {
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
    analyzeExpression: async (spec, targetFPCoreBody, host, log) => {
        const { graphHtml, pointsJson } = await graphHtmlAndPointsJson(fpcorejs.makeFPCore({specMathJS: spec.mathjs, specFPCore: spec.fpcore, ranges: spec.ranges, targetFPCoreBody }).split('\n').join(''), host, log)
        const meanBitsError = new Number((pointsJson.error.target.reduce((sum, v) => sum + v, 0)/pointsJson.error.target.length).toFixed(2))
        return {graphHtml, pointsJson, meanBitsError}
    }
  })
})()

function mainPage(api) {
  //console.clear()
  console.log('Setting up main demo page...')
  const defaultSpec = { mathjs: "sqrt(x+1) - sqrt(x)", ranges: [["x", [1, 1e9]]] }
  //const defaultSpec = { mathjs: "sqrt(x+1) - sqrt(y)", ranges: [["x", [1, 1e9]], ["y", [-1e9, 1]]] }
  const textarea = (value=JSON.stringify(defaultSpec)) => html`<textarea value="${value}"></textarea>` as HTMLInputElement

  const addSpec = async ({ mathjs, ranges, fpcore }) => { 
    const id = specId++
    const spec = { mathjs, fpcore: fpcorejs.makeFPCore({ specMathJS: mathjs, specFPCore: fpcore, ranges }), ranges, id}
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
    const getSampleHandler = () => setSamples(produce(samples => samples.push({specId: spec.id, id: sampleId++})))
    const addSampleButton = html`<button onClick=${getSampleHandler}>Add Sample</button>`
    const sampleSelect = html`<select>
      <${For} each=${relevantSamples}>${sample => html`<option>${sample.id}</option>`}<//>
    </select>`

    const request = () => api.tables.find(t => t.name === "Requests").items.find(r => r.specId === spec.id)
    const makeRequest = () => api.action('create', 'demo', 'Requests', {specId: spec.id})//, api.tables, api.setTables)
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
            <button onClick=${() => (genHerbieAlts(spec, api), makeRequest())}>Get alternatives with Herbie</button>
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
    api.select('Expressions', expression.id)//, api.tables, api.setTables)
  }

  const analyses = () => api.tables.find(t => t.name === 'Analyses').items

  const getExpressionRow = (expression) => {
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
    return html`<div class="expressionRow" >
      <span style=${() => ({ "background-color": getColorCode(expression.id) })}>&nbsp;</span>
      <span>
        <input type="checkbox" onClick=${toggleMultiselected} checked=${boxChecked}>
      </span>
      <span onClick=${selectExpression(expression)}>${expression.mathjs ? expression.mathjs : expression.fpcore}</span>
      
      <span onClick=${() => api.select('Specs', expression.specId)}>
        <${Switch}>
          <${Match} when=${() => false && /* c.status === 'unrequested' && */ !analysis() /* && !request() */}>
            waiting for analysis (unreq)...
          <//>
          <${Match} when=${() => /*c.status === 'requested' */ !analysis() /*&& request() */}>
            waiting for analysis...
          <//>
          <${Match} when=${() => analysis() /*c.status === 'computed'*/}>
            ${() => JSON.stringify(Object.fromEntries(Object.entries(analysis()).filter(([k, v]) => ['meanBitsError', 'performance', 'expressionId'].includes(k)).map(([k, v]) => k === 'expressionId' ? ['rangeId', expressions().find(e => e.id === v)?.specId] : [k, v])))}
          <//>
          <${Match} when=${() => false /*(c.status === 'error' */}>
            error during computation :(
          <//>
        <//>
      </span>
    </div>`
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
    api.action('create', 'demo', 'Expressions', {specId: spec.id, fpcore, id, spec, mathjs})//, api.tables, api.setTables)
    //api.action('select', 'demo', 'Expressions', (o, table) => o.id === id, api.tables, api.setTables, api)
    const curr = currentMultiselection(api).map(o => o.id)
    api.multiselect('Expressions', [...curr, id])//, api.tables, api.setTables)
  }
  
  const makeExpressionFromSpec = spec => makeExpression(spec, fpcorejs.FPCoreGetBody(spec.fpcore) || fpcorejs.FPCoreBody(spec.mathjs), spec.mathjs)

  const noExpressionsRow = spec => {
    return html`<div class="noExpressionsRow">
      <span><button onClick=${makeExpressionFromSpec(spec)}>Create the default expression for this spec</button></span>
    </div>`
  }
  const addExpressionRow = spec => {
    const text = textarea(spec.mathjs)
    const rangeText = textarea(JSON.stringify(spec.ranges))
    const specWithRanges = ranges => getTable(api, 'Specs').find(s => JSON.stringify(ranges) === JSON.stringify(s.ranges))
    async function ensureSpecWithThoseRangesExists(ranges) {
      if (specWithRanges(ranges)) { return; }
      await addSpec({ ...spec, ranges })
    }
    async function addExpression() {
      const ranges = JSON.parse(rangeText.value)
      await ensureSpecWithThoseRangesExists(ranges)
      makeExpression(specWithRanges(ranges), text.value.startsWith('[[') ? text.value.slice(2) : fpcorejs.FPCoreBody(text.value), text.value.startsWith('[[') ? text.value.slice(2) : text.value)()  // HACK to support FPCore submission
    }
    return html`<div class="addExpressionRow">
    <div>
    ${text}
    </div>
    <div id="modifyRange">
      Ranges:
        <div>
        ${rangeText}
        </div>
    </div>
    <button onClick=${addExpression}>Add expression</button>
    </div>`
  }
  // <div>[todo] sort by <select><${For} each=${() => new Set(expressions().map(o => Object.keys(o)).flat())}><option>${k => k}</option><//></select></div>
  // ${getSpecRow(spec)}
  const getSpecBlock = spec => {
    return html`<div id="specBlock">
      
      <${For} each=${ expressions /* expressionsForSpec(spec) */}>${getExpressionRow}<//>
      ${() => noExpressionsForSpec(spec) ? noExpressionsRow(spec) : ''}
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
  const exprView = () => expressionView(lastSelectedExpression(), api)
  
  const makeRequest = (spec) => api.action('create', 'demo', 'Requests', { specId: spec.id })
  const herbieSuggestion = (spec) => expressions().find(o => o.specId === spec.id && o.provenance === 'herbie')
  const request = (spec) => api.tables.find(t => t.name === "Requests").items.find(r => r.specId === spec.id)
  //<${For} each=${specs}> ${spec => getSpecBlock(spec)}<//>
  const specsAndExpressions = (startingSpec) => html`
    <div id="specsAndExpressions">
      <div id="specInfo">
        <span id="specTitle">The Spec: ${startingSpec.mathjs}</span>
        <${Switch}>
          <${Match} when=${() => !request(startingSpec) && !herbieSuggestion(startingSpec)}>
            <button onClick=${() => (genHerbieAlts(startingSpec, api), makeRequest(startingSpec))}>Get alternatives with Herbie</button>
          <//>
          <${Match} when=${() => request(startingSpec) && !herbieSuggestion(startingSpec)}>
            waiting for alternatives...
          <//>
          <${Match} when=${() => herbieSuggestion(startingSpec)}>
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
      </div>
      ${() => getSpecBlock(startingSpec)}
    </div>`

  const lastSelection = () => /*api.getLastSelected((objs, tname) => ['Expressions', 'Specs'].includes(tname))*/api.tables.find(t => t.name === 'Selections').items.findLast(s => s.table === 'Expressions' || s.table === 'Specs')  // may be selection or multiselection

  //@ts-ignore
  window.lastSelection = lastSelection
  const analyzeUI = html`<div id="analyzeUI">
    <${Show} when=${() => specs()[0]}
      fallback=${newSpecInput()}>
      ${() => specsAndExpressions(specs()[0])}
      <div id="focus">
        <${Switch}>
          <${Match} when=${() => lastSelection()?.table === 'Specs'}>
            ${specView}
          <//>
          <${Match} when=${() => {
            console.log('here', lastSelection(), lastSelection()?.multiselection)
            return lastSelection()?.multiselection !== undefined
          }}>
            ${() =>
  { console.log('compare', lastSelection());  return comparisonView() }
            }
          <//>
          <${Match} when=${() => {
            console.log('when', lastSelection())
      return lastSelection() && !(lastSelection().multiselection)
    }
    }>
            ${() => {
              console.log('lastSelection', lastSelection(), lastSelection().multiselection)
               return exprView()
              }
              }
          <//>
        <//>
      </div>
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
      #analyzeUI {
        display: grid;
        grid-template-areas: 
          'table focus';
        justify-content: start;
      }
      #analyzeUI #focus {
        grid-area: focus
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
  let ids = [expressionId++] as any
  // HACK assuming only one suggestion for now
  console.log('spec fpcore is', spec.fpcore)
  const expressions = ([await herbiejs.suggestExpressions(spec.fpcore, HOST, logval => console.log(logval), html)]).map(fpcorebody => {
    return { fpcore: fpcorebody, specId: spec.id, id: ids[0], provenance: 'herbie', spec}
  })
  expressions.map(e => api.action('create', 'demo', 'Expressions', e))//, api.tables, api.setTables))
  //ids = expressions.map(e => e.id)
  const curr = currentMultiselection(api).map(o => o.id)

  /* NOTE selects the alts after getting them */
  api.multiselect('Expressions', [...curr, ...ids])
  return 'done'
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

function expressionView(expression, api) {
  //<div>...expression plot here...</div>
  // TODO remove this computable
  const c = analysisComputable(expression, api)
  return html`<div>
    <h3>Details for Expression ${expression.mathjs || expression.fpcore}</h3>
    <${Switch}>
      <${Match} when=${() => c.status === 'unrequested'}>
        <button onClick=${c.compute}>Run Analysis</button>
      <//>
      <${Match} when=${() => c.status === 'requested'}>
        waiting...
      <//>
      <${Match} when=${() => c.status === 'computed'}>
        ${() => {
    if (expression.provenance !== 'herbie') { return 'User-submitted expression.'}
      const el = document.createElement('div') as HTMLElement
    el.innerHTML = (c as any).value?.graphHtml;
    (window as any).renderMathInElement(el.querySelector('#history'))
      return html`
          <div>
            ${el.querySelector('#history')}
            ${el.querySelector('#reproduce')}
          </div>
    `
    }
    }
      <//>
      <${Match} when=${() => c.status === 'error'}>
        ${() => console.log(c)}
        error during computation :(
      <//>
    <//>
  </div>`
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
  return html`<div>
    <h3>Comparison of ${()=> expressions.length} expressions for Range with id ${() => lastSpec()?.id}</h3>
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
    return html`<div>${plotError({ data, styles, ticks, splitpoints, bits }, Plot)}</div>`
    }
    }
    ${() => getTable(api, 'Variables').filter(v => v.specId === expressions?.[0]?.specId).map(v => {
      console.log(currentVarname())
      /* ts-styled-plugin: disable-next-line */
      // style=${ () => { return currentVarname() === v.varname ? ({ "background-color": 'lightgray' }) : ({}) }} onClick=${() => select(api, 'Variables', v.id)}
      return html`<span class="varname" >${v.varname}</span>`
    })}
  </div>`
}

function getTable(api, tname) {
  return api.tables.find(t => t.name === tname).items
}
function select(api, tname, id) {
  return api.select(tname, id)//, api.tables, api.setTables)
}

function getLastSelected(api, tname) {
  return getTable(api, tname).find(api.getLastSelected((o, table) => table === tname) || (() => false))
}

// NOTE we have to pipe requests to Herbie through a CORS-anywhere proxy
let HOST = 'http://127.0.0.1:8080/http://127.0.0.1:8000'//http://127.0.0.1:8080/http://herbie.uwplse.org'

// HACK to let us dynamically set the host
//@ts-ignore
window.setHOST = host => HOST = host

// NOTE passing api into rules was breaking reactivity before (even though it wasn't used, probably due to logging use?)

async function analyzeExpression(expression, api) {
  // const specs = () => api.tables.find(t => t.name === 'Specs').items
  // const spec = specs().find(s => s.id === expression.specId)
  // // TODO log properly
  // TODO there's a reactive loop being created by properly looking up the spec above, need to figure out later
  // and remove expression.spec
  return { ...await herbiejs.analyzeExpression(expression.spec, expression.fpcore, HOST, logval => console.log(logval)), expressionId: expression.id }
  //return await (new Promise(resolve => setTimeout(() => resolve({bitsError: Math.round(64 * Math.random()), performance: Math.round(100 * Math.random()), expressionId: expression.id}), 2000)))
}

// TODO def need to attach ids automatically on object generation in platform
function addNaiveExpression(spec) {
  // HACK expression.spec is duplicated, see analyzeExpression
  return {specId: spec.id, fpcore: fpcorejs.FPCoreGetBody(spec.fpcore) || fpcorejs.FPCoreBody(spec.mathjs), id: expressionId++, spec, mathjs: spec.mathjs, provenance: 'naive'}
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
  return spec.fpcore ? fpcorejs.getVarnamesFPCore(spec.fpcore) : fpcorejs.getVarnamesMathJS(spec.mathjs).map(v => ({specId: spec.id, varname: v}))
}

function selectNaiveExpression(spec, api) {
  const curr = currentMultiselection(api).map(o => o.id)
  return {multiselection: true, selection: (o, table) => table === "Expressions" && o.fpcore === spec.fpcore || curr.includes(o.id)}
}

export default {mainPage, expressionView, expressionComparisonView, analyzeExpression, addNaiveExpression, selectNaiveExpression, addVariables}