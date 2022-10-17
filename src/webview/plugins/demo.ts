import { create } from "domain";
import { html, For, Show, Switch, Match, unwrap } from "../../dependencies/dependencies.js";
import {createStore, createEffect, createMemo, produce} from "../../dependencies/dependencies.js";

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

  createEffect(() => {  // if the cache gets updated before compute, just resolve
    //console.log('effect running')
    const value = cacheValue()
    //console.log(value)
    if (value !== undefined) {
      //console.log('setting computed')
      setStore(produce(store => {
        store.status = 'computed'
        store.value = value
      }))
      //console.log(store.status)
    }
  })
  return store
}

function mainPage(api) {
  console.clear()
  console.log('Setting up main demo page...')
  const specHTMLInput = html`<input type="text" placeholder="sqrt(x+1) - sqrt(x)" value="sqrt(x+1) - sqrt(x)"></input>` as HTMLInputElement
  const submit = () => {
    const math = specHTMLInput.value
    // if (specs().find(spec => spec.math === math)) {
    //   api.action('select', 'demo', 'Specs', (o) => o.math === math, api.tables, api.setTables)
    //   return
    // }
    const id = specId++
    const spec = {math: specHTMLInput.value, fpcore: `(fpcore for ${math})`, ranges: `Input Ranges: ${id}`, id}
    api.action('create', 'demo', 'Specs', spec, api.tables, api.setTables)
    api.action('select', 'demo', 'Specs', (o) => o.id === id, api.tables, api.setTables)
    const curr = currentMultiselection(api).map(o => o.id)
    api.action('multiselect', 'demo', 'Expressions', (o) => o.specId === id || curr.includes(o.id), api.tables, api.setTables)
  }
  

  const newSpecInput = html`
  <div id="newSpecInput">
    Add Spec: ${specHTMLInput}
    <div>Other sampling config here...</div>
    <button onClick=${submit}>Submit</button>
  </div>
  `
  /*
    <div>Add input range:</div>
    <div>Other spec config here...</div>
    <button onClick=${submit}>Add input range</button>
  */
  const modifyRange = startingSpec => html`
  <div id="modifyRange">
    <button onClick=${submit}>Add input range</button>
  </div>
  `
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
      let id1 = expressionId++
      api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' A', id1, provenance: 'herbie' }, api.tables, api.setTables)
      let id2 = expressionId++
      api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' B', id2, provenance: 'herbie' }, api.tables, api.setTables)
      let id3 = expressionId++
      api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' C', id3, provenance: 'herbie' }, api.tables, api.setTables)
      api.action('multiselect', 'demo', 'Expressions', o => [id1, id2, id3].includes(o.id), api.tables, api.setTables)
      // TODO (implement multiselect action -- just put all matches in an array)
    }
    const c = altGenComputable(spec, api) // TODO probably should be done with an action + rule
    const selectSpec = spec => api.action('select', 'demo', 'Specs', o => o.id === spec.id, api.tables, api.setTables)
    return html`<div class="specRow">
      <span onClick=${() => selectSpec(spec)}>${spec.ranges}</span>
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
            error during computation :(
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
            waiting for analysis...
          <//>
          <${Match} when=${() => c.status === 'requested'}>
            waiting for analysis...
          <//>
          <${Match} when=${() => c.status === 'computed'}>
            ${() => JSON.stringify(c.value)}
          <//>
          <${Match} when=${() => c.status === 'error'}>
            error during computation :(
          <//>
        <//>
      </span>
    </div>`
  }

  const getExprSpec = expr => specs().find(spec => spec.id === expr.specId)

  /** expressions where spec.math === expr's spec.math (or ditto fpcore) */ 
  const expressionsForSpec = spec => {
    return expressions().filter(e => e.specId === spec.id)
    // console.debug('Checking expressions for the spec...', spec, unwrap(expressions()), unwrap(specs()), getExprSpec((expressions() || [{}])[0] || {}))
    // return expressions().filter(expr => {
    //   const exprSpec = getExprSpec(expr)
    //   return spec.id === exprSpec.math 
    //   || spec.fpcore === exprSpec.fpcore
    // })
  }
  const noExpressionsForSpec = spec => expressionsForSpec(spec).length === 0
  
  const makeExpression = (spec, fpcore) => () => {
    console.log('makeExpression called')
    const id = expressionId++
    api.action('create', 'demo', 'Expressions', {specId: spec.id, fpcore: fpcore, id}, api.tables, api.setTables)
    api.action('select', 'demo', 'Expressions', (o, table) => o.id === id, api.tables, api.setTables)
    const curr = currentMultiselection(api).map(o => o.id)
    api.action('multiselect', 'demo', 'Expressions', (o, table) => [...curr, id].includes(o.id), api.tables, api.setTables)
  }
  
  const makeExpressionFromSpec = spec => makeExpression(spec, spec.fpcore)

  const noExpressionsRow = spec => {
    return html`<div class="noExpressionsRow">
      <span><button onClick=${makeExpressionFromSpec(spec)}>Create the default expression for this spec</button></span>
    </div>`
  }
  const addExpressionRow = spec => html`<div class="addExpressionRow">
    <button onClick=${makeExpression(spec, 'custom')}>Add another expression</button>
    </div>`
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
    <h3>Details for Spec with ${specs().find(api.getLastSelected((_, t) => t === "Specs")).ranges}</h3>
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
      fallback=${newSpecInput}>
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
        grid-template-areas: 'table focus focus focus';
        justify-content: start;
      }
      #analyzeUI #focus {
        grid-area: focus
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
  let id1 = expressionId++
  let id2 = expressionId++
  let id3 = expressionId++
  async function genHerbieAlts () {
    await new Promise(resolve => setTimeout(() => resolve(null), 2000))
    // TODO replace with a server call
    api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' alt A', id: id1, provenance: 'herbie' }, api.tables, api.setTables)
    api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' alt B', id: id2, provenance: 'herbie' }, api.tables, api.setTables)
    api.action('create', 'demo', 'Expressions', { specId: spec.id, fpcore: spec.fpcore + ' alt C', id: id3, provenance: 'herbie' }, api.tables, api.setTables)
    const curr = currentMultiselection(api).map(o => o.id)
    api.action('multiselect', 'demo', 'Expressions', o => [...curr, id1, id2, id3].includes(o.id), api.tables, api.setTables)
    return 'done'
  }

  return computable(() => expressions().find(o => o.id === id1) && expressions().find(o => o.id === id2) && expressions().find(o => o.id === id3), genHerbieAlts)
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

  return computable(analysis, async () => api.action('create', 'demo', 'Analyses', await mockData(expression, api), api.tables, api.setTables))
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
    <h3>Comparison of ${()=> expressions.length} expressions for ${() => lastSpec()?.ranges}</h3>
    ${() => JSON.stringify(expressions)}
  </div>`
}

async function analyzeExpression(expression) {
  return await (new Promise(resolve => setTimeout(() => resolve({bitsError: Math.round(64 * Math.random()), performance: Math.round(100 * Math.random()), expressionId: expression.id}), 2000)))
}

// TODO def need to attach ids automatically on object generation in platform
function addNaiveExpression(spec) {
  return {specId: spec.id, fpcore: spec.fpcore, id: expressionId++}
}

function selectNaiveExpression(spec, api) {
  const curr = currentMultiselection(api).map(o => o.id)
  return {multiselection: true, selection: (o, table) => table === "Expressions" && o.fpcore === spec.fpcore || curr.includes(o.id)}
}

export default {mainPage, ExpressionView, ExpressionComparisonView, analyzeExpression, addNaiveExpression, selectNaiveExpression}