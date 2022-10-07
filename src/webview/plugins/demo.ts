import { create } from "domain";
import { html, For, Show, unwrap } from "../../dependencies/dependencies.js";
import {createStore, createEffect, produce} from "../../dependencies/dependencies.js";

let specId = 1
let sampleId = 1
let expressionId = 1

function computable(cacheValue, fn, ...args) {
  // promise-ish, but not exactly the same
  
  const compute = () => {
    //const p = new Promise((resolve, reject) => {
      try {
        // TODO something with log capture here
        fn(...args)
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
    setStore(produce(store => {
      //store.promise = p
      store.status = 'requested'
    }))
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
    const value = cacheValue()
    if (value !== undefined) {
      setStore(produce(store => {
        store.status = 'computed'
        store.value = value
      }))
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
    if (specs().find(spec => spec.math === math)) {
      api.action('select', 'demo', 'Specs', (o) => o.math === math, api.tables, api.setTables)
      return
    }
    const id = specId++
    api.action('create', 'demo', 'Specs', {math: specHTMLInput.value, fpcore: `(fpcore for ${math})`, id}, api.tables, api.setTables)
    api.action('select', 'demo', 'Specs', (o) => o.math === math, api.tables, api.setTables)
  }
  

  const newSpecInput = html`
  <div id="newSpecInput">
    Add Spec: ${specHTMLInput}
    <div>Other spec config here...</div>
    <button onClick=${submit}>Submit</button>
  </div>
  `
  const specs = () => api.tables.tables.find(t => t.name === 'Specs').items

  

  // HACK just use stores, put into tables later
  const [samples, setSamples] = createStore([] as any[])
  //const [expressions, setExpressions] = createStore([] as any[])
  const expressions = () => api.tables.tables.find(t => t.name === 'Expressions').items
  
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
    return html`<div class="specRow">
      <span>${spec.math} from A to B</span>
      <span>${addSampleButton}</span>
      <${Show} when=${() => relevantSamples().length !== 0}>
        <span>${sampleSelect}</span>
        <span>...Spec/sample summary goes here...</span>
      <//>
    </div>`
  }
  const selectExpression = expression => () => {
    api.action('select', 'demo', 'Expressions', o => o.id === expression.id, api.tables, api.setTables)
  }

  const getExpressionRow = expression => {
    // TODO slow operation simulation
    return html`<div class="expressionRow" >
      <span onClick=${selectExpression(expression)}>${expression.fpcore}</span>
      <span><button>Run Analysis</button></span>
    </div>`
  }

  const getExprSpec = expr => specs().find(spec => spec.id === expr.specId)

  /** expressions where spec.math === expr's spec.math (or ditto fpcore) */ 
  const expressionsForSpec = spec => {
    console.debug('Checking expressions for the spec...', spec, unwrap(expressions()), unwrap(specs()), getExprSpec((expressions() || [{}])[0] || {}))
    return expressions().filter(expr => {
      const exprSpec = getExprSpec(expr)
      return spec.math === exprSpec.math 
      || spec.fpcore === exprSpec.fpcore
    })
  }
  const noExpressionsForSpec = spec => expressionsForSpec(spec).length === 0
  const makeExpressionFromSpec = spec => () => {
    const id = expressionId++
    api.action('create', 'demo', 'Expressions', {specId: spec.id, fpcore: spec.fpcore, id}, api.tables, api.setTables)
    api.action('select', 'demo', 'Expressions', (o, table) => o.id === id, api.tables, api.setTables)
    //setExpressions(produce(expressions => expressions.push({specId: spec.id, fpcore: spec.fpcore, id: expressionId++})))
  }
  const noExpressionsRow = spec => {
    return html`<div class="noExpressionsRow">
      <span><button onClick=${makeExpressionFromSpec(spec)}>Create the default expression for this spec</button></span>
    </div>`
  }
  const getSpecBlock = spec => {
    return html`<div id="specBlock">
      ${getSpecRow(spec)}
      <${For} each=${() => expressionsForSpec(spec)}>${getExpressionRow}<//>
      ${() => noExpressionsForSpec(spec) ? noExpressionsRow(spec) : ''}
      
    </div>`
  }
  const lastSelectedExpression = () => api.tables.tables.find(t => t.name === "Expressions")?.items?.find(api.getLastSelected((o, table) => table === "Expressions") || (() => undefined))

  const expressionView = () => ExpressionView(lastSelectedExpression(), api)
  
  const analyzeUI = html`<div id="analyzeUI">
    <div id="specsAndExpressions">
      <${For} each=${specs}> ${spec => getSpecBlock(spec)}<//>
      ${newSpecInput}
    </div>
    <${Show} when=${lastSelectedExpression}>
      ${expressionView}
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
      #analyzeUI .expressionRow, #analyzeUI .noExpressionsRow {
        margin-left: 15px;
      }

    </style>
    ${contents}
  </div>
  `
  //setTimeout(() => submit(), 0)  // HACK jump to a submitted expression
  return {div}
}

function ExpressionView(expression, api) {
  //<div>...expression plot here...</div>
  return html`<div>
    <h3>Details for ${expression.fpcore}</h3>
    <div><button>Run Analysis</button></div>
  </div>`
}

export default {mainPage, ExpressionView}