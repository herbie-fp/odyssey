import { create } from "domain";
import { html, For, Show, Switch, Match, unwrap, untrack } from "../../dependencies/dependencies.js";
import { createStore, createEffect, createRenderEffect, createMemo, produce } from "../../dependencies/dependencies.js";
import { math } from "../../dependencies/dependencies.js"

let specId = 1
let sampleId = 1
let expressionId = 1

/**
 * 
 * @param cacheValue a signal for the value being computed
 * @param fn the function to run, can be async; must set cacheValue to mark the value as computed
 * @param args other arguments to pass to the function
 * @returns an object representing the computation state with a status field whose value may be 'unrequested', 'requested', 'computed', or 'error'.
 */
function computable(cacheValue=()=>undefined, fn, ...args) {
  // promise-ish, but not exactly the same
  
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

  createRenderEffect(() => {  // if the cache gets updated before compute, just resolve
    console.log('effect running')
    const value = cacheValue()
    //console.log(value)
    if (value !== undefined) {
      console.log('setting computed', value)
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

  const SECRETFUNCTIONS = { "^": "pow", "**": "pow", "abs": "fabs", "min": "fmin", "max": "fmax", "mod": "fmod" }

  function tree_errors(tree, expected) /* tree -> list */ {
    var messages = [] as any[];
    var names = [] as any[];

    var rtype = bottom_up(tree, function (node, path, parent) {
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
        default:
          messages.push("Unsupported syntax; found unexpected <code>" + node.type + "</code>.")
          return "real";
      }
    }).res;

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
    return bottom_up(tree, function (node) {
      switch (node.type) {
        case "ConstantNode":
          return "" + node.value;
        case "FunctionNode":
          // NOTE changed from node.name reassignment to be compatible with mathjs 4.4.2
          const name = SECRETFUNCTIONS[node.name] || node.name;
          return "(" + name + " " + extract(node.args).join(" ") + ")";
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
    }).res;
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

  return {
    //dumpFPCore: dump_fpcore,  // Currently has no error handling!
    rangeErrors: get_input_range_errors,
    FPCorePrecondition: get_precondition_from_input_ranges,
    getVarnamesMathJS: get_varnames_mathjs,
    parseErrors: mathJSExpr => {
      function mathJSErrors(mathJSExpr) {
        try { math.parse(mathJSExpr) } catch (e : any) { return [e.message] }
        return []
      }
      const mjserrors = mathJSErrors(mathJSExpr)
      return mjserrors.length > 0 ? mjserrors : tree_errors(math.parse(mathJSExpr), 'real')
    },
    FPCoreBody,
    makeFPCore: ({ specMathJS, ranges, targetFPCoreBody=undefined, name=specMathJS }) => {
      const vars = get_varnames_mathjs(specMathJS)
      const target = targetFPCoreBody ? `:herbie-target ${targetFPCoreBody}\n  ` : ''
      return `(FPCore (${vars.join(' ')})\n  :name "${name}"\n  :pre ${get_precondition_from_input_ranges(ranges)}\n  ${target}${FPCoreBody(specMathJS)})`
    }
  }
})()

const herbiejs = (() => {
  async function graphHtmlAndPointsJson(fpcore, host, log) {
    const sendJobResponse = await fetch( host + "/improve-start", {
      "headers": {
          "Content-Type": "application/x-www-form-urlencoded",
      },
      "body": `formula=${encodeURIComponent(fpcore)}`,
      "method": "POST",
      "mode": "cors"
    });
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
      console.log(graphHtml)
      //@ts-ignore
      window.html = html
      const page = document.createElement('div') as any
      page.innerHTML = graphHtml
      //const page = html`${graphHtml}`
      console.log('good parse')
      return [ Object.fromEntries([...page.querySelectorAll('.implementation')].map(d => [d.getAttribute('data-language'), {spec: d.textContent.split('↓')[0], suggestion: d.textContent.split('↓')[1]}])).FPCore.suggestion ].map( v => {
        const body = v.slice(v.slice(9).indexOf('(') + 9, -1)
        return body
    })
    },
    analyzeExpression: async (spec, targetFPCoreBody, host, log) => {
        const { graphHtml, pointsJson } = await graphHtmlAndPointsJson(fpcorejs.makeFPCore({specMathJS: spec.mathjs, ranges: spec.ranges, targetFPCoreBody }).split('\n').join(''), host, log)
        const meanBitsError = pointsJson.error.target.reduce((sum, v) => sum + v, 0)/pointsJson.error.target.length
        return {graphHtml, pointsJson, meanBitsError}
    }
  })
})()

function mainPage(api) {
  console.clear()
  console.log('Setting up main demo page...')
  const textarea = (value=JSON.stringify({mathjs: "sqrt(x+1) - sqrt(x)", ranges: [["x", [0, 1000]]]}, undefined, 2)) => html`<textarea value="${value}"></textarea>` as HTMLInputElement

  const addSpec = ({ mathjs, ranges }) => { 
    const id = specId++
    const spec = { mathjs, fpcore: fpcorejs.makeFPCore({ specMathJS: mathjs, ranges }), ranges, id}
    api.action('create', 'demo', 'Specs', spec, api.tables, api.setTables) //untrack(() => api))  // HACK untrack here is weird
    api.action('select', 'demo', 'Specs', (o) => o.id === id, api.tables, api.setTables)
    const curr = currentMultiselection(api).map(o => o.id)
    api.action('multiselect', 'demo', 'Expressions', (o) => o.specId === id || curr.includes(o.id), api.tables, api.setTables)
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
  const specs = () => api.tables.tables.find(t => t.name === 'Specs').items

  // HACK just use stores, put into tables later
  const [samples, setSamples] = createStore([] as any[])
  //const [expressions, setExpressions] = createStore([] as any[])
  const expressions = () => api.tables.tables.find(t => t.name === 'Expressions')?.items
  
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
    // <span>${spec.id}</span>
    //<span>${addSampleButton}</span>
    const genHerbieAlts = () => {
      // TODO hook up to Herbie here
      let id1 = expressionId++
      api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' A', id1, provenance: 'herbie' }, api.tables, api.setTables, api)
      let id2 = expressionId++
      api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' B', id2, provenance: 'herbie' }, api.tables, api.setTables, api)
      let id3 = expressionId++
      api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' C', id3, provenance: 'herbie' }, api.tables, api.setTables, api)
      api.action('multiselect', 'demo', 'Expressions', o => [id1, id2, id3].includes(o.id), api.tables, api.setTables)
      // TODO (implement multiselect action -- just put all matches in an array)
    }
    const c = altGenComputable(spec, api) // TODO probably should be done with an action + rule
    const selectSpec = spec => api.action('select', 'demo', 'Specs', o => o.id === spec.id, api.tables, api.setTables)
    return html`<div class="specRow">
      <span onClick=${() => selectSpec(spec)}>Range with id ${spec.id}</span>
      <${Show} when=${() => relevantSamples().length !== 0}>
        <span>${sampleSelect}</span>
        <span>...Spec/sample summary goes here...</span>
      <//>
      <span>
        <${Switch}>
          <${Match} when=${() => c.status === 'unrequested' && !(expressions().find(o => o.specId === spec.id && o.provenance === 'herbie'))}>
            <button onClick=${c.compute}>Get alternatives with Herbie</button>
          <//>
          <${Match} when=${() => c.status === 'requested'}>
            waiting for alternatives...
          <//>
          <${Match} when=${() => expressions().find(o => o.specId === spec.id && o.provenance === 'herbie')}>
            [alternatives shown]
          <//>
          <${Match} when=${() => c.status === 'error'}>
          ${() => console.log('suggest error', c)}
            error during computation :(
          <//>
          <${Match} when=${() => true}>
            ${() => {
      console.log('here', c)
      return 'other case'
              } 
            }
          <//>
        <//>
      </span>
    </div>`
  }
  const selectExpression = expression => () => {
    api.action('select', 'demo', 'Expressions', o => o.id === expression.id, api.tables, api.setTables)
  }

  const analyses = () => api.tables.tables.find(t => t.name === 'Analyses').items

  const getExpressionRow = (expression) => {
    // TODO there might be a runaway reactive rendering bug around here
    // (seems to impact performance only)
    const c = analysisComputable(expression, api)
    //console.log('rerendering')

    //console.log(currentSelection())
    const toggleMultiselected = () => {
      const newSelectionIds = [
        ...currentMultiselection(api).map(o => o.id).filter(id => id !== expression.id),
        ...[boxChecked() ? [] : expression.id]]
      console.log(newSelectionIds)
      api.action('select', 'demo', 'Specs', (o, table) => o.id === expression.specId, api.tables, api.setTables)
      api.action('multiselect', 'demo', 'Expressions', o => {
        return newSelectionIds.includes(o.id)
      }, api.tables, api.setTables)
    }
    // <button onClick=${c.compute}>Run Analysis</button>
    // 
    const boxChecked = () => currentMultiselection(api).find(o => o.id === expression.id)
    // <span>
    // <button>inline details</button>
    // </span>
    return html`<div class="expressionRow" >
      <span>
        <input type="checkbox" onClick=${toggleMultiselected} checked=${boxChecked}>
      </span>
      <span onClick=${selectExpression(expression)}>${expression.fpcore}</span>
      <span>
        <${Switch}>
          <${Match} when=${() => c.status === 'unrequested'}>
            waiting for analysis (unreq)...
          <//>
          <${Match} when=${() => c.status === 'requested'}>
            waiting for analysis...
          <//>
          <${Match} when=${() => c.status === 'computed'}>
            ${() => JSON.stringify(Object.fromEntries(Object.entries(c.value as any).filter(([k, v]) => ['meanBitsError', 'performance', 'expressionId'].includes(k))))}
          <//>
          <${Match} when=${() => c.status === 'error'}>
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
  
  const makeExpression = (spec, fpcore) => () => {
    console.log('makeExpression called')
    const id = expressionId++
    // ugly HACK duplicate the spec on the expression, see analyzeExpression
    api.action('create', 'demo', 'Expressions', {specId: spec.id, fpcore, id, spec}, api.tables, api.setTables, api)
    api.action('select', 'demo', 'Expressions', (o, table) => o.id === id, api.tables, api.setTables, api)
    const curr = currentMultiselection(api).map(o => o.id)
    api.action('multiselect', 'demo', 'Expressions', (o, table) => [...curr, id].includes(o.id), api.tables, api.setTables)
  }
  
  const makeExpressionFromSpec = spec => makeExpression(spec, fpcorejs.FPCoreBody(spec.mathjs))

  const noExpressionsRow = spec => {
    return html`<div class="noExpressionsRow">
      <span><button onClick=${makeExpressionFromSpec(spec)}>Create the default expression for this spec</button></span>
    </div>`
  }
  const addExpressionRow = spec => {
    const text = textarea(spec.mathjs)
    
    return html`<div class="addExpressionRow">
    <div>
    ${text}
    </div>
    <button onClick=${() => makeExpression(spec, fpcorejs.FPCoreBody(text.value))()}>Add expression</button>
    </div>`
  }
  // <div>[todo] sort by <select><${For} each=${() => new Set(expressions().map(o => Object.keys(o)).flat())}><option>${k => k}</option><//></select></div>
  const getSpecBlock = spec => {
    return html`<div id="specBlock">
      ${getSpecRow(spec)}
      
      <${For} each=${() => expressionsForSpec(spec)}>${getExpressionRow}<//>
      ${() => noExpressionsForSpec(spec) ? noExpressionsRow(spec) : ''}
      ${() => addExpressionRow(spec)}
      
    </div>`
  }
  const lastSelectedExpression = () => api.tables.tables.find(t => t.name === "Expressions")?.items?.find(api.getLastSelected((o, table) => table === "Expressions") || (() => undefined))

  const lastMultiselectedExpressions = () => {
    const specId = specs().find(api.getLastSelected((o, table) => table === "Specs") || (() => false))?.id
    console.log('test', specId)
    return expressions()
      .filter(api.getLastMultiselected((objs, table) => table === 'Expressions') || (() => false))
      .filter(e => e.specId === specId)
  }
  const specView = () => html`<div>
    <h3>Details for Spec with ranges ${JSON.stringify(specs().find(api.getLastSelected((_, t) => t === "Specs")).ranges)}</h3>
    <div>[todo]</div>
    </div>`
  const comparisonView = () => ExpressionComparisonView(lastMultiselectedExpressions(), api)
  const expressionView = () => ExpressionView(lastSelectedExpression(), api)
  
  const specsAndExpressions = (startingSpec) => html`
    <div id="specsAndExpressions">
      <div id="specTitle">The Spec: ${startingSpec.fpcore}</div>
      <${For} each=${specs}> ${spec => getSpecBlock(spec)}<//>
      ${() => modifyRange(startingSpec)}
    </div>`

  const lastSelection = () => api.tables.tables.find(t => t.name === 'Selections').items.findLast(s => s.table === 'Expressions' || s.table === 'Specs')
//   <${Show} when=${lastMultiselectedExpressions}>
//   ${comparisonView}
// <//>
  const analyzeUI = html`<div id="analyzeUI">
    <${Show} when=${() => specs()[0]}
      fallback=${newSpecInput()}>
      ${() => specsAndExpressions(specs()[0])}
      <div id="focus">
        <${Switch}>
          <${Match} when=${() => lastSelection()?.table === 'Specs'}>
            ${specView}
          <//>
          <${Match} when=${() => lastSelection()?.multiselection}>
            ${comparisonView}
          <//>
          <${Match} when=${() => lastSelection() && !(lastSelection().multiselection)}>
            ${expressionView}
          <//>
        <//>
      </div>
    <//>
    
  </div>
  `
  
  const contents = () => analyzeUI
  const div = html`<div id="demo">
    <style>
      #analyzeUI div {
        border: 1px solid black;
        margin: 2px;
        padding: 2px;
      }
      #analyzeUI span {
        border: 1px solid black;
        margin: 2px;
      }
      #analyzeUI .expressionRow, #analyzeUI .noExpressionsRow, #analyzeUI .addExpressionRow {
        margin-left: 15px;
      }
      #analyzeUI {
        display: grid;
        grid-template-areas: 'table focus';
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
  setTimeout(() => api.action('multiselect', 'demo', 'Expressions', o => true, api.tables, api.setTables))
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
  const expressions = () => api.tables.tables.find(t => t.name === 'Expressions').items
  return expressions().filter(api.getLastMultiselected((objs, table) => table === 'Expressions') || (() => false))
}

function altGenComputable(spec, api) {
  // TODO probably should be done with an action + rule
  const expressions = () => api.tables.tables.find(t => t.name === 'Expressions').items
  let ids = [expressionId++] as any
  async function genHerbieAlts () {
    //await new Promise(resolve => setTimeout(() => resolve(null), 2000))
    // HACK expression.spec (see analyzeExpression)
    // HACK assuming only one suggestion for now
    console.log('spec fpcore is', spec.fpcore)
    const expressions = ([await herbiejs.suggestExpressions(spec.fpcore, HOST, logval => console.log(logval), html)]).map(fpcorebody => {
      return { fpcore: fpcorebody, specId: spec.id, id: ids[0], provenance: 'herbie', spec}
    })
    expressions.map(e => api.action('create', 'demo', 'Expressions', e, api.tables, api.setTables, api))
    //ids = expressions.map(e => e.id)
    const curr = currentMultiselection(api).map(o => o.id)
    api.action('multiselect', 'demo', 'Expressions', o => [...curr, ...ids].includes(o.id), api.tables, api.setTables)
    return 'done'
  }

  return computable(() => ids.every(id => expressions().find(o => o.id === id)) || undefined, genHerbieAlts)
}

function analysisComputable(expression, api) {
  const analyses = () => api.tables.tables.find(t => t.name === 'Analyses').items
  const analysis = () => analyses().find(a => a.expressionId === expression.id)
  const specs = () => api.tables.tables.find(t => t.name === 'Specs').items
  const samples = () => api.tables.tables.find(t => t.name === 'Samples').items
  
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }))?.json()
  }


  function mockData(expression, api) {
    return new Promise(resolve => setTimeout(() => resolve({bitsError: 10, performance: 100 * Math.random(), expressionId: expression.id}), 2000))
  }

  return computable(analysis, async () => api.action('create', 'demo', 'Analyses', await analyzeExpression(expression, api), api.tables, api.setTables, api))
}

function ExpressionView(expression, api) {
  //<div>...expression plot here...</div>
  const c = analysisComputable(expression, api)
  return html`<div>
    <h3>Details for Expression ${expression.fpcore}</h3>
    <${Switch}>
      <${Match} when=${() => c.status === 'unrequested'}>
        <button onClick=${c.compute}>Run Analysis</button>
      <//>
      <${Match} when=${() => c.status === 'requested'}>
        waiting...
      <//>
      <${Match} when=${() => c.status === 'computed'}>
        ${() => JSON.stringify(c.value)}
      <//>
      <${Match} when=${() => c.status === 'error'}>
        ${() => console.log(c)}
        error during computation :(
      <//>
    <//>
  </div>`
}

function ExpressionComparisonView(expressions, api) {
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
   
  const lastSpec = () => api.tables.tables.find(t => t.name === "Specs").items.find(api.getLastSelected((o, table) => table === "Specs") || (() => false))
  return html`<div>
    <h3>Comparison of ${()=> expressions.length} expressions for Range with id ${() => lastSpec()?.id}</h3>
    ${() => JSON.stringify(expressions)}
  </div>`
}
const HOST = 'http://127.0.0.1:8080/127.0.0.1:8000'

async function analyzeExpression(expression, api) {
  // const specs = () => api.tables.tables.find(t => t.name === 'Specs').items
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
  return {specId: spec.id, fpcore: fpcorejs.FPCoreBody(spec.mathjs), id: expressionId++, spec}
}

function selectNaiveExpression(spec, api) {
  const curr = currentMultiselection(api).map(o => o.id)
  return {multiselection: true, selection: (o, table) => table === "Expressions" && o.fpcore === spec.fpcore || curr.includes(o.id)}
}

export default {mainPage, ExpressionView, ExpressionComparisonView, analyzeExpression, addNaiveExpression, selectNaiveExpression}