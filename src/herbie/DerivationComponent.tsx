import Latex from 'react-latex-next';
import * as HerbieContext from './HerbieContext';
import './DerivationComponent.css';
import { ReactNode, useEffect, useState } from 'react';
import { DerivationNode, ProofStep } from './HerbieTypes';

import KaTeX from 'katex';

import * as herbiejs from './lib/herbiejs';

// Format accuracy for display
function formatAccuracy(val: number, bits = null, unit = '%') {
  return typeof val === 'number' ? val.toFixed(1) + unit : val;
}

// Render a proof to HTML
async function renderProof(proof: ProofStep[], serverUrl: string, options = {}) {
  const proofSteps = proof
    .filter(step => step.direction !== "goal")
    .map(async (step,i) => {
      // Convert direction to human-readable form
      const dirText = step.direction === "rtl" ? "right to left" : 
                      step.direction === "ltr" ? "left to right" : "";
      
      // Format error
      const err = step.error;
      
      return (
        <li key={step.rule + "_" + i}>
          <p>
            <code title={dirText}>{step.rule}</code>
            <span className="error">{err}</span>
          </p>
          { await texFromFPCoreHTML(step.program, serverUrl) }

        </li>
      );
    });
  
  return (
    <li>
      <div className="proof">
        <details>
          <summary>Step-by-step derivation</summary>
          <ol>{await Promise.all(proofSteps)}</ol>
        </details>
      </div>
    </li>
  );
}


// Make server call to get tex version of expression
const expressionToTexFPCore = async (expression: string, serverUrl: string) => {
  try {
    const response = await herbiejs.translateFpcoreToLanguage(
      expression,
      "tex",
      serverUrl
    );

    // result starts with "exp(x) =" (all vars ", " separated), slice that off
    const pre = response.result.split('=')[0];
    return KaTeX.renderToString(response.result.slice(pre.length + 1), { throwOnError: false }
    )
  } catch (err: any) {
    if ((err as Error).toString().includes("approx")) {
      // If the error is about approx, we are still waiting for https://github.com/FPBench/FPBench/issues/145
      return "LaTeX rendering of approx nodes is not yet supported. Please try again later.";
    }
    return (err as Error).toString()
  }
};

async function texFromFPCoreHTML(expr: string, serverUrl: string): Promise<ReactNode> {
  return <div className="math" dangerouslySetInnerHTML={{
    __html: await expressionToTexFPCore(expr.replaceAll('.f64', ''), serverUrl), 
  }} />;
} 

// Render history recursively
async function renderHistory(altn: DerivationNode, options = {}, serverUrl: string): Promise<ReactNode[]> {
  const items = [];

  if (altn.type === "start") {
    // Initial program
    const err = formatAccuracy(altn.error);
    const err2 = formatAccuracy(altn["training-error"]);
    
    items.push(
      <li>
        <p>
          Initial program <span className="error" title={`${err2} on training set`}>{err}</span>
        </p>        
        { await texFromFPCoreHTML(altn.program, serverUrl) }
      </li>
    );
  }
  else if (altn.type === "add-preprocessing") {
    // Add the previous items if they exist
    if (altn.prev) {
      items.push(...await renderHistory(altn.prev, options, serverUrl));
    }
    
    // Add the preprocessing step
    items.push(<li>Add Preprocessing</li>);
  }
  else if (altn.type === "taylor") {
    // Add the previous items
    if (altn.prev) {
      items.push(...await renderHistory(altn.prev, options, serverUrl));
    }
    
    // Add Taylor expansion step
    items.push(
      <li>
        <p>Taylor expanded in {altn.var} around {altn.pt}</p>
        { await texFromFPCoreHTML(altn.program, serverUrl) }
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
      items.push(await renderProof(altn.proof, serverUrl, options));
    }
    
    // Add rewrite rule application step
    const err = formatAccuracy(altn.error);
    const err2 = formatAccuracy(altn["training-error"]);
    
    items.push(
      <li>
        <p>
          Applied rewrites<span className="error" title={`${err2} on training set`}>{err}</span>
        </p>
        { await texFromFPCoreHTML(altn.program, serverUrl) }
      </li>
    );
  }
  else if (altn.type === "regimes") {
    // For each regime, render the condition as "if ..." and then the derivation for that branch

    items.push(
      <li>
        <ol>
          {await Promise.all(altn.conditions.map(async (condition, i) => (
            <div key={i}>
              <h3 className="condition">if {condition.join(" and ")}</h3>
              <div>
                {await Promise.all(altn.prevs.map(async (prev, j) => (
                  <div key={j}>
                    {await renderHistory(prev, options, serverUrl)}
                  </div>
                )))}
              </div>
            </div>
          )))}
        </ol>
      </li>
    );
  }
  else if (altn.type === "final-simplify") {
    // Add the previous items
    if (altn.prev) {
      items.push(...await renderHistory(altn.prev, options, serverUrl));
    }
    
    // Add final simplification step
    const err = formatAccuracy(altn.error);
    const err2 = formatAccuracy(altn["training-error"]);
    
    items.push(
      <li>
        <p>Final simplification<span className="error" title={`${err2} on training set`}>{err}</span></p>
        { await texFromFPCoreHTML(altn.program, serverUrl) }
      </li>
    );
  }
  
  return items;
}

// Main component for rendering derivations
const DerivationRenderer = async (derivation: DerivationNode, serverUrl: string) => {

  return (
    <div className="container p-4 mx-auto">      
      <div className="bg-white rounded-lg p-4 shadow">
        <div id="history">
          <ol>
            {await renderHistory(
              derivation, 
              {
                formatAccuracy
              },
              serverUrl
            )}
          </ol>
        </div>
      </div>
    </div>
  );
};

const DerivationComponent = ({ expressionId }: { expressionId: number }) => {
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)
  const [body, setBody] = useState(<Latex>Loading...</Latex>);
  const [serverUrl,] = HerbieContext.useGlobal(HerbieContext.ServerContext)

  let selectedDerivation = derivations.find(d => d.id === expressionId)
  if (!selectedDerivation) {
    return <div>Could not find expression with id {expressionId}</div>
  }

  useEffect(() => {
    async function getBody() {
      const newBody = selectedDerivation?.derivation ?
        await DerivationRenderer(selectedDerivation.derivation, serverUrl) : 
        <Latex> 
          {
            selectedDerivation?.history || "No history available for this expression."
          }
        </Latex>
      setBody(newBody);
    }
    getBody();
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
        body
      }
  </div>
};

export { DerivationComponent };
