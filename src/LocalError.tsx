import * as HerbieContext from './HerbieContext';
import * as types from './HerbieTypes';
import Mermaid from './Mermaid';

import './LocalError.css';

function localErrorTreeAsMermaidGraph(tree: types.LocalErrorTree, bits: number) {
  // See examples + doc at https://github.com/mermaid-js/mermaid
  let edges = [] as string[]
  let colors = {} as Record<string, string>
  let counter = 0

  const isLeaf = (n: types.LocalErrorTree ) => n['children'].length === 0
  const formatName = (id : string, name : string, err: string) => id + '[<span class=nodeLocalError title=' + err + '>' + name + '</span>]'

  function loop(n : types.LocalErrorTree) {
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
    edges.push(formatName('N0', name, avg_error))
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

  // get the current sample and expression so we can pick the right local error from the averagelocalerrors table
  const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext);
  const [selectedExprId,] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext);
  const [averageLocalErrors,] = HerbieContext.useGlobal(HerbieContext.AverageLocalErrorsContext);
  
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
        <div>Please select a point to compute local error.</div>
      </div>
    )
  }

  // const graph = localErrorTreeAsMermaidGraph(localError, 64)

  return (
    <div className="local-error">
      <div className="local-error-graph">
        <Mermaid chart={localErrorTreeAsMermaidGraph(localError, 64)}  />
      </div>
    </div>
  )
}

export { LocalError }