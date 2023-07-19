import * as HerbieContext from './HerbieContext';

const mermaid = require('mermaid')   // have to do this for ES modules for now

// const mermaidAPI = mermaid.mermaidAPI
// const mermaidConfig = {
//   startOnLoad:true,
//   flowchart:{
//           useMaxWidth:false,
//           htmlLabels:true
//   }
// }

// TODO this is erroring out
// mermaidAPI.initialize(mermaidConfig)

interface LocalErrorTreeNode {
  e: string
  children: LocalErrorTreeNode[]
  'avg-error': number
}

// New typed code from HerbieJS
function localErrorTreeAsMermaidGraph(tree: LocalErrorTreeNode, bits: number) {
  let edges = [] as string[]
  let colors = {} as Record<string, string>
  let counter = 0

  const isLeaf = (n: LocalErrorTreeNode ) => n['children'].length === 0
  const formatName = (id : string, name : string, err: number) => id + '[<span class=nodeLocalError title=' + err + '>' + name + '</span>]'

  function loop(n : LocalErrorTreeNode) {
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

// Old SolidJS code for LocalError visualization
// function expressionView(expression, api) {
//   // get history and local error
//   const history = getByKey(api, 'Histories', 'id', expression.id)
//   const sample = () => getByKey(api, 'Samples', 'specId', expression.specId)
//   const note = (function () {for (const subnote of notes) {
//     if (subnote.id === expression.id && subnote.specId === expression.specId) return subnote;
//   }})()
//   const request = () => true //api.tables.find(t => t.name === "LocalErrorRequests").items.find(r => r.id === expression.id)
//   const makeRequest = () => api.action('create', 'demo', 'LocalErrorRequests', { id: expression.id })
//   const localError = () => getByKey(api, 'LocalErrors', 'id', expression.id)
//   const textarea = (value: any = "", setValue = (v) => { }, classNames=[] as String[], rows: number = 4) => {
//     const out = html`<textarea class="${classNames.join(' ')}" value="${value}" oninput=${e => setValue(e.target.value)} style="height:auto;" rows="${rows}"></textarea>` as HTMLInputElement
//     out.addEventListener('keydown', function(e) {
//       if (e.key === 'Tab') {
//         e.preventDefault();
//       }
//     });
//     return out
//   }
//   const notesArea = ''//textarea(note.notes, (v) => { note.notes = v }, undefined, 2)

//   async function genLocalError() {
//     const result = await herbiejs.analyzeLocalError(expression.fpcore, sample(), getHost())
//     const entry = { specId: expression.specId, id: expression.id, tree: result.tree, sample: [] }
//     api.action('create', 'demo', 'LocalErrors', entry)
//   }

//   return html`<div class="expressionView">
//     <div class="localError">
//       <h4>Local Error Analysis</h4>
//       <${Switch}>
//         <${Match} when=${() => !sample()}>
//           <button disabled>Expresion analysis incomplete</button>
//         <//>
//         <${Match} when=${() => !request() && !localError()}>
//           <button onClick=${() => { makeRequest(); genLocalError() }}>Analyze Local Error</button>
//         <//>
//         <${Match} when=${() => request() && !localError()}>
//           <button disabled>waiting for local error (may take a few seconds)</button>
//         <//>
//         <${Match} when=${() => localError()}>
//           <${Show} when=${() => localError().sample?.[0]?.[0]} fallback=${() => html`<span>Averaged across the sample:</span>`}>
//             <${For} each=${getTable(api, 'Variables').filter(v => v.specId === expression.specId).map((v,i) => [v.varname, i])}>${([v, i]) => 
//               html`<div>${v}: ${() => displayNumber(localError().sample?.[0]?.[0]?.[i] || 0)} (${() => localError().sample?.[0]?.[0]?.[i]})</div>`
//               }<//>
//           <//>
//           ${() => {
//             const lerr = localError()
//             const analysis = getByKey(api, "Analyses", 'expressionId', expression.id) // TODO: inconsistent key name
//             const graphElems = localErrorTreeAsMermaidGraph(lerr.tree, analysis.pointsJson.bits)
            
//             const el = html`<div class=graphDiv> </div` as HTMLElement;
//             const insertSvg = function(svgCode, bindFunctions){
//               el.innerHTML = svgCode;
//               el.querySelectorAll("span.nodeLocalError").forEach(h => {
//                 h.setAttribute("title", 'Local Error: ' + h.getAttribute("title") + ' bits') 
//               })
//             };
            
//             // `BT` means "Bottom to Top"
//             const graph = 'flowchart BT\n\n' + graphElems
//             const render = mermaidAPI.render('graphDiv', graph, insertSvg);
//             return el
//           }}
//         <//>
//         <${Match} when=${() => /* TODO check associated request for error */ true}>
//             error during computation :(
//         <//>
//       <//>
//     </div>
//   </div>`
// }

function LocalError() {
  // get the current point selection
  const [pointSelection, setPointSelection] = HerbieContext.useGlobal(HerbieContext.SelectedPointContext);

  return (
    <div className="localError">
      </div>)

}

export { LocalError }