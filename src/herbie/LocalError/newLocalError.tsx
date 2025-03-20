import React, { useState, useEffect } from "react";
import * as HerbieContext from '../HerbieContext';
import { LocalErrorTree } from "../HerbieTypes";
import "./NewLocalError.css";

function TreeRow({ node, depth }: { node: LocalErrorTree; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <>
      <tr>
        <td className="border px-4 py-2">
          <span style={{ marginLeft: `${depth * 15}px` }}>
            {node.children.length > 0 && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="toggle-button">
                {isExpanded ? "➖" : "➕"}
              </button>
            )}
            {node.e}
          </span>
        </td>
        <td className="border px-4 py-2">{node["actual-value"]}</td>
        <td className="border px-4 py-2">{node["exact-value"]}</td>
        <td className="border px-4 py-2">{node["abs-error-difference"]}</td>
        <td className="border px-4 py-2">{node["percent-accuracy"]}%</td>
        <td className="border px-4 py-2">
          <span className={`local-error ${parseFloat(node["percent-accuracy"]) < 50 ? "high-error" : ""}`}>
            {node["ulps-error"]}
          </span>
        </td>
      </tr>

      {isExpanded &&
        node.children.map((child, index) => <TreeRow key={index} node={child} depth={depth + 1} />)}
    </>
  );
}
function NewLocalError({ expressionId }: { expressionId: number }) {
  const [selectedPoint, ] = HerbieContext.useGlobal(HerbieContext.SelectedPointContext);
  const [selectedPointsLocalError, ] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
  const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext);
  const [averageLocalErrors,] = HerbieContext.useGlobal(HerbieContext.AverageLocalErrorsContext);
  const [localError, setLocalError] = useState<LocalErrorTree | null>(null);

 // Get local error specific to the given expressionId
 useEffect(() => {
  const pointLocalError = selectedPointsLocalError.find(
    (a) => a.expressionId === expressionId
  )?.error;

  setLocalError(pointLocalError || null);
}, [selectedPointsLocalError, expressionId]);

if (!localError) {
  return (
    <div className="local-error not-computed">
      <div>No local error computed for this expression. Select a point to compute.</div>
    </div>
  );
}

return (
  <div className="overflow-x-auto p-4">
    <table className="min-w-full border border-gray-300 bg-white">
      <thead className="bg-gray-100">
        <tr>
          <th className="border px-4 py-2 text-left">Program</th>
          <th className="border px-4 py-2 text-left">R Value</th>
          <th className="border px-4 py-2 text-left">FP Value</th>
          <th className="border px-4 py-2 text-left">Difference</th>
          <th className="border px-4 py-2 text-left">Accuracy</th>
          <th className="border px-4 py-2 text-left">Local Error</th>
        </tr>
      </thead>
      <tbody>
        <TreeRow node={localError} depth={0} />
      </tbody>
    </table>
  </div>
);
}

export default NewLocalError;