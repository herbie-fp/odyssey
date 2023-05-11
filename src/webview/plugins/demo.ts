import { create } from "domain";
import { applyTransformDependencies } from "mathjs";
import { e, expression } from "mathjs11";
import { appendDivSvgG } from "mermaid/dist/mermaidAPI.js";
import { start } from "repl";
import { SetStoreFunction } from "solid-js/store";
import { html, For, Show, Switch, Match, unwrap, untrack } from "../../dependencies/dependencies.js";
import { createStore, createEffect, createRenderEffect, createMemo, produce, createSignal, createResource } from "../../dependencies/dependencies.js";
import { math, Plot, Inputs, math11 } from "../../dependencies/dependencies.js"
import { mermaid } from "../../dependencies/dependencies.js"


const vscodeApi = await (window as any).acquireVsCodeApi()

const mermaidAPI = mermaid.mermaidAPI
const mermaidConfig = {
  startOnLoad:true,
  flowchart:{
          useMaxWidth:false,
          htmlLabels:true
  }
}

mermaidAPI.initialize(mermaidConfig)



let notes : any[] = [];
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
            // TODO: removed because of bugs; is this even necessary?
            // return flatten_comparisons({ ...node, op });
            return "(" + op + " " + extract(node.args).join(" ") + ")";
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
    if ((low === undefined || low === '') || (high === undefined || high === '')) return empty_if_missing ? [] : ['input still missing']
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
      const vars = specFPCore === undefined ? get_varnames_mathjs(specMathJS) : get_varnames_fpcore(specFPCore)
      const target = targetFPCoreBody ? `:herbie-target ${targetFPCoreBody}\n  ` : ''
      return `(FPCore (${vars.join(' ')})\n  :name "${name}"\n  :pre ${get_precondition_from_input_ranges(ranges)}\n  ${target}${specFPCore ? FPCoreGetBody(specFPCore) : FPCoreBody(specMathJS)})`
    },
    mathjsToFPCore: (mathjs, specFPCore=undefined) => {
      const vars = specFPCore === undefined ? get_varnames_mathjs(mathjs) : get_varnames_fpcore(specFPCore)
      return `(FPCore (${vars.join(' ')}) ${FPCoreBody(mathjs)})`
    }
  }
})()

//@ts-ignore
window.fpcorejs = fpcorejs;

//@ts-ignore
window.Plot = Plot

interface Point {
  x: number,
  y: number,
  orig: number[]  // the original point associated with this input
}
interface PlotArgs {
  /** A list of variable names for the original points. */
  varnames: string[];

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

const zip = (arr1, arr2, arr3=[]) => arr1.reduce((acc, _, i) => (acc.push([arr1[i], arr2[i], arr3?.[i]]), acc), [])
/**
   * Generate a plot with the given data and associated styles.
   */
// eslint-disable-next-line @typescript-eslint/naming-convention
function plotError({ varnames, varidx, ticks, splitpoints, data, bits, styles, width=800, height=400}: PlotArgs, Plot) : SVGElement {
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
      acc.push({y: (top - bottom) / length, x: points[i].x, orig: points[i].orig})
      return acc
    }, [] as Point[])
  }

  /** Takes an array of {x, y} data points.
   * Creates a line graph based on a sliding window of width binSize.
   * Further compresses points to width.
   * */
  function lineAndDotGraphs({data, style: { line, dot, selected, id }, binSize = 128, width = 800 }) {
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
            strokeWidth: selected ? 4 : 2, ...line,
        }),
      Plot.dot(compress(data, width), {
        x: "x", y: "y", r: 3,
          // HACK pass stuff out in the title attribute, we will update titles afterward
        title: d => JSON.stringify({ o: d.orig, id }),//.map((v, i) => `${varnames[i]}: ${displayNumber(ordinalsjs.ordinalToFloat(v))}`).join('\n'),
          // @ts-ignore
            //"data-id": d => id,//() => window.api.select('Expressions', id),
            ...dot
        })
    ]
  }
  console.log('splitpoints', splitpoints)
  const out = Plot.plot({
    width: width.toString(),
    height: height.toString(),                
    x: {
        tickFormat: d => tickStrings[tickOrdinals.indexOf(d)],
        ticks: tickOrdinals, label: `value of ${varnames[varidx]}`,  // LATER axis label
        labelAnchor: 'left', labelOffset: 40, /* tickRotate: 70, */
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
    analyzeLocalError: async (fpcore, sample, host) => {
      return (await (await fetch(`${host}/api/localerror`, { method: 'POST', body: JSON.stringify({ formula: fpcore, sample: sample.points }) })).json())
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

/** v is a normal JS FP number. */
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
    floatToApproximateOrdinal: float_to_approximate_ordinal,
    ordinalToFloat: ordinal_to_real
  }
})()

function mainPage(api) {
  //console.clear()
  console.log('Setting up main demo page...')
  const defaultSpec = { mathjs: "sqrt(x+1) - sqrt(x)", ranges: [["x", [1, 1e9]]] }
  //const defaultSpec = { mathjs: "sqrt(x+1) - sqrt(y)", ranges: [["x", [1, 1e9]], ["y", [-1e9, 1]]] }
  const textarea = (value: any = JSON.stringify(defaultSpec), setValue = (v) => { }, classNames=[] as String[], rows: number = 4) => {
    const out = html`<textarea class="${classNames.join(' ')}" value="${value}" oninput=${e => setValue(e.target.value)} style="height:auto;" rows="${rows}"></textarea>` as HTMLInputElement
    out.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    });
    return out
  }

  const addSpec = async ({ mathjs, ranges, fpcore }) => {
    const id = specId++
    const spec = { mathjs, fpcore: fpcorejs.makeFPCore({ specMathJS: mathjs, specFPCore: fpcore, ranges }), ranges, id }
    await api.action('create', 'demo', 'Specs', spec)
    api.select('Specs', id)
    api.multiselect('Expressions', expressions().filter(e => e.specId === id).map(e => e.id))
  }
  //@ts-ignore
  window.api = api
  window.addEventListener('message', event => {
    const message = event.data 
    switch (message.command) {
      case 'openNewTab':
        const { mathjs, ranges, run } = message
        //@ts-ignore
        if (run) { return addSpec({ mathjs, fpcore: undefined, ranges: Object.entries(ranges).map(([k, { low, high }]) => [k, [low, high]]) }) }
        
        //@ts-ignore
        document.querySelector('textarea.newSpecInput').value = mathjs
        //@ts-ignore
        Object.entries(ranges).map(([varname, { low, high }]) => {
          //@ts-ignore
          window.setVarValues(varname, { low, high })
          //@ts-ignore
          document.querySelector(`.var-${varname}.var-low`).value = low
          //@ts-ignore
          document.querySelector(`.var-${varname}.var-high`).value = high
        })
        // document.querySelector('textarea.')//JSON.stringify({ mathjs, ranges })
        // //@ts-ignore
        // document.querySelector('button').click()
        break;
    }
  })
  function debounce( callback, delay ) {
    let timeout;
    return function(...args) {
        clearTimeout( timeout );
        timeout = setTimeout(() => callback(...args), delay );
    }
  }
  const newSpecInput = () => {
    const [text, setText] = createSignal('sqrt(x + 1) - sqrt(x)')
    function debounce( callback, delay ) {
      let timeout;
      return function(...args) {
          clearTimeout( timeout );
          timeout = setTimeout(() => callback(...args), delay );
      }
    }

    const textArea = textarea(text, debounce(v => setText(v), 500), ['newSpecInput'])

    const handleErrors = (tryBody, catchBody=e => e) => () => {
      try { return tryBody() } catch (e) { return catchBody(e) }
    }
    const [varValues, setVarValues] = createStore({ x: { low: 0, high: 1e308 } } as any)
    //@ts-ignore
    window.setVarValues = setVarValues // ugly HACK for letting new page force these values to change

    const varnames = handleErrors(() => fpcorejs.getVarnamesMathJS(text().split('\n').join('')).map(v => (setVarValues(v, (old: Object) => ({ low: -1.79e308, high: 1.79e308, ...old })), v)), e => (console.error(e), []))
    
    const rangeErrors = (all = false) => {
      const errors = varnames().map(v => fpcorejs.rangeErrors([varValues[v].low, varValues[v].high], !all && varValues[v].low === '' && varValues[v].high === '')).flat()
      return zip(errors, varnames()).map(([e, v]) => `${v}: ${e}`)
    }

    return html`
      <div>
        <h3>
          The expression you would like to approximate:
        </h3>
        ${textArea}
        <div id="texPreview">
          ${() => {
            try {
              if (text() === '') { return '' }
              return html`<span class="preview-stuff" innerHTML=${(window as any).katex.renderToString(math2Tex(text().split('\n').join('')), {
                throwOnError: false
              })}></span>`
            } catch (err :any) {
              return err.toString()
            }
          }}
        </div>
        <h3>
          The input ranges you would like to focus on improving:
        </h3>
        <table>
        <${For} each=${varnames} fallback=${html`<span>The expression has no parseable inputs.</span>`}>${v => html`
          <tr class="spec-var-row">
            <td class="varname">${v}:</td> 
            <td><input type="text" className=${`var-low var-${v}`} value="${varValues[v].low}" onInput=${debounce((e) => setVarValues(v, 'low', e.target.value), 400)}></td>
            <td>to</td>
            <td><input type="text" className=${`var-high var-${v}`} value="${varValues[v].high}" onInput=${debounce((e) => setVarValues(v, 'high', e.target.value), 400)}></td>
          </tr>
        `}<//>
        </table>
        <div>
        <${For} each=${rangeErrors}>${e => html`<div>${e}</div>`}<//>
        <${Show} when=${() => varnames().length > 0 && rangeErrors(true).length === 0}><button onClick=${() => addSpec({ mathjs: text().split('\n').join(''), fpcore: undefined, ranges: varnames().map(v => [v, [varValues[v].low, varValues[v].high]]) })}>Submit</button><//>
        </div>
      </div>`
  }

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

  const expressions = () => api.tables.find(t => t.name === 'Expressions')?.items
  
  const selectExpression = expression => async () => {
    setTimeout(() => api.select('Expressions', expression.id))
    //const sample = getLastSelected(api, 'Samples')
    const sample = getByKey(api, 'Samples', 'specId', expression.specId)
    const result = await herbiejs.analyzeLocalError(expression.fpcore, { points: sample.points }, getHost())
        const entry = { specId, id: expression.id, tree: result.tree, sample: sample }
        api.action('create', 'demo', 'LocalErrors', entry)
    if (lastSelectedExpression()?.id === expression.id) { return }
    //, api.tables, api.setTables)
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
      setTimeout(() => api.multiselect('Expressions', newSelectionIds))//, api.tables, api.setTables)  // HACK just don't wait for result (should be promise)
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
      // HACK allow hide by mathjs
      await api.action('create', 'demo', 'HiddenExpressions', { specId: spec.id, expressionId: expression.id, mathjs: expression.mathjs })//, api.tables, api.setTables) // TODO implement

      const curr = currentMultiselection(api).map(o => o.id)
      api.multiselect('Expressions', curr.filter(id => !getByKey(api, 'HiddenExpressions', 'expressionId', id)))//, api.tables, api.setTables)
    }
    return html`<tr class="expressionRow ${() => lastSelectedExpression()?.id === expression.id ? 'selectedExpression' : ''}" >
      <td style=${() => ({ "background-color": getColorCode(expression.id) })}>&nbsp;</td>
      <td>
        <input type="checkbox" onClick=${toggleMultiselected} checked=${boxChecked}>
      </td>
      <td class="expression ${(expression.mathjs === spec.mathjs || expression.fpcore === spec.fpcore) ? 'naive-expression' : ''}" onClick=${() => setTimeout(selectExpression(expression))}><pre>${expression.mathjs.replace(/\s+/g, ' ').replaceAll('?', '?\n  ').replaceAll(':', '\n:')}</pre></td>
      <td class="expressionTex" onClick=${() => setTimeout(selectExpression(expression))}><span innerHTML=${(window as any).katex.renderToString(math2Tex(expression.mathjs.split('\n').join('')), {
        throwOnError: false
      })}></span> </td>
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
      <td><button onclick=${() => navigator.clipboard.writeText(expression.mathjs.replace(/\s+/g, ' ').replaceAll('?', '?\n  ').replaceAll(':', '\n:'))}>📋</button></td>
      <td >
        <button onClick=${() => hideExpression(expression)} class="hideExpression">x</button>
      </td>
    </tr>`
  }

  const getExprSpec = expr => specs().find(spec => spec.id === expr.specId)

  /** expressions where spec.mathjs === expr's spec.mathjs (or ditto fpcore) */
  const expressionsForSpec = spec => {
    const expressionsF = expressions().filter(e => e.specId === spec.id)
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
    const specId = specs().find(api.getLastSelected((o, table) => table === "Specs") || (() => false))?.id // HACK just use current spec
    const id = expressionId++
    // ugly HACK duplicate the spec on the expression, see analyzeExpression
    api.action('create', 'demo', 'Expressions', { specId, fpcore, id, spec, mathjs })//, api.tables, api.setTables)
    notes.push({ specId: spec.id, id: expressionId, notes: ""})
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
      makeExpression(specWithRanges(ranges), text().startsWith('[[') ? text().slice(2) : fpcorejs.mathjsToFPCore(text().split('\n').join(''), spec.fpcore), text().startsWith('[[') ? text().slice(2) : text().split('\n').join(''))()  // HACK to support FPCore submission
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
        return (await herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(text.split('\n').join(''), spec.fpcore), getByKey(api, 'Samples', 'specId', spec.id), getHost(), txt => console.log(txt))).meanBitsError
      } catch (err:any) {
        return 'loading...'  // HACK
      }
    })
    
    //setTimeout(() => refetch(), 7000)  // HACK
    // const [projectedNaiveError] = createResource(text, async (text) => {
    //   if (text === '') {
    //     return 0
    //   }

    //   const logger =  (txt) => console.log(txt)
    //   const fpcore = fpcorejs.makeFPCore({ specMathJS: text.split('\n').join(''), ranges: spec.ranges, specFPCore: spec.fpcore })
    //   try {
    //     const result = (await herbiejs.analyzeExpression(fpcore, await herbiejs.getSample(fpcore, HOST, logger), HOST, logger)).meanBitsError
    //     if (firstTime) {
    //       refetch() // HACK
    //       firstTime = false
    //     }
    //     return result
    //   } catch (err:any) {
    //     return err.toString()
    //   }
    // })
    return html`<div class="addExpressionRow">
    <div>
      Projected average error: 
      <${Switch}>
        <${Match} when=${() => projectedError.loading}> loading...<//>
        <${Match} when=${() => true}> ${() => projectedError()?.toString()}<//>
      <//>
    </div>
    <div>
    ${textArea}
    </div>
    
    <button onClick=${addExpression}>Add expression</button>

    <div id="texPreview" >
    ${() => {
      try {
        if (text() === '') { return '' }
        return html`<span class="preview-stuff" innerHTML=${(window as any).katex.renderToString(math2Tex(text().split('\n').join('')), {
          throwOnError: false
        })}></span>`
      } catch (err :any) {
        return err.toString()
      }
    }}
      </div>
    </div>`
    //<button class="newSpec" onClick=${() => vscodeApi.postMessage(JSON.stringify({ command: 'openNewTab', mathjs: spec.mathjs, ranges: unwrap(varValues), run: true }))}>Update ranges (opens new tab)</button>
  }
  // <div>[todo] sort by <select><${For} each=${() => new Set(expressions().map(o => Object.keys(o)).flat())}><option>${k => k}</option><//></select></div>
  // ${getSpecRow(spec)}
  const sortBy = fn => (a, b) => fn(a) - fn(b)
  
  // super super ugly HACK: use a timer to keep the list sorted. Works.
  setInterval(() => {
    const newOrder = api.tables.find(t => t.name === 'Expressions').items?.sort(sortBy(e => analyses().find(a => a.expressionId === e.id)?.meanBitsError))
    const oldOrder = api.tables.find(t => t.name === 'Expressions').items
    if (newOrder.map(e => e.mathjs).join('') == oldOrder.join('')) {  // don't resort unnecessarily
      return;
    }
    api.setTables(produce((tables: any) => {
      tables.find(t => t.name === 'Expressions').items = tables.find(t => t.name === 'Expressions').items?.sort(sortBy(e => analyses().find(a => a.expressionId === e.id)?.meanBitsError)) 
    }))
    //console.log('effect finished!!2')
  }, 1000)
  
  const getSpecBlock = spec => {
    
    return html`<div id="specBlock">
    <h4>Rewritings</h4>
    <div id="expressionTable">
      <table>
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th><button onClick=${() => api.multiselect('Expressions', [])}>Clear</button></th>
            <th class="expression">Expression</th>
            <th class="expressionTex">LaTeX</th>
            <th class="meanBitsError">Average Error</th>
            <th>&nbsp;</th>
          </tr>
        </thead>
        <tbody>
    
      <${For} each=${() => /*expressions()*/expressionsForSpec(spec).filter(e => !getByKey(api, 'HiddenExpressions', 'expressionId', e.id) /*&& !getByKey(api, 'HiddenExpressions', 'mathjs', e.mathjs)*/) /* expressionsForSpec(spec) */}>${(e) => getExpressionRow(e, spec)}<//>
      ${() => noExpressionsForSpec(spec) ? noExpressionsRow(spec) : ''}
        </tbody>
      </table>
      </div>
      ${getAlternativesButton(spec)}
      

    </div>`
    // ${() => addExpressionRow(spec)}
  }
  const lastSelectedExpression = () => api.tables.find(t => t.name === "Expressions")?.items?.find(api.getLastSelected((o, table) => table === "Expressions") || (() => undefined))

  const lastMultiselectedExpressions = () => {
    const specId = specs().find(api.getLastSelected((o, table) => table === "Specs") || (() => false))?.id
    const hidden = getTable(api, 'HiddenExpressions').map(e => e.expressionId)
    console.log("HEREEEE running", expressions()
    .filter(api.getLastMultiselected((objs, table) => table === 'Expressions') || (() => false)).filter(e => !(hidden.includes(e.id))))
    //console.log('test', specId)
    return expressions()
      .filter(api.getLastMultiselected((objs, table) => table === 'Expressions') || (() => false)).filter(e => !(hidden.includes(e.id)))
      /*.filter(e => e.specId === specId)*/
  }
  const specView = () => html`<div>
    <h3>Details for ranges ${JSON.stringify(specs().find(api.getLastSelected((_, t) => t === "Specs"))?.ranges)}</h3>
    <div>[todo]</div>
    </div>`
  //const comparisonView = () => expressionComparisonView(lastMultiselectedExpressions(), api)
  const exprView = () => lastSelectedExpression() && expressionView(lastSelectedExpression(), api)
  
  const makeRequest = (spec) => api.action('create', 'demo', 'ExpressionRequests', { specId: spec.id })
  const herbieSuggestion = (spec) => expressions().find(o => o.specId === spec.id && o.provenance === 'herbie' && o.parent === spec.id)
  const request = (spec) => api.tables.find(t => t.name === "ExpressionRequests").items.find(r => r.specId === spec.id)
  const getAlternativesButton = (spec) => html`
    <${Switch}>
      <${Match} when=${() => !request(spec) && !herbieSuggestion(spec)}>
        <button onClick=${() => setTimeout(() => (genHerbieAlts(spec, api), makeRequest(spec)))}>Get expressions with Herbie</button>
      <//>
      <${Match} when=${() => request(spec) && !herbieSuggestion(spec)}>
        <button disabled>waiting for alternatives... (may take up to 20 seconds)</button>
      <//>
      <${Match} when=${() => herbieSuggestion(spec)}>
        <button disabled>alternatives for this range shown</button>
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
    <//>`
  const rangeConfig = (spec) => {
    //const openNewTab = () => vscodeApi.postMessage(JSON.stringify({ command: 'openNewTab', mathjs: text(), ranges: unwrap(varValues) }))
    const varnames = () => fpcorejs.getVarnamesMathJS(spec.mathjs)
    const rangeErrors = (all = false) => {
      const errors = varnames().map(v => fpcorejs.rangeErrors([varValues[v].low, varValues[v].high], !all && varValues[v].low === '' && varValues[v].high === '')).flat()
      return zip(errors, varnames()).map(([e, v]) => `${v}: ${e}`)
    }
    return html`
      <div class="range-config">
        <table>
          <${For} each=${varnames} fallback=${html`<span>The expression has no parseable inputs.</span>`}>${v => html`
            <tr class="spec-var-row">
              <td class="varname">${v}:</td> 
              <td><input type="text" className=${`var-low var-${v}`} value="${varValues[v].low}" onInput=${debounce((e) => setVarValues(v, 'low', e.target.value), 400)}></td>
              <td>to</td>
              <td><input type="text" className=${`var-high var-${v}`} value="${varValues[v].high}" onInput=${debounce((e) => setVarValues(v, 'high', e.target.value), 400)}></td>
            </tr>
          `}<//>
        </table>
        <${For} each=${rangeErrors}>${e => html`<div class="range-error">${e}</div>`}<//>
        <${Show} when=${() => rangeErrors(true).length === 0}>
          <button class="update-ranges" onClick=${() => addSpec({ mathjs: spec.mathjs, fpcore: undefined, ranges: (Object.entries(varValues) as any).map(([k, { low, high }]) => [k, [low, high]]) })}>Update ranges</button>
        <//>
        
      </div>
    `
  }
  const specsAndExpressions = (spec, varValues, setVarValues) => html`
    <div id="specsAndExpressions">
      
      ${() => getSpecBlock(spec)}
              
    </div>`

  const lastSelection = () => /*api.getLastSelected((objs, tname) => ['Expressions', 'Specs'].includes(tname))*/api.tables.find(t => t.name === 'Selections').items.findLast(s => s.table === 'Expressions' || s.table === 'Specs')  // may be selection or multiselection

  //@ts-ignore
  window.lastSelection = lastSelection
  const shownExpressions = () => expressions().filter(e => !getByKey(api, 'HiddenExpressions', 'expressionId', e.id))
  
  const lastSpec = () => api.tables.find(t => t.name === "Specs").items.find(api.getLastSelected((o, table) => table === "Specs") || (() => false));
  
  let varValues, setVarValues;
  //let [varValues, setVarValues] = createStore(lastSpec()?.ranges?.reduce((acc, [v, [low, high]]) => (acc[v] = { low, high }, acc), {}) as any || {})

  const [focusLeftComponent, setFocusLeftComponent] = createSignal('error_plot')
  const [focusRightComponent, setFocusRightComponent] = createSignal('local_error')
  const [focusSelectComponent, setFocusSelectComponent] = createSignal('expression_details')

  const analyzeUI = html`<div id="analyzeUI">
    <div id="analyzeUIHeader">
      Host (Herbie): <input type="text" id="host" value="${getHost}" onInput=${(e) => setHost(e.target.value)} />
    </div>
    <${Show} when=${() => { if (specs()[0]) { 
      if (!varValues) {
        console.log('HERE', specs()[0].ranges);
        [varValues, setVarValues] = createStore(specs()[0].ranges.reduce((acc, [v, [low, high]]) => (acc[v] = { low, high }, acc), {}) as any)
      }
      select(api, 'Specs', specs()[specs().length-1].id); return specs()[0] } else { return false } }}
      fallback=${newSpecInput()}>
      ${() => html`<div id="specInfo">
        <h4 id="specLabel">Expression to approximate (the Spec) <button class="new-tab-ranges" onClick=${() => vscodeApi.postMessage(JSON.stringify({ command: 'openNewTab', mathjs: specs()[0]?.mathjs, ranges: unwrap(varValues), run: false }))}>Edit in new tab</button></h4>
        <div id="specTitle">${renderTex(math11.parse(specs()[0]?.mathjs).toTex({handler: branchConditionalHandler}))}</div>
      </div>`}
      ${() => specsAndExpressions(lastSpec(), varValues, setVarValues)}
      <div id="focusLeft">
      <select onInput=${event => setFocusLeftComponent(event.target.value)} value=${focusLeftComponent}>
        <option value="error_plot">Error Plot</option>
        <option value="local_error">Local Error Analysis</option>
        <option value="other">Other Component</option>
      </select>
      <${Switch}>
        <${Match} when=${() => focusLeftComponent() === 'error_plot'}>
          <${Show} when=${() => lastMultiselectedExpressions().length > 0 && lastSpec() && getByKey(api, 'Samples', 'specId', lastSpec().id)}> ${() => errorPlot(lastMultiselectedExpressions(), api)}
          <br>
          ${() => rangeConfig(lastSpec())} 
          <//>
        <//>
        <${Match} when=${() => focusLeftComponent() === 'local_error'}>
          <${Show} when=${() => lastSelectedExpression()}>
            ${() => exprView()}
          <//>
        <//>
        <${Match} when=${() => focusLeftComponent() === 'other'}>other<//>
      <//>
      </div>
      <div id="focusRight">
      <select onInput=${event => setFocusRightComponent(event.target.value)} value=${focusRightComponent}>
        <option value="error_plot">Error Plot</option>
        <option value="local_error">Local Error Analysis</option>
        <option value="derivation">Derivation</option>
        <option value="other">Other Component</option>
      </select>
      <${Switch}>
        <${Match} when=${() => focusRightComponent() === 'error_plot'}>
          <${Show} when=${() => lastMultiselectedExpressions().length > 0 && lastSpec() && getByKey(api, 'Samples', 'specId', lastSpec().id)}> ${() => errorPlot(lastMultiselectedExpressions(), api)}
          <br>
          ${() => rangeConfig(lastSpec())} 
          <//>
        <//>
        <${Match} when=${() => focusRightComponent() === 'local_error'}>
          <${Show} when=${() => lastSelectedExpression()}>
            ${() => exprView()}
          <//>
        <//>
        <${Match} when=${() => focusRightComponent() === 'derivation'}>
          <${Show} when=${() => lastSelectedExpression()}>
            ${() => expressionDerivationView(lastSelectedExpression())}
          <//>
        <//>
        <${Match} when=${() => focusRightComponent() === 'other'}>other<//>
      <//>
      </div>
      <div id="focusSelect">
      <select onInput=${event => setFocusSelectComponent(event.target.value)} value=${focusSelectComponent}>
        <option value="error_plot">Error Plot</option>
        <option value="local_error">Local Error Analysis</option>
        <option value="expression_details">Expression Details</option>
        <option value="other">Other Component</option>
      </select>
      <${Switch}>
        <${Match} when=${() => focusSelectComponent() === 'error_plot'}>
          <${Show} when=${() => lastMultiselectedExpressions().length > 0 && lastSpec() && getByKey(api, 'Samples', 'specId', lastSpec().id)}> ${() => errorPlot(lastMultiselectedExpressions(), api)}
          <br>
          ${() => rangeConfig(lastSpec())} 
          <//>
        <//>
        <${Match} when=${() => focusSelectComponent() === 'local_error'}>
          <${Show} when=${() => lastSelectedExpression()}>
            ${() => exprView()}
          <//>
        <//>
        <${Match} when=${() => focusSelectComponent() === 'expression_details'}>
          <${Show} when=${() => lastSelectedExpression()}>
            ${() => expressionDetailsView(lastSelectedExpression())}
          <//>
        <//>
        <${Match} when=${() => focusSelectComponent() === 'other'}>other<//>
      <//>
      </div>
      <div id="editor">
        ${() => addExpressionComponent(specs()[0], api)}
      </div>
    <//>
    
  </div>
  `
  
  const contents = () => analyzeUI

  const div = html`<div id="demo">
  <style>
      #specTitle, #expressionTable, .addExpressionRow>div {
        margin-top: 7px;
        margin-bottom: 7px;
        margin-right: 5px;
      }
      #analyzeUI .expressionRow .naive-expression {
        font-weight: bold;
      }
      #analyzeUI #specBlock table {
        width:100%;
        table-layout:auto;
      }
      #analyzeUI #expressionTable {
        width:100%;
        table-layout:auto;
        max-height: 500px;
        overflow: auto;
        border: 1px solid #6161615c;
        border-radius: 5px;
        padding: 0px;
        /*margin: auto;*/
      }
      #analyzeUI #expressionTable tbody {
        display:block;
        overflow:auto;
        width:100%;
      }
      #analyzeUI svg circle:hover {
        fill-opacity: 1;
        r: 4;
        cursor: pointer;
      }
      
      #expressionTable th.expression {
      }
      #expressionTable .expression {
        /*width:154px;*/
        width: 55%;
      }
      #expressionTable .expression pre {
        margin: 0px;
      }
      #expressionTable td.expression {
        cursor: pointer;
        /*max-width: 200px;*/
        text-overflow: ellipsis;
        overflow: hidden;
        white-space: nowrap;
      }
      #expressionTable .expressionTex {
        width: 25%;
      }
      #expressionTable .meanBitsError {
        width: 15%;
        text-align: center;
      }
      #expressionTable th, #expressionTable td {
        width:auto;
      }
      /* Allow line breaks in display equations (see https://katex.org/docs/issues.html) */
      .katex-display > .katex { white-space: normal }
      .katex-display .base { margin: 0.25em 0 }
      .katex-display { margin: 0.5em 0; }
      .katex-version {display: none;}
      .katex-version::after {content:"0.10.2 or earlier";}
      
      #analyzeUI #expressionTable thead tr {
        display: block;
      }
      #specTitle {
        max-width: 400px;
        overflow: scroll;
      }
      #texPreview {
        max-width: 400px;
        overflow: scroll;
        /*height: fit-content;*/
      }
      .varname {
        margin-right: 5px;
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
      .expressionView {
        max-width:400px;
        margin-bottom: 20px;
      }

      #analyzeUI .errorPlot svg {
        padding-top: 30px;
      }
      #analyzeUI .expressionRow.selectedExpression {
        background-color: burlywood !important;
      }
      .expressionRow {
        max-height: 7em;
        display: inline-table;
        width: 100%;
      }
      
      #analyzeUI #expressionTable button {
        width:-webkit-fill-available;
      }
      #expressionTable {
        display: grid;
      }
      /* HACK remove dark colorscheme for now
      @media (prefers-color-scheme: dark) {
        #analyzeUI #expressionTable tr:nth-child(even) {
          background-color: #333333;
        }
        #expressionTable thead {
          box-shadow: 2px 1px 7px 2px black;
        }
        #analyzeUI #focusLeft svg {
          background-color: black;
        }
      }
      @media (prefers-color-scheme: light) {
       */
        #analyzeUI #expressionTable tr:nth-child(even) {
          background-color: #D6EEEE;
        }
        #expressionTable thead {
          box-shadow: 2px 1px 7px 2px lightblue;
        }
        /*
      }
      */
      
      #analyzeUI {
        display: grid;
        grid-template-areas:
          'header header'
          'specinfo specinfo'
          'table table'
          'editor details'
          'focusLeft focusRight';
        grid-auto-columns: 50%;
        justify-items: center;
        min-width: 800px;
      }
      #analyzeUIHeader {
        grid-area: header;
      }
      #specInfo {
        grid-area: specinfo;
      }
      #analyzeUI #focusLeft {
        grid-area: focusLeft;
        /*width: 600px; */
        width: calc(100% - 21px);
        border: 1px solid lightgray;
        padding: 7px;
        border-radius: 5px;
      }
      #analyzeUI #focusSelect {
        grid-area: details;
      }
      #analyzeUI #editor {
        grid-area: editor;
      }
      #analyzeUI #focusRight {
        grid-area: focusRight;
        border:f 1px solid lightgray;
        width: calc(100% - 21px);
        padding: 7px;
        border-radius: 5px;
      }
      #specsAndExpressions {
        width: 100%;
        grid-area: table;
      }
      #analyzeUI textarea {
        width: 400px;
        height: 100px;
        font-family: system-ui;
      }
      #analyzeUI .addExpressionRow textarea {
        width: 400px;
        height: 70px;
      }
      .preview-stuff:not(:first-child) { /* HACK to solve double-LaTeX render */
        display: none;
      }

      #history .error {
        margin-left: 4px;
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
  const sample = await herbiejs.getSample(spec.fpcore, getHost(), logval => console.log(logval))
  //const sample2 = sample.points.map((p, i) => [p, sample.exacts[i]])
  //console.log(sample2)
  const fetch = await herbiejs.suggestExpressions(spec.fpcore, sample, getHost(), logval => console.log(logval), html)
  const alts = fetch.alternatives.slice(0, 5)  // Just return top 5 options
  const histories = fetch.histories.slice(0, 5)

  var derivExpressionId = expressionId
  const expressions = await Promise.all(zip(histories, alts).map(async ([html, alt]) => {
    return { fpcore: alt/*fpcorejs.FPCoreGetBody(alt)*/, specId: spec.id, id: expressionId++, provenance: 'herbie', parent: spec.id, spec, mathjs: await herbiejs.fPCoreToMathJS(alt, getHost()), history: html}
  }))
  const derivations = await Promise.all(histories.map(async html => {
    return { html: html, specId: spec.id, id: derivExpressionId++, provenance: 'herbie', parent: spec.id, spec, }
  }))

  const ids = expressions.map(e => e.id)
  expressions.map(e => { return notes.push( {specId: spec.id, id: e.id, notes: "Generated by Herbie" } ) })
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

const renderTex = h => {
  
  const el = document.createElement('span') as HTMLElement
  el.innerHTML = (window as any).katex.renderToString(h, {
    throwOnError: false
  });//'\\(' + html + '\\)';
  //(window as any).renderMathInElement(el)
  return el
}

function cleanupTex(node, options) {
  // TODO handle other special functions
  if (node.fn?.name === 'hypot' && !(node.args.length === 2)) { throw Error('hypot takes two arguments') }
  if (node.fn?.name === 'log1p' && !(node.args.length === 1)) { throw Error('log1p takes one argument') }
  if (node.fn?.name === 'log' && !(node.args.length === 1)) { throw Error('log takes one argument') }
  return node.fn?.name === 'hypot' ? `\\mathbf{hypot}(${node.args[0].toTex(options)}, ${node.args[1].toTex(options)})` 
    : node.fn?.name === 'log1p' ? `\\mathbf{log1p}(${node.args[0].toTex(options)})`
    : node.fn?.name === 'log' ? `\\mathbf{log}(${node.args[0].toTex(options)})`
    : node._toTex(options)
}

function branchConditionalHandler(node, options) {
  options = {handler: cleanupTex}
  if (node.type !== 'ConditionalNode') {
    return node.toTex(options)
  }
  const deparen = node => node.type === 'ParenthesisNode' ? node.content : node
  const conditions = [node]
  let curr = node
  while (deparen(curr.falseExpr).type === 'ConditionalNode') {
    conditions.push(deparen(curr.falseExpr))
    curr = deparen(curr.falseExpr)
  }
  conditions.push(conditions[conditions.length - 1])  // duplicate the final condition
  
  const deparenCondition = c => ({...c, condition: deparen(c.condition), trueExpr: deparen(c.trueExpr), falseExpr: deparen(c.falseExpr)})
  return conditions.map(deparenCondition).map((c, i) => 
    i === 0 ? `\\mathbf{if} \\> ${c.condition.toTex(options)}: \\\\ \\quad ${c.trueExpr.toTex(options)}`
    : i !== conditions.length - 1 ? `\\mathbf{elif} \\> ${c.condition.toTex(options)}: \\\\ \\quad ${c.trueExpr.toTex(options)}`
    : `\\mathbf{else :} \\\\ \\quad ${c.falseExpr.toTex(options)}`).join('\\\\')
}
const math2Tex = mathjs => {
  return math11.parse(mathjs.replaceAll('!', 'not').replaceAll('||', 'or').replaceAll('&&', 'and')).toTex({handler: branchConditionalHandler})
}

function localErrorTreeAsMermaidGraph(tree, bits) {
  let edges = [] as string[]
  let colors = {}
  let counter = 0

  const isLeaf = (n) => n['children'].length == 0
  const formatName = (id, name, err) => id + '[<span class=nodeLocalError title=' + err + '>' + name + '</span>]'

  function loop(n) {
    const name = n['e']
    const children = n['children']
    const avg_error = n['avg-error']

    // node name
    const id = 'N' + counter++
    const nodeName = formatName(id, name, avg_error)

    // descend through AST
    for (const c in children) {
      const cName = loop(children[c])
      edges.push(cName + ' --> ' + nodeName)
    }

    // color munging
    const nonRed = 255.0 - Math.trunc((avg_error / bits) * 200.0)
    const nonRedHex = ('0' + nonRed.toString(16)).slice(-2)
    colors[id] = 'ff' + nonRedHex + nonRedHex

    return nodeName
  }

  loop(tree)

  // Edge case: 1 node => no edges
  if (isLeaf(tree)) {
    const name = tree['e']
    const avg_error = tree['avg-error']
    edges.push(formatName('N0', name, avg_error))
  }

  // List colors
  for (const id in colors) {
    // HACK: title gets put under style to be extracted later
    edges.push('style ' + id + ' fill:#' + colors[id])
  }

  return edges.join('\n')
}

function expressionView(expression, api) {
  // get history and local error
  const history = getByKey(api, 'Histories', 'id', expression.id)
  const sample = () => getByKey(api, 'Samples', 'specId', expression.specId)
  const note = (function () {for (const subnote of notes) {
    if (subnote.id === expression.id && subnote.specId === expression.specId) return subnote;
  }})()
  const request = () => true //api.tables.find(t => t.name === "LocalErrorRequests").items.find(r => r.id === expression.id)
  const makeRequest = () => api.action('create', 'demo', 'LocalErrorRequests', { id: expression.id })
  const localError = () => getByKey(api, 'LocalErrors', 'id', expression.id)
  const textarea = (value: any = "", setValue = (v) => { }, classNames=[] as String[], rows: number = 4) => {
    const out = html`<textarea class="${classNames.join(' ')}" value="${value}" oninput=${e => setValue(e.target.value)} style="height:auto;" rows="${rows}"></textarea>` as HTMLInputElement
    out.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    });
    return out
  }
  const notesArea = ''//textarea(note.notes, (v) => { note.notes = v }, undefined, 2)

  async function genLocalError() {
    const result = await herbiejs.analyzeLocalError(expression.fpcore, sample(), getHost())
    const entry = { specId: expression.specId, id: expression.id, tree: result.tree, sample: [] }
    api.action('create', 'demo', 'LocalErrors', entry)
  }

  return html`<div class="expressionView">
    <div class="localError">
      <h4>Local Error Analysis</h4>
      <${Switch}>
        <${Match} when=${() => !sample()}>
          <button disabled>Expresion analysis incomplete</button>
        <//>
        <${Match} when=${() => !request() && !localError()}>
          <button onClick=${() => { makeRequest(); genLocalError() }}>Analyze Local Error</button>
        <//>
        <${Match} when=${() => request() && !localError()}>
          <button disabled>waiting for local error (may take a few seconds)</button>
        <//>
        <${Match} when=${() => localError()}>
          <${Show} when=${() => localError().sample?.[0]?.[0]} fallback=${() => html`<span>Averaged across the sample:</span>`}>
            <${For} each=${getTable(api, 'Variables').filter(v => v.specId === expression.specId).map((v,i) => [v.varname, i])}>${([v, i]) => 
              html`<div>${v}: ${() => displayNumber(localError().sample?.[0]?.[0]?.[i] || 0)} (${() => localError().sample?.[0]?.[0]?.[i]})</div>`
              }<//>
          <//>
          ${() => {
            const lerr = localError()
            const analysis = getByKey(api, "Analyses", 'expressionId', expression.id) // TODO: inconsistent key name
            const graphElems = localErrorTreeAsMermaidGraph(lerr.tree, analysis.pointsJson.bits)
            
            const el = html`<div class=graphDiv> </div` as HTMLElement;
            const insertSvg = function(svgCode, bindFunctions){
              el.innerHTML = svgCode;
              el.querySelectorAll("span.nodeLocalError").forEach(h => {
                h.setAttribute("title", 'Local Error: ' + h.getAttribute("title") + ' bits') 
              })
            };
            
            // `BT` means "Bottom to Top"
            const graph = 'flowchart BT\n\n' + graphElems
            const render = mermaidAPI.render('graphDiv', graph, insertSvg);
            return el
          }}
        <//>
        <${Match} when=${() => /* TODO check associated request for error */ true}>
            error during computation :(
        <//>
      <//>
    </div>
  </div>`
}

function addExpressionComponent(spec, api) {
  const defaultSpec = { mathjs: "sqrt(x+1) - sqrt(x)", ranges: [["x", [1, 1e9]]] }
  const specs = () => api.tables.find(t => t.name === 'Specs').items
  const expressions = () => api.tables.find(t => t.name === 'Expressions')?.items
  const makeExpression = (spec, fpcore, mathjs) => () => {
    //console.log('makeExpression called')
    const specId = specs().find(api.getLastSelected((o, table) => table === "Specs") || (() => false))?.id // HACK just use current spec
    const id = expressionId++
    // ugly HACK duplicate the spec on the expression, see analyzeExpression
    api.action('create', 'demo', 'Expressions', { specId, fpcore, id, spec, mathjs })//, api.tables, api.setTables)
    notes.push({ specId: spec.id, id: expressionId, notes: ""})
    //api.action('select', 'demo', 'Expressions', (o, table) => o.id === id, api.tables, api.setTables, api)
    const curr = currentMultiselection(api).map(o => o.id)
    api.multiselect('Expressions', [...curr, id])//, api.tables, api.setTables)
  }
  const addSpec = async ({ mathjs, ranges, fpcore }) => {
    const id = specId++
    const spec = { mathjs, fpcore: fpcorejs.makeFPCore({ specMathJS: mathjs, specFPCore: fpcore, ranges }), ranges, id }
    await api.action('create', 'demo', 'Specs', spec)
    api.select('Specs', id)
    api.multiselect('Expressions', expressions().filter(e => e.specId === id).map(e => e.id))
  }
  const textarea = (value: any = JSON.stringify(defaultSpec), setValue = (v) => { }, classNames=[] as String[], rows: number = 4) => {
    const out = html`<textarea class="${classNames.join(' ')}" value="${value}" oninput=${e => setValue(e.target.value)} style="height:auto;" rows="${rows}"></textarea>` as HTMLInputElement
    out.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    });
    return out
  }
  const [addExpressionText, setAddExpressionText] = createSignal('')
  //setTimeout(() => setAddExpressionText(specs()?.[0]?.mathjs), 1000)
  createEffect(() => specs()?.[0]?.mathjs && setAddExpressionText(specs()[0].mathjs))
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
    let variableNames: string[] = []
    // grab variable from ranges
    let newVars = fpcorejs.getVarnamesMathJS(text())

    for (var val of spec.ranges) {
      variableNames.push(val[0])
    }
    for (var newVar of newVars) {
      if (!variableNames.includes(newVar)) { 
        console.log(`Extra Variable ${newVar}`) 
      }
    }
    await ensureSpecWithThoseRangesExists(ranges)
    makeExpression(specWithRanges(ranges), text().startsWith('[[') ? text().slice(2) : fpcorejs.mathjsToFPCore(text().split('\n').join(''), spec.fpcore), text().startsWith('[[') ? text().slice(2) : text().split('\n').join(''))()  // HACK to support FPCore submission
  }

  const [projectedError, { refetch }] = createResource(text, async (text) => {
    if (text === '') {
      return 0
    }
    try {
      return (await herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(text.split('\n').join(''), spec.fpcore), getByKey(api, 'Samples', 'specId', spec.id), getHost(), txt => console.log(txt))).meanBitsError
    } catch (err:any) {
      return 'loading...'  // HACK
    }
  })
  
  return html`<div class="addExpressionRow">
  <div>
    Projected average error: 
    <${Switch}>
      <${Match} when=${() => projectedError.loading}> loading...<//>
      <${Match} when=${() => true}> ${() => projectedError()?.toString()}<//>
    <//>
  </div>
  <div>
  ${textArea}
  </div>
  
  <button onClick=${addExpression}>Add expression</button>

  <div id="texPreview" >
  ${() => {
    try {
      if (text() === '') { return '' }
      return html`<span class="preview-stuff" innerHTML=${(window as any).katex.renderToString(math2Tex(text().split('\n').join('')), {
        throwOnError: false
      })}></span>`
    } catch (err :any) {
      return err.toString()
    }
  }}
    </div>
  </div>`
  //<button class="newSpec" onClick=${() => vscodeApi.postMessage(JSON.stringify({ command: 'openNewTab', mathjs: spec.mathjs, ranges: unwrap(varValues), run: true }))}>Update ranges (opens new tab)</button>
}

function expressionDerivationView(expression) {
  return html`<div>
    <h4>Herbie's derivation</h4>
    ${() => {
      if (expression.provenance !== 'herbie') {
        return 'You submitted this expression.'
      } else {
        const el = document.createElement('div') as HTMLElement
        el.innerHTML = expression.history;//history.html;
        (window as any).renderMathInElement(el.querySelector("#history"));
        return html`<div>${el.querySelector('#history')}</div>`
      }
    }}
  </div>
  `
}

function expressionDetailsView(expression) {
  const note = (function () {for (const subnote of notes) {
    if (subnote.id === expression.id && subnote.specId === expression.specId) return subnote;
  }
  })()
  const textarea = (value: any = "", setValue = (v) => { }, classNames=[] as String[], rows: number = 4) => {
    const out = html`<textarea class="${classNames.join(' ')}" value="${value}" oninput=${e => setValue(e.target.value)} style="height:auto;" rows="${rows}"></textarea>` as HTMLInputElement
    out.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
      }
    });
    return out
  }
  const notesArea = ''//textarea(note.notes, (v) => { note.notes = v }, undefined, 2)
  //   <div>
  //   Notes:
  // </div>
  // <div>
  // ${notesArea}
  //   `<div>
  //   <h4>Herbie's derivation</h4>
  //   ${() => {
  //     if (expression.provenance !== 'herbie') {
  //       return 'You submitted this expression.'
  //     } else {
  //       const el = document.createElement('div') as HTMLElement
  //       el.innerHTML = expression.history;//history.html;
  //       (window as any).renderMathInElement(el.querySelector("#history"));
  //       return html`<div>${el.querySelector('#history')}</div>`
  //     }
  //   }}
  // </div>`
  return html`
    <h3>Expression Details: </h3>
    <div>${renderTex(math2Tex(expression.mathjs)) || expression.fpcore}</div>
    <h4>Text</h4>
    <pre style="max-width: 400px; overflow: scroll; border: 1px solid gray;">${expression.mathjs.replaceAll('?', '?\n  ').replaceAll(':', '\n:')}</pre>

    </div>
  `
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
    <h3>Sampled bits of error over the range ${currentVarname} = [${minPt} , ${maxPt}]:</h3>
    ${() => {
      const selectedExpressionId = getLastSelected(api, "Expressions")?.id
    const validPointsJsons = pointsJsons()
      .filter(({ expression, pointsJson }) => pointsJson).sort((a, b) => a.expression.id === selectedExpressionId ? 1 : b.expression.id === selectedExpressionId ? -1 : 0)
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
      return zip(points.map(p => p[idx]), error['target'], points).map(([x, y, orig]) => ({ x, y, orig })).sort(keyFn(p => p.x))
    })
    const styles = validPointsJsons.map(({ expression }) => {
      // LATER color should be RGB string, will append alpha
      const selected = selectedExpressionId === expression.id
      const color = getColorCode(expression.id)//'#00ff00'
      //const color = api.tables.find(t => t.name === 'herbie.ExpressionColors').items.find(c => c.expressionId === expression.id).color
      /** alpha value for dots on the graph */
      const dotAlpha = selected ? 'b5' : '25'
      return { line: { stroke: color }, dot: { stroke: color + dotAlpha, fill: color, fillOpacity: 0 }, selected, id: expression.id}
    })
    const errorGraph = plotError({ data, styles, ticks, splitpoints, bits, varnames:vars, varidx: currentVarIdx()}, Plot)
    errorGraph.querySelectorAll('[aria-label="dot"] circle title').forEach((t: any) => {
      const { o, id } = JSON.parse(t.textContent)
      t.textContent = o.map((v, i) => `${vars[i]}: ${displayNumber(ordinalsjs.ordinalToFloat(v))}`).join('\n')
      t.parentNode.onclick = async () => {
        api.select('Expressions', id)
        const expression = getByKey(api, 'Expressions', 'id', id)
        const result = await herbiejs.analyzeLocalError(expression.fpcore, { points: [[o.map(v => ordinalsjs.ordinalToFloat(v)), 1e308]] }, getHost())
        const entry = { specId, id, tree: result.tree, sample: [[o.map(v => ordinalsjs.ordinalToFloat(v)), 1e308]] }
        api.action('create', 'demo', 'LocalErrors', entry)
      }
    })
    //console.log(data)
    return html`<div class="errorPlot">${errorGraph}</div>`
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

const errorPlot = expressionComparisonView

/** Get table items.*/
function getTable(api, tname) {
  return api.tables.find(t => t.name === tname).items
}
function select(api, tname, id) {
  return api.select(tname, id)//, api.tables, api.setTables)
}
function getByKey(api, tname, key, value) {
  return getTable(api, tname).findLast(v => v[key]=== value)
}

function getLastSelected(api, tname) {
  return getTable(api, tname).find(api.getLastSelected((o, table) => table === tname) || (() => false))
}

// NOTE we have to pipe requests to Herbie through a CORS-anywhere proxy
let HOST = 'http://127.0.0.1:8000'//'http://127.0.0.1:8080/http://nightly.cs.washington.edu/odyssey'//'http://127.0.0.1:8080/http://127.0.0.1:8000'//'http://127.0.0.1:8080/http://127.0.0.1:8000'//'http://127.0.0.1:8080/http://herbie.uwplse.org'//'http://127.0.0.1:8080/https://fa2c-76-135-106-225.ngrok.io'

// HACK to let us dynamically set the host
//@ts-ignore
const setHost = window.setHOST = host => HOST = host
//@ts-ignore
const getHost = window.getHOST = () => HOST

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
  return { ...await herbiejs.analyzeExpression(expression.fpcore, sample, getHost(), logval => console.log(logval)), expressionId: expression.id }
  //return await (new Promise(resolve => setTimeout(() => resolve({bitsError: Math.round(64 * Math.random()), performance: Math.round(100 * Math.random()), expressionId: expression.id}), 2000)))
}

// TODO def need to attach ids automatically on object generation in platform
function addNaiveExpression(spec, api) {
  // HACK expression.spec is duplicated, see analyzeExpression
  if (getTable(api, 'Expressions').find(s => s.mathjs === spec.mathjs)) { return [] }
  notes.push({ specId: spec.id, id: expressionId, notes: "Original spec"})
  return { specId: spec.id, fpcore: spec.fpcore /*fpcorejs.FPCoreGetBody(spec.fpcore)*/ || fpcorejs.mathjsToFPCore(spec.mathjs), id: expressionId++, spec, mathjs: spec.mathjs, provenance: 'naive'}
}

function addVariables(spec) {
  return spec.fpcore ? fpcorejs.getVarnamesFPCore(spec.fpcore).map(v => ({specId: spec.id, varname: v, id: variableId++})) : fpcorejs.getVarnamesMathJS(spec.mathjs).map(v => ({specId: spec.id, varname: v, id: variableId++}))
}

async function addSample(spec) {
  return { ...(await herbiejs.getSample(spec.fpcore, getHost(), txt => console.log(txt))), id: sampleId++, specId: spec.id }
}

function selectNaiveExpression(spec, api) {
  const curr = currentMultiselection(api).map(o => o.id)
  return {multiselection: true, selection: (o, table) => table === "Expressions" && o.fpcore === spec.fpcore || curr.includes(o.id)}
}

function updateExpressionsOnSpecAdd(spec, api) {
  const hidden = getTable(api, 'HiddenExpressions').map(e => e.expressionId)
  const expressions = getTable(api, 'Expressions').filter(e => e.specId === spec.id - 1 && !(hidden.includes(e.id)))
  //const exprs = [...new Set(expressions.map(e => e.mathjs))]
  const transferMap = Object.fromEntries(expressions.map(e => [e.id, expressionId++]))
  const newExprs = expressions.map(e => ({ ...e, specId: spec.id, id: transferMap[e.id] }))
  const oldSelectedIds = currentMultiselection(api).filter(e => !(hidden.includes(e.id))).map(o => o.id)
  const newSelectedIds = oldSelectedIds.map(id => transferMap[id])
  //const selectedMathjs = currentMultiselection(api).filter(e => !(hidden.includes(e.id))).map(o => expressions.find(e => e.id === o.id).mathjs)
  //const newExprs = exprs.map(e => ({ ...expressions.find(e1 => e1.mathjs === e), specId: spec.id, id: expressionId++ }))
      // HACK uses window...
  //@ts-ignore
  window.api.multiselect('Expressions', newSelectedIds)//newExprs.filter(e => selectedMathjs.includes(e.mathjs)).map(e => e.id))
  //@ts-ignore
  //window.api.create()
  return newExprs
}


async function analyzeLocalErrors(expression, api) {
  const sample = () => getByKey(api, 'Samples', 'specId', expression.specId)
  await waitUntil(sample)
  const result = await herbiejs.analyzeLocalError(expression.fpcore, sample(), getHost())
  const entry = { specId: expression.specId, id: expression.id, tree: result.tree, sample: [] }
  api.action('create', 'demo', 'LocalErrors', entry)
}

export default { mainPage, expressionView, expressionComparisonView, analyzeExpression, addNaiveExpression, selectNaiveExpression, addVariables, addSample, updateExpressionsOnSpecAdd, analyzeLocalErrors}