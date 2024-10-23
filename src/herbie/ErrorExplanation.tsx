import React, { useEffect } from 'react';
import * as HerbieContext from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
import { Sample } from './HerbieTypes';
import * as types from './HerbieTypes';
import { analyzeErrorExpression} from './lib/herbiejs';
import{ErrorExpressionResponse, } from './HerbieTypes'
import Mermaid from './LocalError/Mermaid';

function localErrorTreeAsMermaidGraph(
  tree: types.LocalErrorTree,
  bits: number,
  currentLocation: Array<number>,  // Adjusted to match the structure [[1], [1,1]]
  targetLocation: Array<number>    // Adjusted to match the structure [[1], [1,1]]
) {
  let edges = [] as string[];
  let colors = {} as Record<string, string>;
  let counter = 0;

  const isLeaf = (n: types.LocalErrorTree) => n['children'].length === 0;
  const formatName = (id: string, name: string, err: string) =>
    id + '[<span class=nodeLocalError title=' + err + '>' + name + '</span>]';

  const locationsMatch = (loc1: Array<number>, loc2: Array<number>) =>
    JSON.stringify(loc1) === JSON.stringify(loc2);

  function loop(n: types.LocalErrorTree, currentLoc: Array<number>) {
    const name = n['e'];
    const children = n['children'];
    const avg_error = n['avg-error'];
  
    const id = 'N' + counter++;
    const nodeName = formatName(id, name, avg_error);
  
    console.log("target", targetLocation);
    console.log("current:", currentLoc);
  
    // Check if the current location matches the target location
    if (locationsMatch(currentLoc, targetLocation)) {
      console.log(`Setting color to red for node at location: ${currentLoc}`);
      colors[id] = 'ff0000';  // Set the color to red for matching location
    }
  
    // Iterate through the children of the current node
    for (const [index, child] of children.entries()) {
      // Append the current index to the current location array, starting from [1] for each child
      const childLocation = [...currentLoc, index + 1]; // Simply append index + 1 to the currentLoc array
  
      // Recursive call for the child node
      const cName = loop(child, childLocation);
  
      // Push the connection between the child node and the current node
      edges.push(cName + ' --> ' + nodeName);
    }
  
    return nodeName;  // Return the formatted name of the current node
  }
  

  loop(tree, currentLocation);

  if (isLeaf(tree)) {
    const name = tree['e'];
    const avg_error = tree['avg-error'];
    edges.push(formatName('N0', name, avg_error));
  }

  for (const id in colors) {
    edges.push('style ' + id + ' fill:#' + colors[id]);
  }

  return 'flowchart RL\n\n' + edges.join('\n');
}

interface ErrorExplanationProps {
  expressionId: number;
}

function ErrorExplanation({ expressionId }: { expressionId: number }){
  const [expressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext);
  const [selectedPoint] = HerbieContext.useGlobal(HerbieContext.SelectedPointContext);
  const [errorResponse, setErrorResponse] = React.useState<ErrorExpressionResponse | null>(null);
  const [selectedPointsLocalError] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
  const [selectedPointsErrorExp, ] = HerbieContext.useGlobal(HerbieContext.SelectedPointsErrorExpContext);
  const [averageLocalErrors] = HerbieContext.useGlobal(HerbieContext.AverageLocalErrorsContext);
  const [selectedSampleId] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext);

  const pointLocalError = selectedPointsLocalError.find(a => a.expressionId === expressionId)?.error;
  
  console.log(selectedPointsErrorExp)
  const localError = selectedPoint && pointLocalError
    ? pointLocalError
    : averageLocalErrors.find((localError) => localError.sampleId === selectedSampleId && localError.expressionId === expressionId)?.errorTree;

  
  // Use useEffect to update the errorResponse state
  useEffect(() => {
    console.log(expressionId)
    console.log(expressions[expressionId].text)
    const pointErrorExp = selectedPointsErrorExp.find(a => a.expressionId === expressionId)?.error;
    setErrorResponse(pointErrorExp || null); // If pointErrorExp is undefined, set null
  }, [selectedPointsErrorExp]);  // Run this effect whenever pointErrorExp changes



  if (!localError) {
    return (
      <div className="local-error not-computed">
        <div>Please select a point on the error plot to compute local error.</div>
      </div>
    );
  }

  return (
    <div>
      {errorResponse && errorResponse.explanation.length > 0 ? (
        // <><div>
        //   <p>Operator: {errorResponse.explanation[0][0]}</p>
        //   <p>Expression: {errorResponse.explanation[0][1]}</p>
        //   <p>Type: {errorResponse.explanation[0][2]}</p>
        //   <p>Occurrences: {errorResponse.explanation[0][3]}</p>
        //   <p>Errors: {errorResponse.explanation[0][4]}</p>
        //   <pre>Details: {JSON.stringify(errorResponse.explanation[0][5], null, 2)}</pre>
        // </div>
        <div className="local-error-graph">
            <Mermaid chart={localErrorTreeAsMermaidGraph(localError, 64, [], errorResponse.explanation[0][6][0])} />
          </div>
      ) : (
        <><p>No explanation available.</p><div className="local-error-graph">
            <Mermaid chart={localErrorTreeAsMermaidGraph(localError, 64, [], [-1])} />
          </div></>
      )}
      
    </div>
  );
};

export default ErrorExplanation;