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
  currentLocation: Array<number>,
  targetLocation: Array<number>
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

    for (const [index, child] of children.entries()) {
      const childLocation = [...currentLoc, index + 1];

      if (locationsMatch(childLocation, targetLocation)) {
        console.log(`Setting color to red for node at location: ${childLocation}`);
        colors[id] = 'ff0000';
      }

      const cName = loop(child, childLocation);
      edges.push(cName + ' --> ' + nodeName);
    }

    return nodeName;
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
        <Mermaid chart={localErrorTreeAsMermaidGraph(localError, 64, [], [1])} />
      </div>
    </div>
  );
};

export default ErrorExplanation;