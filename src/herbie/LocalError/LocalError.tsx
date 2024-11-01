import * as HerbieContext from '../HerbieContext';
import * as types from '../HerbieTypes';
import * as fpcore from '../lib/fpcore';
import { Tooltip } from "react-tooltip";
import Mermaid from './Mermaid';
import { Point } from './Point'; 

import './LocalError.css';
import { useEffect } from 'react';
function localErrorTreeAsMermaidGraph(tree: types.LocalErrorTree, bits: number) {
  // See examples + doc at https://github.com/mermaid-js/mermaid
  let edges = [] as string[]
  let colors = {} as Record<string, string>
  let counter = 0

  
  const isLeaf = (n: types.LocalErrorTree ) => n['children'].length === 0

  function formatName(id: string, name: string, exact_err: string, approx_value: string, true_error: string, ulps_error: string) {
    const tooltipContent = `'Correct R : ${exact_err} Approx F : ${approx_value} Absolute Error R - F : ${true_error} ULPs Error : ${ulps_error}'`;
    return id + '[<span class=nodeLocalError data-tooltip-id=node-tooltip data-tooltip-content=' + tooltipContent + '>' + name + '</span>]'
  }

  function loop(n : types.LocalErrorTree) {
    const name = n['e']
    const children = n['children']
    const avg_error = n['avg-error']
    const exact_value = n['exact-value']
    const approx_value = n['actual-value']
    const absolute_error = n['absolute-error']
    const ulps = n['ulps-error']

    // node name
    const id = 'N' + counter++
    const nodeName = formatName(id, name, exact_value,approx_value, absolute_error, ulps)

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
    const exact_value = tree['exact-value']
    const approx_value = tree['actual-value']
    const absolute_error = tree['absolute-error']
    const ulps = tree['ulps-error']
    edges.push(formatName('N0', name, exact_value,approx_value, absolute_error, ulps))
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

   // Always call useEffect, even if localError is undefined
   useEffect(() => {
    if (!localError) return;
  
    // Add a delay before running the effect's logic
    const timer = setTimeout(() => {
      const labels = document.querySelectorAll('.node[class*="flowchart-label"]');
      console.log("in")
      labels.forEach(label => {
        const labelGroup = label.querySelector('.label');
        if (labelGroup) {
          labelGroup.removeAttribute('transform');
        }
  
        const parentNode = label.closest('.node');
        if (!parentNode) return;
  
        const svgElement = parentNode as unknown as SVGGraphicsElement;
        if (!svgElement.getBBox) {
          console.error("getBBox is not available on the parentNode");
          return;
        }
  
        const bbox = svgElement.getBBox();
  
        const foreignObject = label.querySelector('foreignObject') as unknown as HTMLElement;
        if (foreignObject) {
          foreignObject.setAttribute('width', `${bbox.width}`);
          foreignObject.setAttribute('height', `${bbox.height}`);
          foreignObject.setAttribute('x', `${bbox.x}`);
          foreignObject.setAttribute('y', `${bbox.y}`);
  
          const span = foreignObject.querySelector('.nodeLocalError') as HTMLElement;
          if (span) {
            span.style.display = 'flex';
            span.style.justifyContent = 'center';
            span.style.alignItems = 'center';
            span.style.textAlign = 'center';
            span.style.width = `${bbox.width}px`;
            span.style.height = `${bbox.height}px`;
          }
        }
      });
    }, 500);  // Add a delay of 500ms
  
    return () => clearTimeout(timer);  // Cleanup the timeout when the component unmounts or the effect re-runs
  }, [localError]); // Ensure the effect runs only when the graph is rendered and localError is available

  // const graph = localErrorTreeAsMermaidGraph(localError, 64)
  const varnames = fpcore.getVarnamesMathJS(spec.expression)
  // Safely check if selectedPoint and varnames are defined before using them
  const selectedPointValue = selectedPoint && varnames 
    ? (selectedPoint as number[]).map((value, i) => ({ [varnames[i]]: value })).reduce((a, b) => ({ ...a, ...b }), {})
    : {};  // Return an empty object if selectedPoint or varnames is undefined
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
  if (!localError) {
    return (
      <div className="local-error not-computed">
        <div>Please select a point on the error plot to compute local error.</div>
      </div>
    )
  }else {
  return (
    <div className="local-error">
      <div className="selected-point">
        <div className="selected-point-title">Selected Point:</div>
        <Point values={selectedPointValue}/>
      </div>
      <div className="local-error-graph" onClick={handleNodeClick}>
        
        {/* Always render the Mermaid graph, even if localError is not ready */}
        <Mermaid chart={localError ? localErrorTreeAsMermaidGraph(localError, 64) : ''} />
        {/* Tooltip with ID "mermaid-tooltip" */}
        <Tooltip id="node-tooltip" place="top">
        </Tooltip>
        
      </div>
    </div>
  );
}
}

export { LocalError }