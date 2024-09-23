import * as HerbieContext from '../HerbieContext';
import * as types from '../HerbieTypes';
import * as fpcore from '../lib/fpcore';
import Mermaid from './Mermaid';
import { Point } from './Point'

import './LocalError.css';

function localErrorTreeAsMermaidGraph(tree: types.LocalErrorTree, bits: number) {
  // See examples + doc at https://github.com/mermaid-js/mermaid
  let edges = [] as string[]
  let colors = {} as Record<string, string>
  let counter = 0

  
  const isLeaf = (n: types.LocalErrorTree ) => n['children'].length === 0

  function formatName(id: string, name: string, avg_err: string, exact_err: string, actual_value: string) {
    const title = `'Average Error: ${avg_err} Floating Point: ${exact_err}, Real: ${actual_value}'`
    console.log(title)
    return id + '[<span class=nodeLocalError title=' + title + '>' + name + '</span>]'
  }

  function loop(n : types.LocalErrorTree) {
    const name = n['e']
    const children = n['children']
    const avg_error = n['avg-error']
    const exact_value = n['exact-value']
    const actual_value = n['actual-value']

    // node name
    const id = 'N' + counter++
    const nodeName = formatName(id, name, avg_error, exact_value, actual_value)

    // descend through AST
    for (const c in children) {
      const cName = loop(children[c])
      edges.push(cName + ' --> ' + nodeName)
    }

    // color munging
    const nonRed = 255.0 - Math.trunc((parseFloat(avg_error) / bits) * 200.0)
    const nonRedHex = ('0' + nonRed.toString(16)).slice(-2)
    colors[id] = 'ff' + nonRedHex + nonRedHex

    return nodeName
  }

  loop(tree)

  // Edge case: 1 node => no edges
  if (isLeaf(tree)) {
    const name = tree['e']
    const avg_error = tree['avg-error']
    const exact_error = tree['exact-value']
    const real_value = tree['actual-value']
    edges.push(formatName('N0', name, avg_error, exact_error, real_value))
  }

  // List colors
  for (const id in colors) {
    // HACK: title gets put under style to be extracted later
    edges.push('style ' + id + ' fill:#' + colors[id])
  }

  // `BT` means "Bottom to Top"
  return 'flowchart RL\n\n' + edges.join('\n')
}

function LocalError({ expressionId }: { expressionId: number }) {
  // get the current point selection and selected point local error
  const [selectedPoint, ] = HerbieContext.useGlobal(HerbieContext.SelectedPointContext);
  const [selectedPointsLocalError, ] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
  const [spec, ] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  // get the current sample and expression so we can pick the right local error from the averagelocalerrors table
  const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext);
  const [selectedExprId,] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext);
  const [averageLocalErrors,] = HerbieContext.useGlobal(HerbieContext.AverageLocalErrorsContext);
  const [expressions, ] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext);
  //
  const pointLocalError = selectedPointsLocalError.find(a => a.expressionId === expressionId)?.error

  // get the local error
  const localError =
    selectedPoint && pointLocalError
    ? pointLocalError
    : averageLocalErrors.find((localError) => localError.sampleId === selectedSampleId && localError.expressionId === expressionId)?.errorTree

  if (!localError) {
    return (
      <div className="local-error not-computed">
        <div>Please select a point on the error plot to compute local error.</div>
      </div>
    )
  }

  // const graph = localErrorTreeAsMermaidGraph(localError, 64)
  const varnames = fpcore.getVarnamesMathJS(spec.expression)
  
  const selectedPointValue = (selectedPoint as number[]).map((value, i) => ({ [varnames[i]]: value })).reduce((a, b) => ({ ...a, ...b }), {})
  const handleNodeClick = (event: any) => {
    // Check if the clicked element or its closest ancestor is a .node
    const closestNode = event.target.closest(".node");
    if (closestNode === null) {
      return;
    }

    // Check if the clicked element is not of class 'nodeLocalError'
    if (!event.target.classList.contains('nodeLocalError')) {
      // Check if the closest .node element has any children with class 'nodeLocalError'
      const errorNode = closestNode.querySelector('.nodeLocalError');
      if (errorNode) {
        console.log('Node clicked!', errorNode);
      }
      return
    }

    console.log('Node clicked!', event.target);
  };
  return (
    <div className="local-error">
      <div className="selected-point">
        <div className="selected-point-title">Selected Point:</div>
        <Point values={selectedPointValue}/>
      </div>
      <div className="local-error-graph" onClick={handleNodeClick}>
        <Mermaid chart={localErrorTreeAsMermaidGraph(localError, 64)}  />
      </div>
    </div>
  )
}

export { LocalError }