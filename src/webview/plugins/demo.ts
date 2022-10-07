import { create } from "domain";
import { html, For } from "../../dependencies/dependencies.js";
import {createStore, createEffect, produce} from "../../dependencies/dependencies.js";

let specId = 1
let sampleId = 1

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
  const specHTMLInput = html`<input placeholder="sqrt(x+1) - sqrt(x)" value="sqrt(x+1) - sqrt(x)"></input>`
  const submit = event => {
    const id = specId++
    api.action('create', 'demo', 'Specs', {math: "", fpcore: "", id}, api.tables, api.setTables)
    api.action('select', 'demo', 'Specs', (o) => o.id === id)
  }

  const newSpecInput = html`
  <div id="newSpecInput">
    Spec: ${specHTMLInput}
    <div>Other spec config here...</div>
    <button onClick=${submit}>Submit</button>
  </div>
  `
  const specs = () => api.tables.tables.find(t => t.name === 'Specs').items

  // HACK just use stores, put into tables later
  const [samples, setSamples] = createStore([] as unknown[])
  const [expressions, setExpressions] = createStore([] as any[])
  
  const getSpecRow = spec => {
    // HACK all samples are relevant for now
    //const samples = relevantSamples(spec)
    //const relevantSamples = samples//.filter(sample => sample.specId = spec.id)
    // HACK mock sample retrieval
    const getSampleHandler = () => setSamples(produce(samples => samples.push({specId: spec.id, id: sampleId++})))
    const getSampleButton = html`<button onClick=${getSampleHandler}>getSample</button>`
    const sampleSelect = html`<select>
      <${For} each=${() => samples}>${sample => html`<option>${sample.id}</option>`}<//>
    </select>`
    return html`<div class="specRow">
      <span>${spec => spec.math}</span>
      <span>${() => samples.length === 0 ? getSampleButton : sampleSelect}</span>
      ${() => samples.length === 0 ? '' : html`<span>...Spec/sample summary goes here...</span>`}
    </div>`
  }
  function selectExpression (expression) {
    api.action('select', 'demo', 'Expressions', expression)
  }

  const getExpressionRow = expression => {
    return html`<div class="expressionRow" onClick=${selectExpression(expression)}>
      <span>${expr => expr.math}</span>
    </div>`
  }

  const getExprSpec = expr => specs().find(spec => spec.id === expr.specId)

  /** expressions where spec.math === expr's spec.math (or ditto fpcore) */ 
  const expressionsForSpec = spec => {
    return expressions.filter(expr => {
      const exprSpec = getExprSpec(expr)
      return spec.math === exprSpec.math 
      || spec.fpcore === exprSpec.fpcore
    })
  }
  const noExpressionsForSpec = spec => expressionsForSpec(spec).length === 0
  const noExpressionsRow = spec => {
    return html`<div>
      <span><button>Make an expression for this spec</button></span>
    </div>`
  }
  const getSpecBlock = spec => {
    return html`<div>
      ${getSpecRow(spec)}
      <${For} each=${() => expressionsForSpec(spec)}>${getExpressionRow}<//>
      ${noExpressionsForSpec(spec) ? noExpressionsRow(spec) : ''}
    </div>`
  }
  
  const analyzeUI = html`<div>
    <${For} each=${specs}> ${getSpecBlock}<//>
  </div>
  `
  
  const contents = () => 
    specs().length === 0 ? newSpecInput
    : analyzeUI
  const div = html`<div id="demo">
    ${contents}
  </div>
  `
  return {div}
}

export default {mainPage}