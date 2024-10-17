import * as HerbieContext from '../HerbieContext';
import * as types from '../HerbieTypes';
import * as fpcore from '../lib/fpcore';
import { Tooltip } from "react-tooltip";
import Mermaid from './Mermaid';
import { Point } from './Point'

import './LocalError.css';
import React, { useEffect } from 'react';
function localErrorTreeAsMermaidGraph(tree: types.LocalErrorTree, bits: number) {
  // See examples + doc at https://github.com/mermaid-js/mermaid
  let edges = [] as string[]
  let colors = {} as Record<string, string>
  let counter = 0

  
  const isLeaf = (n: types.LocalErrorTree ) => n['children'].length === 0

  function formatName(id: string, name: string, exact_err: string,
    approx_value: string, true_error: string, ulps_error: string) {
    // TODO fix newlines and brackets. Mermaid doesn't like them.
    //const title = `'Correct R : ${exact_err}Approx F : ${approx_value}Error R - F : ${true_error}ULPs Error : ${ulps_error}'`
    //console.log(title)
    const tooltipContent = `'Correct R : ${exact_err} Approx F : ${approx_value} Error R - F : ${true_error} ULPs Error : ${ulps_error}'`;

    return id + '[<span class=nodeLocalError data-tooltip=' + tooltipContent + '>' + name + '</span>]'
  }

  function loop(n : types.LocalErrorTree) {
    const name = n['e']
    const children = n['children']
    const avg_error = n['avg-error']
    const exact_value = n['exact-value']
    const approx_value = n['approx-value']
    const true_error = n['true-error-value']
    const ulps = n['ulps-error']

    // node name
    const id = 'N' + counter++
    const nodeName = formatName(id, name, exact_value,approx_value, true_error, ulps)

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
    const approx_value = tree['approx-value']
    const true_error = tree['true-error-value']
    const ulps = tree['ulps-error']
    edges.push(formatName('N0', name, exact_value,approx_value, true_error, ulps))
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
    if (!localError) return; // Only run effect if localError exists
    
    const addForeignObjectToLabels = () => {
      
      const labels = document.querySelectorAll('.node[class*="flowchart-label"]');

      labels.forEach(label => {
        const existingDeselect = label.querySelector('.deselect');

        const nodeLocalErrorElement = label.querySelector('.nodeLocalError');
        
        if (!nodeLocalErrorElement) {
          console.error("No 'nodeLocalError' found within this label");
          return;
        }

  
        // Access the custom data-tooltip attribute
        const nodeLocalErrorTooltip = nodeLocalErrorElement.getAttribute('data-tooltip') || "No details found";
        if (existingDeselect) {
          // Skip creating a new one if it already exists
          return;
        }
        // Get the parent node (the container for the label)
        const parentNode = label.closest('.node');
        if (!parentNode) {
            return; // Skip if the parent node doesn't exist
        }

        // Cast parentNode to SVGGraphicsElement to access getBBox
        const svgElement = parentNode as unknown as SVGGraphicsElement;

        if (!svgElement.getBBox) {
            console.error("getBBox is not available on the parentNode");
            return;
        }
       // Get the bounding box of the parent node
        const bbox = svgElement.getBBox(); // This gets the size and position of the parent node in SVG coordinates

        // Create the foreignObject element
        const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        // Set the width and height to match the parent node's size
        foreignObject.setAttribute('width', bbox.width.toString());
        foreignObject.setAttribute('height', bbox.height.toString());
        // Set the x and y positions relative to the parent node's position
        foreignObject.setAttribute('x', bbox.x.toString());
        foreignObject.setAttribute('y', bbox.y.toString());

        
        // Create the anchor element directly inside the foreignObject
        const anchor = document.createElementNS('http://www.w3.org/1999/xhtml', 'a'); 
        anchor.setAttribute('class', 'nodeLocalError');
        anchor.textContent = ''; // Deselect icon
         // Tooltip text for each node - this is where you can add the details dynamically
         anchor.setAttribute('title', nodeLocalErrorTooltip); 
        // Ensure the anchor has width and height via CSS, even with no text
        anchor.style.display = 'inline-block';
        anchor.style.width = `${bbox.width}px`;   // Give the anchor a width in pixels
        anchor.style.height = `${bbox.height}px`;  // Give the anchor a height in pixels
        anchor.style.backgroundColor = 'transparent';  // Invisible background (or use 'rgba(0,0,0,0)' if needed)

        // Append the anchor directly to the foreignObject
        foreignObject.appendChild(anchor);
        
        // Append the foreignObject to each label element in the Mermaid graph
        label.appendChild(foreignObject);
      });
      
    };

    addForeignObjectToLabels();
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
        <Tooltip anchorSelect=".nodeLocalError" place="top">
        </Tooltip>
        {/* Always render the Mermaid graph, even if localError is not ready */}
        <Mermaid chart={localError ? localErrorTreeAsMermaidGraph(localError, 64) : ''} />
        {/* Tooltip with ID "mermaid-tooltip" */}
        
        
      </div>
    </div>
  );
}
}

export { LocalError }