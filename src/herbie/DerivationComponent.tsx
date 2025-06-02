import Latex from 'react-latex-next';
import * as HerbieContext from './HerbieContext';
import './DerivationComponent.css';
import { ReactNode, useEffect } from 'react';
import { DerivationNode, ProofStep } from './HerbieTypes';
import ReactDOMServer from 'react-dom/server';
import KaTeX from 'katex';
import { expressionToTex } from './ExpressionTable';
import * as fpcorejs from './lib/fpcore'

// Function to convert FPCore to TeX (simplified version)
function fpCoreToTeX(expr: string, options?: { loc: any; color: any; }) {
  // Handle colored output for specific locations if provided
  if (options && options.loc && options.loc.length > 0 && options.color) {
    // This is a simplified approach - a real implementation would navigate to the specific location
    // and wrap just that part in color
    return `\\color{${options.color}}{${
      expr
        .replace(/\(FPCore \(x\)\s+/g, '')
        .replace(/\)\)/g, '}')
        .replace(/\(\-\.f64/g, '(')
        .replace(/\(\+\.f64/g, '(')
        .replace(/\(\/\.f64/g, '\\frac{')
        .replace(/\(sqrt\.f64 \(\+\.f64 x 1\)\)/g, '\\sqrt{x + 1}')
        .replace(/\(sqrt\.f64 \(\+\.f64 1 x\)\)/g, '\\sqrt{1 + x}')
        .replace(/\(sqrt\.f64 x\)/g, '\\sqrt{x}')
        .replace(/\#s\(approx \(- \(\+ 1 x\) x\) 1\)/g, '1')
        .replace(/\(\+\.f64 1 x\)/g, '(1 + x)')
    }}`;
  }
  
  // Basic conversion (highly simplified)
  return expr
    .replace(/\(FPCore \(x\)\s+/g, '')
    .replace(/\)\)/g, '}')
    .replace(/\(\-\.f64/g, '(')
    .replace(/\(\+\.f64/g, '(')
    .replace(/\(\/\.f64/g, '\\frac{')
    .replace(/\(sqrt\.f64 \(\+\.f64 x 1\)\)/g, '\\sqrt{x + 1}')
    .replace(/\(sqrt\.f64 \(\+\.f64 1 x\)\)/g, '\\sqrt{1 + x}')
    .replace(/\(sqrt\.f64 x\)/g, '\\sqrt{x}')
    .replace(/\#s\(approx \(- \(\+ 1 x\) x\) 1\)/g, '1')
    .replace(/\(\+\.f64 1 x\)/g, '(1 + x)');
}

// Format accuracy for display
function formatAccuracy(val: number, bits = null, unit = '%') {
  return typeof val === 'number' ? val.toFixed(1) + unit : val;
}

// Render a proof to HTML
function renderProof(proof: ProofStep[], options = {}) {
  const proofSteps = proof
    .filter(step => step.direction !== "goal")
    .map(step => {
      // Convert direction to human-readable form
      const dirText = step.direction === "rtl" ? "right to left" : 
                      step.direction === "ltr" ? "left to right" : "";
      
      // Format error
      const err = step.error;
      
      return (
        <li key={step.rule + Math.random()}>
          <p>
            <code title={dirText}>{step.rule}</code>
            <span className="error">{err}</span>
          </p>
          <div className="math" dangerouslySetInnerHTML={{ 
            __html: `\\[\\leadsto ${fpCoreToTeX(step.program, { 
              loc: step.loc, 
              color: "blue" 
            })}\\]` 
          }} />
        </li>
      );
    });
  
  return (
    <li>
      <div className="proof">
        <details>
          <summary>Step-by-step derivation</summary>
          <ol>{proofSteps}</ol>
        </details>
      </div>
    </li>
  );
}


// Render history recursively
async function renderHistory(altn: DerivationNode, options = {}, serverUrl: string): Promise<ReactNode[]> {
  const items = [];

  if (altn.type === "start") {
    // Initial program
    const err = formatAccuracy(altn.error);
    const err2 = formatAccuracy(altn["training-error"]);
    
    items.push(
      <li key="start">
        <p>
          Initial program <span className="error" title={`${err2} on training set`}>{err}</span>
        </p>        
        <div className="math" dangerouslySetInnerHTML={{
            //__html:  KaTeX.renderToString(`\\[${fpCoreToTeX(altn.program)}\\]`, { throwOnError: false })
            __html:  KaTeX.renderToString(
              await expressionToTex(altn.program, fpcorejs.getVarnamesMathJS(altn.program).length, serverUrl), { throwOnError: false }
            )
          }}
        />
        await expressionToTex(expression, fpcorejs.getVarnamesMathJS(expression).length, serverUrl)
      </li>
    );
  }
  else if (altn.type === "add-preprocessing") {
    // Add the previous items if they exist
    if (altn.prev) {
      items.push(...await renderHistory(altn.prev, options, serverUrl));
    }
    
    // Add the preprocessing step
    items.push(<li key="preprocess">Add Preprocessing</li>);
  }
  else if (altn.type === "taylor") {
    // Add the previous items
    if (altn.prev) {
      items.push(...await renderHistory(altn.prev, options, serverUrl));
    }
    
    // Add Taylor expansion step
    items.push(
      <li key="taylor">
        <p>Taylor expanded in {altn.var} around {altn.pt}</p>
        <Latex>     
          {
            ReactDOMServer.renderToString(
              <div className="math" dangerouslySetInnerHTML={{ 
                __html: `\\[\\leadsto ${fpCoreToTeX(altn.program, { 
                  loc: altn.loc, 
                  color: "blue" 
                })}\\]` 
              }} />
            )
          }
        </Latex>
      </li>
    );
  }
  else if (altn.type === "rr") {
    // Add the previous items
    if (altn.prev) {
      items.push(...await renderHistory(altn.prev, options, serverUrl));
    }
    
    // Add proof if it exists
    if (altn.proof && altn.proof.length > 0) {
      items.push(renderProof(altn.proof, options));
    }
    
    // Add rewrite rule application step
    const err = formatAccuracy(altn.error);
    const err2 = formatAccuracy(altn["training-error"]);
    
    items.push(
      <li key="rr">
        <p>
          Applied rewrites<span className="error" title={`${err2} on training set`}>{err}</span>
        </p>
        <div className="math" dangerouslySetInnerHTML={{ 
          __html: `\\[\\leadsto ${fpCoreToTeX(altn.program, { 
            loc: altn.loc, 
            color: "blue" 
          })}\\]` 
        }} />
      </li>
    );
  }
  
  return items;
}

// Main component for rendering derivations
const DerivationRenderer = (derivation: DerivationNode) => {
  const [serverUrl,] = HerbieContext.useGlobal(HerbieContext.ServerContext)

  // // Example JSON data
  // const exampleDerivation: DerivationNode = {
  //   "error": 0.16362048906511412,
  //   "preprocessing": [],
  //   "prev": {
  //     "error": 0.16362048906511412,
  //     "loc": [1],
  //     "prev": {
  //       "error": "N/A",
  //       "loc": [1],
  //       "prev": {
  //         "error": 29.28147582053326,
  //         "loc": [],
  //         "prev": {
  //           "error": 29.900400659788048,
  //           "preprocessing": [],
  //           "prev": {
  //             "error": 29.900400659788048,
  //             "program": "(FPCore (x) (-.f64 (sqrt.f64 (+.f64 x 1)) (sqrt.f64 x)))",
  //             "training-error": 29.900400659788048,
  //             "type": "start"
  //           },
  //           "program": "(FPCore (x) (-.f64 (sqrt.f64 (+.f64 x 1)) (sqrt.f64 x)))",
  //           "training-error": 29.900400659788048,
  //           "type": "add-preprocessing"
  //         },
  //         "program": "(FPCore (x)\n (/.f64 (-.f64 (+.f64 1 x) x) (+.f64 (sqrt.f64 x) (sqrt.f64 (+.f64 1 x)))))",
  //         "proof": [
  //           {
  //             "direction": "goal",
  //             "error": 29.900400659788048,
  //             "loc": [],
  //             "program": "(FPCore (x) (-.f64 (sqrt.f64 (+.f64 x 1)) (sqrt.f64 x)))",
  //             "rule": "#f",
  //             "tag": " ↑ 0 ↓ 0"
  //           },
  //           {
  //             "direction": "ltr",
  //             "error": "N/A",
  //             "loc": [],
  //             "program": "(FPCore (x) (- (sqrt.f64 (+.f64 x 1)) (sqrt.f64 x)))",
  //             "rule": "lift--.f64",
  //             "tag": " ↑ N/A ↓ N/A"
  //           },
  //           {
  //             "direction": "ltr",
  //             "error": "N/A",
  //             "loc": [],
  //             "program": "(FPCore (x)\n (/\n  (-\n   (* (sqrt.f64 (+.f64 x 1)) (sqrt.f64 (+.f64 x 1)))\n   (* (sqrt.f64 x) (sqrt.f64 x)))\n  (+ (sqrt.f64 (+.f64 x 1)) (sqrt.f64 x))))",
  //             "rule": "flip--",
  //             "tag": " ↑ N/A ↓ N/A"
  //           }
  //         ],
  //         "training-error": 29.28147582053326,
  //         "type": "rr"
  //       },
  //       "program": "(FPCore (x) (/.f64 1 (+.f64 (sqrt.f64 x) (sqrt.f64 (+.f64 1 x)))))",
  //       "pt": "0",
  //       "training-error": "N/A",
  //       "type": "taylor",
  //       "var": "x"
  //     },
  //     "program": "(FPCore (x)\n (/.f64\n  #s(approx (- (+ 1 x) x) 1)\n  (+.f64 (sqrt.f64 x) (sqrt.f64 (+.f64 1 x)))))",
  //     "proof": [
  //       {
  //         "direction": "goal",
  //         "error": 0.16362048906511412,
  //         "loc": [],
  //         "program": "(FPCore (x) (/.f64 1 (+.f64 (sqrt.f64 x) (sqrt.f64 (+.f64 1 x)))))",
  //         "rule": "#f",
  //         "tag": " ↑ 0 ↓ 0"
  //       }
  //     ],
  //     "training-error": 0.16362048906511412,
  //     "type": "rr"
  //   },
  //   "program": "(FPCore (x)\n (/.f64\n  #s(approx (- (+ 1 x) x) 1)\n  (+.f64 (sqrt.f64 x) (sqrt.f64 (+.f64 1 x)))))",
  //   "training-error": 0.16362048906511412,
  //   "type": "add-preprocessing"
  // };

  return (
    <div className="container p-4 mx-auto">
      <h1 className="text-2xl font-bold mb-4">Floating-Point Expression Optimization</h1>
      
      <div className="bg-white rounded-lg p-4 shadow">
        <div id="history">
          <ol>
            {await renderHistory(
              derivation, 
              {
                fpCoreToTeX,
                formatAccuracy
              },
              serverUrl
            )}
          </ol>
        </div>
      </div>
      
      <style>{`
        .math {
          overflow-x: auto;
        }
        .error {
          margin-left: 0.5rem;
          color: #4299e1;
          cursor: help;
        }
        .proof {
          margin: 0.5rem 0;
        }
        details summary {
          cursor: pointer;
          color: #4a5568;
          font-weight: 500;
        }
        .condition {
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

const DerivationComponent = ({ expressionId }: { expressionId: number }) => {
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)

  let selectedDerivation = derivations.find(d => d.id === expressionId)
  if (!selectedDerivation) {
    return <div>Could not find expression with id {expressionId}</div>
  }

  useEffect(() => {
    async function() {
      selectedDerivation?.derivation ?
      await DerivationRenderer(selectedDerivation.derivation) : 
      <Latex> 
        {
          selectedDerivation.history
        }
      </Latex>
    }
  }, []);

  let currentExpressionId: number | undefined = selectedDerivation.id
  let expressionAncestry = []

  // While the current expression is a root expression
  while (currentExpressionId !== undefined) {
    // Find its parent
    const nextDerivation = derivations.find(d => d.id === currentExpressionId)

    // If parent is not found, break
    if (nextDerivation === undefined) {
      break
    }

    // Otherwise, add it to the ancestry
    expressionAncestry.push(nextDerivation.id)

    // Examine the parent as the next expression
    currentExpressionId = nextDerivation.origExpId
  }

  return <div>
      {
        selectedDerivation.derivation ?
        await DerivationRenderer(selectedDerivation.derivation) : 
        <Latex> 
          {
            selectedDerivation.history
          }
        </Latex>
      }
  </div>
};

export { DerivationComponent };
