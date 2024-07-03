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
const math11 = require('mathjs11');

import './ExpressionTable.css';

function ExpressionTable() {
  // translate the above to use useGlobal
  const [showMath, setShowMath] = useState(false);
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)
  const [analyses, ] = HerbieContext.useGlobal(HerbieContext.AnalysesContext)
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext)
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)
  const [expressionStyles, ] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext)
  const [spec,] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [samples,] = HerbieContext.useGlobal(HerbieContext.SamplesContext)
  const [serverUrl,] = HerbieContext.useGlobal(HerbieContext.ServerContext)
  const [addExpression, setAddExpression] = useState('');
  const [expandedExpressions, setExpandedExpressions] = useState<number[]>([]);
  const [archivedExpressions, setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext)

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
  if (selectedSampleId === undefined) {
    return <div className="expression-table">Waiting for sampling...</div>
  }
  const sample = samples.find((sample) => sample.id === selectedSampleId)
  if (!sample) {
    // should never get here
    return <div className="expression-table">Couldn't find sample id { selectedSampleId }</div>
  }
  
  return (
    <div className="expression-table">
      <div className="expression-table-header-row">
        <div className="expand-header">
        <div onClick={() => handleExpandAllClick()}>
                      {noneExpanded ? '+' : '−'}
                    </div>
        </div>
        <div className="checkbox-header">
          <input type="checkbox" onChange={ toggleAllChecked } checked={ allChecked }></input>
        </div>
        <div className="expressions-header">
          Expression
          (Show TeX<input type="checkbox" style={{ transform: "scale(.8)" } } onChange={ toggleShowMath } checked={ showMath }></input>)
        </div>
        <div className="compare-header">
        </div>
        <div className="error-header">
          Accuracy
        </div>
        <div className="buttons-header">

        </div>
      </div>
      <div className="expressions">
        <div className="add-expression">
          <div className="add-expression-top">
            <DebounceInput debounceTimeout={300} element="textarea" value={addExpression} onChange={(event) => setAddExpression(event.target.value)} className={ addExpression.trim() ? 'has-text' : "" } />
            <div className="add-expression-button">
              <button
                disabled={addExpression.trim() === '' || addExpressionErrors(addExpression).length !== 0}
                onClick={() => {
                  validateExpression(addExpression);
                  const newExpressions = [
                    new Expression(addExpression, nextId(expressions), spec.id),
                    ...expressions,
                  ]
                  setExpressions(newExpressions);
                  setDerivations([
                    new Derivation("<p>User Input Expression</p>", nextId(expressions), undefined),
                    ...derivations,
                  ]);
                  setAddExpression('')
                }}
              >
                Add
              </button>
            </div>
          </div>
          <div className="add-expression-dropdown">
            <div className="add-expression-tex" dangerouslySetInnerHTML={{
                __html: (() => {
                  try {
                    validateExpression(addExpression);
                    return addExpression.trim() === '' ? '' : KaTeX.renderToString(math11.parse(addExpression).toTex(), { throwOnError: false })
                  } catch (e) {
                    //throw e;
                    return (e as Error).toString()
                  }
                })()
              }} />
          </div>
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
            const color = expressionStyles.find((style) => style.expressionId === expression.id)?.color
            const components = [
                { value: 'localError', label: 'Local Error', component: <LocalError expressionId={expression.id} /> },
                { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent expressionId={expression.id}/> },
                { value: 'fpTaylorComponent', label: 'FPTaylor Analysis', component: <FPTaylorComponent expressionId={expression.id}/> },
                { value: 'expressionExport', label: 'Expression Export', component: <ExpressionExport expressionId={expression.id}/> },
              ];
            return (
              <div className={`expression-container ${expression.id === selectedExprId ? 'selected' : ''}`}>
                <div key={expression.id} className={`expression`} >
                  {/* expand button [+] */}
                  <div className="expand">
                    <div onClick={() => handleExpandClick(expression.id)}>
                      {expandedExpressions.includes(expression.id) ? '−' : '+' }
                    </div>
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={event => handleCheckboxChange(event, expression.id)} onClick={event => event.stopPropagation()}
                    style={({ accentColor: color })}
                  />
                  <div className="expression-name-container" onClick={() => handleExpressionClick(expression.id)}>
                  {showMath ?
                    <div className="expression-tex" dangerouslySetInnerHTML={{
                      __html: (() => {
                        try {
                          // Check if there are no variables
                          if (fpcore.getVarnamesMathJS(spec.expression).length === 0) {
                            throw new Error("No variables detected.")
                          }

                          return KaTeX.renderToString(math11.parse(expression.text).toTex(), { throwOnError: false })
                        } catch (e) {
                          //throw e;
                          return (e as Error).toString()
                        }
                      })()
                        }} />
                    :
                    <div className="expression-text"  >
                      {expression.text}
                    </div>
                    }
                    <div className="copy" onClick={(e) => { navigator.clipboard.writeText(expression.text); e.stopPropagation() }} data-tooltip-id="copy-tooltip" >
                        <a className="copy-anchor">⧉</a>
                      </div>
                    </div>
                  <div className="analysis">
                    {/* TODO: Not To hardcode number of bits*/}
                    {analysisResult ? (100 - (parseFloat(analysisResult)/64)*100).toFixed(1) : "..."}
                  </div>
                  <div className="herbie">
                    <button onClick={async () => {
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
                        const newExpression = new Expression(fPCoreToMathJS, newId, spec.id);
                        newExpressions.push(newExpression);

                        // The following code assumes the HTMLHistory[] returend by Herbie
                        // is mapped to the alternatives array 1:1
                        const d = histories[i];
                        const newDerivation = new Derivation(d, newId, expression.id);
                        newDerivations.push(newDerivation);
                      }

                      setExpressions([...newExpressions, ...expressions]);
                      setDerivations([...newDerivations, ...derivations]);
                    }}>
                      Herbie
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
        < Tooltip anchorSelect=".copy-anchor" place="top" >
          Copy to clipboard
        </Tooltip>
    </div>
  )
}

export { ExpressionTable }
