import { useEffect, useState } from 'react';
import { Derivation, Expression } from './HerbieTypes';
import * as HerbieContext from './HerbieContext';
import { nextId } from './lib/utils'
import { SelectableVisualization } from './SelectableVisualization';
import { Tooltip } from 'react-tooltip'
import * as herbiejsImport from './lib/herbiejs'
import * as fpcore from './lib/fpcore'
import { LocalError } from './LocalError/LocalError';
import { DerivationComponent } from './DerivationComponent';
import { FPTaylorComponent } from './FPTaylorComponent';
import ExpressionExport from './ExpressionExport';
import KaTeX from 'katex';
import { DebounceInput } from 'react-debounce-input';

import { addJobRecorder } from './HerbieUI';

import './ExpressionTable.css';
import LinkToReports from './LinkToReports';

// Make server call to get tex version of expression
export const expressionToTex = async (expression: fpcore.mathjs, numVars: number, serverUrl: string) => {
  try {
    const response = await herbiejsImport.analyzeExpressionExport(
      fpcore.mathjsToFPCore(expression),
      "tex",
      serverUrl
    );

    // result starts with "exp(x) =" (all vars ", " separated), slice that off
    const pre = response.result.split('=')[0];
    return response.result.slice(pre.length + 1);
  } catch (err: any) {
    return (err as Error).toString()
  }
};

function ExpressionTable() {
  // translate the above to use useGlobal
  const [showMath, setShowMath] = useState(false);
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)
  // const [alternativesJobresponse,]
  // const AlternativesJobResponse
  const [alternativesJobResponse, setAlternativesJobResponse] = HerbieContext.useGlobal(HerbieContext.AlternativesJobResponseContext)
  const [analyses, ] = HerbieContext.useGlobal(HerbieContext.AnalysesContext)
  const [cost, ] = HerbieContext.useGlobal(HerbieContext.CostContext)
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext)
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)
  const [expressionStyles, ] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext)
  const [spec,] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [samples,] = HerbieContext.useGlobal(HerbieContext.SamplesContext)
  const [serverUrl,] = HerbieContext.useGlobal(HerbieContext.ServerContext)
  const [addExpression, setAddExpression] = useState('');
  const [addExpressionTex, setAddExpressionTex] = useState('');
  
  const [archivedExpressions, setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext)
  const [jobCount,] = HerbieContext.useReducerGlobal(HerbieContext.JobCountContext)

  const [expandedExpressions, setExpandedExpressions] = HerbieContext.useGlobal(HerbieContext.ExpandedExpressionsContext)

  const naiveExpression = expressions.find(e => e.text === spec.expression);
  // get cost of naive expression
  const naiveCost = cost.find(c => c.expressionId === naiveExpression?.id)?.cost;

  const herbiejs = addJobRecorder(herbiejsImport)

  const activeExpressions = expressions.map(e => e.id).filter(id => !archivedExpressions.includes(id))

  useEffect(expandSingleActiveExpression, [expressions]);
  function expandSingleActiveExpression () {
    if (activeExpressions.length === 1) {
      setExpandedExpressions([activeExpressions[0]]);
    }
  }

  function toggleShowMath() {
    setShowMath(!showMath);
  }

  const handleExpressionClick = (id: number) => {
    setSelectedExprId(id);
  }

  const handleExpandClick = (id: number) => {
    // toggle expandedExpressions
    if (expandedExpressions.includes(id)) {
      setExpandedExpressions(expandedExpressions.filter((exprId) => exprId !== id));
    }
    else {
      setExpandedExpressions([...expandedExpressions, id]);
    }
  }

  const handleCheckboxChange = (event: any, id: number) => {
    if (event.target.checked) {
      setCompareExprIds([...compareExprIds, id]);
    } else {
      setCompareExprIds(compareExprIds.filter((exprId) => exprId !== id));
    }
  };

  const noneExpanded = expandedExpressions.filter(e => !archivedExpressions.includes(e)).length === 0;

  const handleExpandAllClick = () => {
    if (noneExpanded) {
      setExpandedExpressions(expressions.map((expr) => expr.id));
    } else {
      setExpandedExpressions([]);
    }
  }

  const allChecked = compareExprIds.filter(id => activeExpressions.includes(id)).length === activeExpressions.length;

  const toggleAllChecked = () => {
    if (allChecked) {
      setCompareExprIds([]);
    } else {
      setCompareExprIds(expressions.map((expr) => expr.id));
    }
  }

  const extraVariables = (expression: string) => {
    const specVariables = fpcore.getVarnamesMathJS(spec.expression);
    const expressionVariables = fpcore.getVarnamesMathJS(expression);

    return expressionVariables.filter((symbol) => !specVariables.includes(symbol));
  };

  const addExpressionErrors = (expression: string) : string[] => {
    try {
      fpcore.getVarnamesMathJS(expression);
    } catch (e:any) {
      return [(e as Error).message];
    }
    const variables = extraVariables(expression);

    if (variables.length !== 0) {
      const variableListString = variables.join(", ");
      const errorMessage =
        "The added expression is not valid. The expression you tried to add has the following variables not seen in the spec expression: " +
        variableListString;
      return [errorMessage];
    }

    const functionNames = Object.keys(fpcore.SECRETFUNCTIONS).concat(Object.keys(fpcore.FUNCTIONS));
    const expressionVariables = fpcore.getVarnamesMathJS(expression);
    const functionNamedVariables = expressionVariables.filter((symbol) => functionNames.includes(symbol));
    if (functionNamedVariables.length !== 0) {
      const functionVariableString = functionNamedVariables.join(", ");
      const errorMessage =
        "The added expression is not valid. The expression you tried to add has the following variables that have the same name as FPCore functions: " +
        functionVariableString;
      return [errorMessage];
    }

    return []
  }

  const validateExpression = (expression: string) => {
    const errors = addExpressionErrors(expression)
    if (errors.length !== 0) {
      throw new Error(errors[0])
    }
  }
  // if (selectedSampleId === undefined) {
  //   return <div className="expression-table">Waiting for sampling...</div>
  // }
  const sample = samples.find((sample) => sample.id === selectedSampleId)

  const handleAddExpression = async () => {
    validateExpression(addExpression);
    const selectedId = nextId(expressions);
    const tex = await expressionToTex(addExpression, fpcore.getVarnamesMathJS(addExpression).length, serverUrl);
    const newExpressions = [
      new Expression(addExpression, selectedId, spec.id, tex),
      ...expressions,
    ]
    setExpressions(newExpressions);
    setDerivations([
      new Derivation("<p>User Input Expression</p>", nextId(expressions), undefined),
      ...derivations,
    ]);
    setSelectedExprId(selectedId)
    setCompareExprIds([...compareExprIds, selectedId])
    setAddExpression('')
    
    fetch('http://localhost:8003/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionStorage.getItem('sessionId'),
        expression: addExpression,
        Description: "Added Expression by clicking Add button",
        timestamp: new Date().toLocaleString(),
      }),
    })
    .then(response => {
      if (response.ok) {
        console.log('Server is running and log saved');
      }
      else {
        console.error('Server responded with an error:', response.status);
      }
    })
    .catch(error => console.error('Request failed:', error));
  }

  const handleAddExpressionChange = async (expression: string) => {
    expression = expression.trim();
    setAddExpression(expression);
    try {
      validateExpression(expression);
      const tex = expression === '' ? ''
        : KaTeX.renderToString(await expressionToTex(expression, fpcore.getVarnamesMathJS(expression).length, serverUrl), { throwOnError: false });
      setAddExpressionTex(tex);
    } catch (e) {
      setAddExpressionTex((e as Error).toString());
    }
  }

  const handleImprove = async (expression: Expression) => {
    if (!sample) {
      return
    }
    // get suggested expressions with Herbie and put them in the expressions table
    const suggested = await herbiejs.suggestExpressions(fpcore.mathjsToFPCore(expression.text, spec.expression, fpcore.getVarnamesMathJS(spec.expression)), sample, serverUrl)


    const histories = suggested.histories;
    const alternatives = suggested.alternatives;

    const newExpressions = [];
    const newDerivations = [];

    // Add the suggested expressions to the expressions table,
    // and add the suggested derivations to the derivations table
    for (let i = 0; i < alternatives.length; i++) {
      // Generate a new ID
      const newId = nextId(expressions) + i;

      const s = alternatives[i];
      const fPCoreToMathJS = await herbiejs.fPCoreToMathJS(s, serverUrl);
      const tex = await expressionToTex(fPCoreToMathJS, fpcore.getVarnamesMathJS(fPCoreToMathJS).length, serverUrl);
      const newExpression = new Expression(fPCoreToMathJS, newId, spec.id, tex);
      newExpressions.push(newExpression);
       
      fetch('http://localhost:8003/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionStorage.getItem('sessionId'),
          expression: fPCoreToMathJS,
          Description: "Added Expression by clicking improve",
          timestamp: new Date().toLocaleString(),
        }),
      })
      .then(response => {
        if (response.ok) {
          console.log('Server is running and log saved');
        }
        else {
          console.error('Server responded with an error:', response.status);
        }
      })
      .catch(error => console.error('Request failed:', error));
      // The following code assumes the HTMLHistory[] returend by Herbie
      // is mapped to the alternatives array 1:1
      const d = histories[i];
      const newDerivation = new Derivation(d, newId, expression.id);
      newDerivations.push(newDerivation);
    }


    const path = suggested.path;
    setAlternativesJobResponse({ expressionId: newExpressions.map(expression => expression.id), path: path });

    setExpressions([...newExpressions, ...expressions]);
    setDerivations([...newDerivations, ...derivations]);
    setCompareExprIds([...compareExprIds, ...newExpressions.map(e => e.id)]);
  }

  return (
    <div className="expression-table">
      <div className="expression-table-header-row">
        <div className="expand-header action">
        <div onClick={() => handleExpandAllClick()}>
                      {!noneExpanded ? <svg style={{ width: '15px', stroke: "var(--action-color)" }} viewBox="0 0 24 24" transform="rotate(180)" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6 9L12 15L18 9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                        : <svg style={{ width: '15px', stroke: "var(--action-color)" }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6 9L12 15L18 9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>}
                    </div>
        </div>
        <div className="checkbox-header">
          <input type="checkbox" onChange={ toggleAllChecked } checked={ allChecked }></input>
        </div>
        <div className="expressions-header">
          Expression
          (Show TeX<input id="showTexCheckbox" type="checkbox" style={{ transform: "scale(.8)" } } onChange={ toggleShowMath } checked={ showMath }></input>)
        </div>
        <div className="compare-header">
        </div>
        <div className="error-header">
          Accuracy
        </div>
        <div className="speedup-header">
          Speedup
        </div>
        <div className="buttons-header">

        </div>
      </div>

        <div className="expressions-actual">
          {activeExpressions.map((id) => {
            const expression = expressions.find((expression) => expression.id === id) as Expression;
            const isChecked = compareExprIds.includes(expression.id);
            const analysisData = analyses.find((analysis) => analysis.expressionId === expression.id)?.data;
            const analysisResult =
              !analysisData
                ? undefined
                : (analysisData.errors.reduce((acc: number, v: any) => {
                  return acc + v;
                }, 0) / 8000).toFixed(2);

            // cost of the expression
            const costResult = cost.find(c => c.expressionId === expression.id)?.cost;

            const color = expressionStyles.find((style) => style.expressionId === expression.id)?.color
            const components = [
                { value: 'localError', label: 'Local Error', component: <LocalError expressionId={expression.id} /> },
                { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent expressionId={expression.id}/> },
                { value: 'fpTaylorComponent', label: 'FPTaylor Analysis', component: <FPTaylorComponent expressionId={expression.id}/> },
                { value: 'expressionExport', label: 'Expression Export', component: <ExpressionExport expressionId={expression.id}/> },
                // {value: 'linkToReports', label: 'Link To Reports', component: <LinkToReports expressionId={expression.id} />}
              ];
            return (
              <div className={`expression-container ${expression.id === selectedExprId ? 'selected' : ''}`}>
                <div key={expression.id} className={`expression`} style={{ boxShadow: expandedExpressions.includes(expression.id) ? '0 2px 5px rgba(0, 0, 0, 0.1)' : '0 1px 2px rgba(0, 0, 0, 0.1)'}}>
                  {/* expand button [+] */}
                  <div className="expand action">
                    <div onClick={() => handleExpandClick(expression.id)}>
                      {expandedExpressions.includes(expression.id) ?
                        <svg style={{ width: '15px', stroke: "var(--action-color)" }} viewBox="0 0 24 24" transform="rotate(180)" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6 9L12 15L18 9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>
                        : <svg style={{ width: '15px', stroke: "var(--action-color)" }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6 9L12 15L18 9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>}
                    </div>
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={event => handleCheckboxChange(event, expression.id)} onClick={event => event.stopPropagation()}
                    style={({ accentColor: color })}
                  />
                  <div className="expression-name-container" onClick={() => handleExpressionClick(expression.id)}>
                  {showMath ?
                    <div className="expression-tex" dangerouslySetInnerHTML={{
                      __html:  KaTeX.renderToString(expression.tex, { throwOnError: false })
                    }} style={{
                          maxWidth: '350px',
                          overflowX: 'auto',
                          overflowY: 'hidden',
                    }}/>
                    :
                    <div className="expression-text" id={`` + expression.id}>
                      {expression.text}
                    </div>
                    }
                    <div className="copy" onClick={(e) => { navigator.clipboard.writeText(expression.text); e.stopPropagation() }} data-tooltip-id="copy-tooltip" >
                        <a className="copy-anchor">⧉</a>
                      </div>
                    </div>
                  <div className="analysis" id={`` + expression.id}>
                    {/* TODO: Not To hardcode number of bits*/}
                    {analysisResult ? (100 - (parseFloat(analysisResult)/64)*100).toFixed(1) + "%" : "..."}
                  </div>
                  <div className="speedup" id={`` + expression.id}>
                    {naiveCost && costResult ? (naiveCost / costResult).toFixed(1) + "x" : "..."}
                  </div>
                  <div className="herbie">
                    <button disabled={jobCount > 0} onClick={() => handleImprove(expression)} className={"herbie-button"} id={`` + expression.id}>
                      Improve
                    </button>
                  </div>


                  <div className="delete">
                    <button onClick={() =>{
                      setArchivedExpressions([...archivedExpressions, expression.id]);
                      const activeExp = activeExpressions.filter(id => id !== expression.id);
                      if (activeExp.length > 0) {
                        setSelectedExprId(activeExp[0]);
                      }
                      }}>
                    ╳
                    </button>
                  </div>
                </div>
                {expandedExpressions.includes(expression.id) && (
                  <div className="dropdown" onClick={() => handleExpressionClick(expression.id)}>

                    <SelectableVisualization components={components} />
                  </div>
                )}
              </div>
            );
          })}
      </div>
      <div className="expressions" style={{marginTop: 'auto', backgroundColor: "#1f1c18", padding: "10px 15px"}}>
        <div className="add-expression" style={{ display: "flex", flexDirection: 'column', gap: '5px' }}>
          <div style={{color: "var(--background-color)", fontSize: "smaller"}}>
            Add an expression
          </div>
          <div className="add-expression-dropdown">
            <div className="add-expression-tex" style={{color: addExpressionErrors(addExpression).length > 0 ? "salmon" : "white", paddingLeft: '5px'}} dangerouslySetInnerHTML={{
                __html: addExpressionTex
              }} />
          </div>
          <div className="add-expression-top">
            <DebounceInput debounceTimeout={300} element="textarea" value={addExpression} onChange={(event) => handleAddExpressionChange(event.target.value)} className={addExpression.trim() ? 'has-text' : ""} placeholder="e.g. sqrt(x + 1) - sqrt(x)" style={{ fontFamily: 'Ruda', fontWeight: 600, flexGrow: 1} } />
            <div className="add-expression-button" style={{alignSelf: "center", display: 'flex'} }>
              <button
                disabled={addExpression.trim() === '' || addExpressionErrors(addExpression).length !== 0}
                onClick={handleAddExpression}
              >
                + Add
              </button>
            </div>
          </div>
        </div>
      </div>
        < Tooltip anchorSelect=".copy-anchor" place="top" >
          Copy to clipboard
        </Tooltip>
    </div>
  )
}

export { ExpressionTable }
