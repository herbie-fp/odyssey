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
    return html`<div class="specRow">
      <span>${spec.math} from A to B</span>
      <span>${spec.id}</span>
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
    console.log('here', expression)
    return html`<div class="expressionRow" onClick=${selectExpression(expression)}>
      <span>${expression.fpcore}</span>
    </div>`
  }

  const getExprSpec = expr => specs().find(spec => spec.id === expr.specId)

  /** expressions where spec.math === expr's spec.math (or ditto fpcore) */ 
  const expressionsForSpec = spec => {
    console.log('CHecking expressions for the spec...', spec, unwrap(expressions()), unwrap(specs()), getExprSpec((expressions() || [{}])[0] || {}))
    return expressions().filter(expr => {
      const exprSpec = getExprSpec(expr)
      return spec.math === exprSpec.math 
      || spec.fpcore === exprSpec.fpcore
    })
  }
  const noExpressionsForSpec = spec => expressionsForSpec(spec).length === 0
  const makeExpressionFromSpec = spec => () => {
    api.action('create', 'demo', 'Expressions', {specId: spec.id, fpcore: spec.fpcore, id: expressionId++}, api.tables, api.setTables)
    //setExpressions(produce(expressions => expressions.push({specId: spec.id, fpcore: spec.fpcore, id: expressionId++})))
  }
  const noExpressionsRow = spec => {
    return html`<div>
      <span><button onClick=${makeExpressionFromSpec(spec)}>Create the default expression for this spec</button></span>
    </div>`
  }
  const getSpecBlock = spec => {
    return html`<div>
      ${getSpecRow(spec)}
      <${For} each=${() => expressionsForSpec(spec)}>${getExpressionRow}<//>
      ${() => noExpressionsForSpec(spec) ? noExpressionsRow(spec) : ''}
      ${/* TODO show selected item: api.getLastSelected((obj, table) => (obj, table))*/ '' }
    </div>`
  }
  
  const analyzeUI = html`<div>
    <${For} each=${specs}> ${spec => getSpecBlock(spec)}<//>
    ${newSpecInput}
  </div>
  `
  
  const contents = () => analyzeUI
  const div = html`<div id="demo">
    ${contents}
  </div>
  `
  setTimeout(() => submit(), 0)  // HACK jump to a submitted expression
  return {div}
}

export default {mainPage}