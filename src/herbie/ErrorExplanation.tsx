import React, { useEffect} from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
import { Sample } from './HerbieTypes';
import * as types from './HerbieTypes';
import { analyzeErrorExpression, ErrorExpressionResponse  } from './lib/herbiejs';
import Mermaid from './LocalError/Mermaid';

function localErrorTreeAsMermaidGraph(
    tree: types.LocalErrorTree,
    bits: number,
    currentLocation: Array<number>,
    targetLocation: Array<number>
  ) {
    let edges = [] as string[];
    let colors = {} as Record<string, string>;
    let counter = 0;
  
    const isLeaf = (n: types.LocalErrorTree) => n['children'].length === 0;
    const formatName = (id: string, name: string, err: string) =>
      id + '[<span class=nodeLocalError title=' + err + '>' + name + '</span>]';
  
    // Helper function to compare arrays
    const locationsMatch = (loc1: Array<number>, loc2: Array<number>) => 
      JSON.stringify(loc1) === JSON.stringify(loc2);
  
    function loop(n: types.LocalErrorTree, currentLoc: Array<number>) {
      const name = n['e'];
      const children = n['children'];
      const avg_error = n['avg-error'];
  
      // Create node ID
      const id = 'N' + counter++;
      const nodeName = formatName(id, name, avg_error);
  
      // Traverse the children and track their locations
      for (const [index, child] of children.entries()) {
        const childLocation = [...currentLoc, index + 1]; // Add index to current location
  
        // Check if the current child location matches the target location
        if (locationsMatch(childLocation, targetLocation)) {
          console.log(`Setting color to red for node at location: ${childLocation}`);
          colors[id] = 'ff0000'; // Red color for matched location
        }
  
        const cName = loop(child, childLocation); // Recurse with the child's location
        edges.push(cName + ' --> ' + nodeName);
      }
  
      return nodeName;
    }
  
    // Start the loop with an empty currentLocation array
    loop(tree, currentLocation);
  
    // Handle edge case where there's only one node (no edges)
    if (isLeaf(tree)) {
      const name = tree['e'];
      const avg_error = tree['avg-error'];
      edges.push(formatName('N0', name, avg_error));
    }
  
    // Add color styles to edges
    for (const id in colors) {
      edges.push('style ' + id + ' fill:#' + colors[id]);
    }
  
    return 'flowchart RL\n\n' + edges.join('\n');
  }
  

  
function ErrorExplanation({ expressionId }: { expressionId: number })  {
    // Export the expression to a language of the user's choice
    const [expressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
    const [selectedPoint] = Contexts.useGlobal(Contexts.SelectedPointContext);
    const [serverUrl] = Contexts.useGlobal(Contexts.ServerContext);
    const [spec] = Contexts.useGlobal(Contexts.SpecContext);
    // Get the expression text
    const expressionText = expressions[expressionId].text;
    
    const [errorResponse, setErrorResponse] = React.useState<ErrorExpressionResponse | null>(null);

    const [selectedPointsLocalError, ] = Contexts.useGlobal(Contexts.SelectedPointsLocalErrorContext);
    const [averageLocalErrors,] = Contexts.useGlobal(Contexts.AverageLocalErrorsContext);
    const [selectedSampleId,] = Contexts.useGlobal(Contexts.SelectedSampleIdContext);

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
    const translateExpression = async () => {

        if (selectedPoint) {
            const expressionText = expressions[expressionId].text;
            const vars = fpcorejs.getVarnamesMathJS(expressionText);
            const specVars = fpcorejs.getVarnamesMathJS(spec.expression);
            const modSelectedPoint = selectedPoint.filter((xi, i) => vars.includes(specVars[i]));

            // Make server call to get translation when user submits
            try {
                const host = serverUrl;
                const response = await analyzeErrorExpression(
                    fpcorejs.mathjsToFPCore(expressionText),
                    { points: [[modSelectedPoint, 1e308]] } as Sample,
                    host
                );
                setErrorResponse(response);

            } catch (error) {
                console.error('Error:', error);
            }
        }
    };

    useEffect(() => {
        setErrorResponse(null);
        translateExpression();
    }, [expressionId, selectedPoint]);

    return (<div>
        {/* Display the export code */}
        {errorResponse && errorResponse.explanation.length >0 ? (
            <div>
                <p>Operator: {errorResponse.explanation[0][0]}</p>
                <p>Expression: {errorResponse.explanation[0][1]}</p>
                <p>Type: {errorResponse.explanation[0][2]}</p>
                <p>Occurrences: {errorResponse.explanation[0][3]}</p>
                <p>Errors: {errorResponse.explanation[0][4]}</p>
                <pre>Details: {JSON.stringify(errorResponse.explanation[0][5], null, 2)}</pre>
            </div>
        ) : (
            <p>No explanation available.</p>
        )}
        <div className="local-error-graph">
        <Mermaid chart={localErrorTreeAsMermaidGraph(localError, 64,[],[1,1])}  />
      </div>
    </div>
    );
};

export default ErrorExplanation;
