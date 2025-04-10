import React, { useState, useEffect } from "react";
import * as HerbieContext from "../HerbieContext";
import { LocalErrorTree } from "../HerbieTypes";
import "./newLocalError.css";

function formatExpression(node: LocalErrorTree): string {
  if (!node.children || node.children.length === 0) {
    return node.e; // Single variable or number
  }
  
  if (node.e === "sqrt" || node.e === "pow" || node.e === "log") {
    return `${node.e}(${node.children.map(child => formatExpression(child)).join(", ")})`;
  }

  if (node.children.length === 2) {
    return `(${formatExpression(node.children[0])} ${node.e} ${formatExpression(node.children[1])})`;
  }

  return `${node.e}(${node.children.map(child => formatExpression(child)).join(", ")})`;
}

function TreeRow({ node, depth }: { node: LocalErrorTree; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const collapsedExpression = formatExpression(node);

  return (
    <>
      <tr>
        <td className="border px-4 py-2 program-col">
          <span style={{ marginLeft: `${depth * 15}px`, cursor: "pointer" }} onClick={() => setIsExpanded(!isExpanded)}>
            {node.children.length > 0 && (
              <button className="toggle-button">
                {isExpanded ? "➖" : "➕"}
              </button>
            )}
            {isExpanded ? node.e : collapsedExpression}
          </span>
        </td>
        <td className="border px-4 py-2">{parseFloat(node["actual-value"]).toFixed(1)}</td>
        <td className="border px-4 py-2">{parseFloat(node["exact-value"]).toFixed(1)}</td>
        <td className="border px-4 py-2">{parseFloat(node["abs-error-difference"]).toFixed(1)}</td>
        <td className="border px-4 py-2">{parseFloat(node["percent-accuracy"]).toFixed(1)}%</td>
        <td className="border px-4 py-2">
          <span className={`local-error ${parseFloat(node["percent-accuracy"]) < 100 ? "high-error" : ""}`}>
          {parseFloat(node["ulps-error"]).toFixed(1)}
          </span>
        </td>
      </tr>

      {isExpanded &&
        node.children.map((child, index) => <TreeRow key={index} node={child} depth={depth + 1} />)}
    </>
  );
}

function NewLocalError({ expressionId }: { expressionId: number }) {
  const [selectedPointsLocalError] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
  const [localError, setLocalError] = useState<LocalErrorTree | null>(null);

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
            <th className="border px-4 py-2 text-left program-col">Program</th>
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
