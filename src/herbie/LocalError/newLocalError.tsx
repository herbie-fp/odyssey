import React, { useState, useEffect } from "react";
import * as HerbieContext from "../HerbieContext";
import * as herbiejs from '../lib/herbiejs';
import { LocalErrorTree } from "../HerbieTypes";
import "./newLocalError.css";

import { Tooltip } from "react-tooltip";

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

type LocalErrorTreeWithExplanation = LocalErrorTree & { explanation?: string, path?: number[] };

let valueId = 0;

function TreeRow({
  node,
  depth,
  currentPath,
  errorPaths,
}: {
  node: LocalErrorTreeWithExplanation;
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
    valueId += 1;
    const num = parseFloat(value);
    if (isNaN(num)) {return value;}
    return <>
      <span className="number-value"
        data-tooltip-id= {`value-tooltip-${valueId}`}
      >
      {herbiejs.displayNumber(num)}
      </span>
      <Tooltip id={`value-tooltip-${valueId}`}>
        {num.toString()}
      </Tooltip>
      </>
  }

  const isHighError = parseFloat(node["percent-accuracy"]) < 50;
  const hasError = parseFloat(node["percent-accuracy"]) < 99.9;

  const rowClassName = isHighError ? "has-error high-error" : hasError ? "has-error" : "";

  return (
    <>
      <tr className={ rowClassName }>
        <td className="program-col">
          <span
            style={{ marginLeft: `0px`, cursor: "pointer" }}
            onClick={() => setIsExpanded(prev => !prev)}
          >
            {/* Show pipe lines for folding  */}
            {depth > 0 && (
              <span className="pipe-lines" style={{ marginRight: '5px' }}>
                {Array(depth).fill(null).map((_, i) => (
                  <span key={i} className="pipe-line" style={{ height: '20px', borderLeft: '1px solid gray', marginLeft: `${7.5 + (i > 0 ? 5 : 0) }px` }}></span>
                ))}
              </span>
            )}
            {node.children.length > 0 ? (
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
            ) : (<span style={{ width: '7px' , display: 'inline-block'}}></span>)}
            <div style={{
              display: "inline-block",
            }}>
              {isExpanded ? mapOp(node.e) : collapsedExpression}
            </div>
          </span>
        </td>
        <td>{renderValue(node["exact-value"])}</td>
        <td>{renderValue(node["actual-value"])}</td>
        <td>{renderValue(node["abs-error-difference"])}</td>
        <td className="accuracy-col">
          <span>
          {parseFloat(node["percent-accuracy"]).toFixed(1)}%
          </span>
        </td>
        <td className="explanation">
          {node.explanation ?
            node.explanation === "cancellation" ? (
              <a href="https://en.wikipedia.org/wiki/Catastrophic_cancellation" target="_blank" rel="noopener noreferrer">
                <span className="explanation-link" title="Click for more information about this error type">
                  {node.explanation}
                </span>
              </a>
            ) : 
            node.explanation === "oflow-rescue" ? (
                <a href="https://en.wikipedia.org/wiki/Floating-point_arithmetic#:~:text=including%20the%20zeros.-,overflow,-%2C%20set%20if%20the" target="_blank" rel="noopener noreferrer">
                <span className="explanation-link" title="Click for more information about this error type">
                  {node.explanation}
                </span>
              </a>
              ) :
                // TODO handle other explanations
                (
            <span className="explanation">
              {node.explanation}
            </span>
          ) : (
            <span className="no-explanation"></span>
          )}
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

// Applies a function on a tree structure, providing a current path
// in the tree as [] for the root, [1] for the first child, [[1, 2]] for the second child of the first child, etc.
function treeMapWithPath<T, U>(
  tree: T,
  fn: (node: T, path: number[]) => U,
  getChildren: (node: T) => T[] | undefined,
  path: number[] = []
): U {
  const result = fn(tree, path);
  const children = getChildren(tree);
  
  if (children) {
    children.forEach((child, index) => {
      treeMapWithPath(child, fn, getChildren, [...path, index+1]);
    });
  }
  
  return result;
}

function NewLocalError({ expressionId }: { expressionId: number }) {
  const [selectedPoint] = HerbieContext.useGlobal(HerbieContext.SelectedPointContext);
  const [selectedPointsLocalError] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
  const [localError, setLocalError] = useState<LocalErrorTree | null>(null);
  const [errorPaths, setErrorPaths] = useState<number[][]>([]);
  const [selectedPointsErrorExp,] = HerbieContext.useGlobal(HerbieContext.SelectedPointsErrorExpContext);
  
  const pointErrorExp = selectedPointsErrorExp.find(a => a.expressionId === expressionId)?.error;

  // TODO we probably don't need these useState hooks, we can just use the context directly
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

  if (!selectedPoint) {
    return (
      <div className="not-computed">
        <div><strong>Select a single point</strong> on the Local Error Plot to the left to compute subexpression error.</div>
      </div>
    );
  }

  if (!localError || !pointErrorExp
  ) {
    return (
      <div className="loading">
        <div>Loading...</div>
      </div>
    );
  }
  console.log("pointErrorExp", pointErrorExp)
  const explanations = pointErrorExp.explanation.map(e => e[2]);
  const explanationPaths = pointErrorExp.explanation.map(e => e[6][0]);
  console.log(explanations, explanationPaths);

  // For each node in the local error tree, attach its explanation if it exists
  const localErrorWithExplanations = treeMapWithPath(localError as LocalErrorTreeWithExplanation, (node, path) => {
    // Find the explanation for this node, if it exists
    const explanationIndex = explanationPaths.findIndex(ep => 
      ep.length === path.length &&
      ep.join(',') === path.join(',')
    );
    node.explanation = explanationIndex !== -1 ? explanations[explanationIndex] : undefined;
    return node;
  }, (node) => node.children);

  const hasNoExplanations = explanationPaths.length === 0
  
  // InfoIcon component for consistent tooltips
  const InfoIcon = ({ tooltipId, tooltipContent }: { tooltipId: string, tooltipContent: string }) => (
    <>
      <span 
        data-tooltip-id={tooltipId} 
        data-tooltip-content={tooltipContent}
        style={{ marginLeft: '4px', cursor: 'help', color: 'var(--action-color)' }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
          <text x="12" y="16" textAnchor="middle" fontSize="12" fontWeight="bold">i</text>
        </svg>
      </span>
      <Tooltip id={tooltipId} />
    </>
  );

  return (
    <div className={`local-error ${hasNoExplanations ? ' no-explanations' : ''}`}>
      <table>
        <thead>
          <tr>
            <th className="program-col">Program</th>
            <th>R Value
              <InfoIcon tooltipId="r-value-tooltip" tooltipContent="The exact value computed using infinite precision arithmetic" />
            </th>
            <th>FP Value
              <InfoIcon tooltipId="fp-value-tooltip" tooltipContent="The actual computed value using floating-point arithmetic" />
            </th>
            <th>Difference
              <InfoIcon tooltipId="difference-tooltip" tooltipContent="The absolute difference between the exact (R) and floating-point (FP) values" />
            </th>
            <th>Accuracy
              <InfoIcon tooltipId="accuracy-tooltip" tooltipContent="Percentage accuracy of the floating-point computation compared to the exact result" />
            </th>
            <th className="explanation">Explanation
              <InfoIcon tooltipId="explanation-tooltip" tooltipContent="An explanation code, if there is significant error" />
            </th>
          </tr>
        </thead>
        <tbody>
          <TreeRow node={localErrorWithExplanations} depth={0} currentPath={[]} errorPaths={errorPaths} />
        </tbody>
      </table>
    </div>
  );
}

export default NewLocalError;
