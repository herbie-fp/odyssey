import React, { useState, useEffect } from "react";
import * as HerbieContext from "../HerbieContext";
import * as herbiejs from '../lib/herbiejs';
import { LocalErrorTree } from "../HerbieTypes";
import "./newLocalError.css";

const opMap: Record<string,string> = {
  "+": "add (+)",
  "-": "subtract (-)",
  "*": "multiply (*)",
  "/": "divide (/)",
};

function mapOp(e: string) {
  return opMap[e] ?? e;
}

function formatExpression(node: LocalErrorTree): string {
  const expr = mapOp(node.e);
  if (!node.children || node.children.length === 0) {
    // return node.e;
    return expr;
    
  }
  if (["sqrt", "pow", "log"].includes(node.e)) {
    return `${node.e}(${node.children.map(formatExpression).join(", ")})`;
  }
  if (node.children.length === 2) {
    return `(${formatExpression(node.children[0])} ${node.e} ${formatExpression(node.children[1])})`;
  }
  return `${node.e}(${node.children.map(formatExpression).join(", ")})`;
}

// Only find error paths if node is not an "if" with R == FP
function findAllErrorPaths(node: LocalErrorTree, path: number[] = []): number[][] {
  const paths: number[][] = [];

  const rValue = node["actual-value"];
  const fpValue = node["exact-value"];

  // If this is an "if" node and R == FP, do not collect its error or go deeper
  if (node.e === "if" && rValue === fpValue) {
    return paths; // Skip collecting errors under this
  }

  const errorValue = parseFloat(node["ulps-error"]);
  if (!isNaN(errorValue) && errorValue !== 0) {
    paths.push(path);
  }

  node.children.forEach((child, index) => {
    paths.push(...findAllErrorPaths(child, [...path, index]));
  });

  return paths;
}

function shouldExpand(currentPath: number[], allErrorPaths: number[][]): boolean {
  return allErrorPaths.some(errorPath =>
    currentPath.every((val, index) => errorPath[index] === val)
  );
}

function TreeRow({
  node,
  depth,
  currentPath,
  errorPaths,
}: {
  node: LocalErrorTree;
  depth: number;
  currentPath: number[];
  errorPaths: number[][];
}) {
  const [isExpanded, setIsExpanded] = useState(() =>
    shouldExpand(currentPath, errorPaths)
  );
  const collapsedExpression = formatExpression(node);

  function renderValue(value: any) {
    if (value === "true" || value === "false") {
      return value;
    }
    const num = parseFloat(value);
    if (isNaN(num)) {return value;}
    return herbiejs.displayNumber(num);
  }

  const isHighError = parseFloat(node["percent-accuracy"]) < 50;
  const hasError = parseFloat(node["percent-accuracy"]) < 99.9;

  const rowClassName = isHighError ? "has-error high-error" : hasError ? "has-error" : "";

  return (
    <>
      <tr className={ rowClassName }>
        <td className="border px-4 py-2 program-col">
          <span
            style={{ marginLeft: `${depth * 15}px`, cursor: "pointer" }}
            onClick={() => setIsExpanded(prev => !prev)}
          >
            {node.children.length > 0 && (
              <span className="toggle-button">
                {isExpanded ? (
                  <svg
                    style={{ width: '15px', stroke: "var(--action-color)", transform: "rotate(180deg)", verticalAlign: "middle" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M6 9L12 15L18 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg
                    style={{ width: '15px', stroke: "var(--action-color)", verticalAlign: "middle" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M6 9L12 15L18 9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            )}
            {isExpanded ? mapOp(node.e) : collapsedExpression}
          </span>
        </td>
        <td>{renderValue(node["actual-value"])}</td>
        <td>{renderValue(node["exact-value"])}</td>
        <td>{renderValue(node["abs-error-difference"])}</td>
        <td className="accuracy-col">
          {parseFloat(node["percent-accuracy"]).toFixed(1)}%
        </td>
        {/* <td>
          <span >
            {parseFloat(node["ulps-error"]).toFixed(1)}
          </span>
        </td> */}
      </tr>

      {isExpanded &&
        node.children.map((child, index) => (
          <TreeRow
            key={index}
            node={child}
            depth={depth + 1}
            currentPath={[...currentPath, index]}
            errorPaths={errorPaths}
          />
        ))}
    </>
  );
}

function NewLocalError({ expressionId }: { expressionId: number }) {
  const [selectedPointsLocalError] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
  const [localError, setLocalError] = useState<LocalErrorTree | null>(null);
  const [errorPaths, setErrorPaths] = useState<number[][]>([]);

  useEffect(() => {
    const pointLocalError = selectedPointsLocalError.find(
      (a) => a.expressionId === expressionId
    )?.error;

    if (pointLocalError) {
      setLocalError(pointLocalError);
      setErrorPaths(findAllErrorPaths(pointLocalError));
    } else {
      setLocalError(null);
    }
  }, [selectedPointsLocalError, expressionId]);

  if (!localError) {
    return (
      <div className="not-computed">
        <div>No local error computed for this expression. Select a point to compute.</div>
      </div>
    );
  }

  return (
    <div className="local-error">
      <table>
        <thead>
          <tr>
            <th className="program-col">Program</th>
            <th>R Value</th>
            <th>FP Value</th>
            <th title="Difference between R and FP values" >
              Difference
            </th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          <TreeRow node={localError} depth={0} currentPath={[]} errorPaths={errorPaths} />
        </tbody>
      </table>
    </div>
  );
}

export default NewLocalError;
