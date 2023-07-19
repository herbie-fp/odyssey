import { useContext, useState } from 'react';
import { Expression, ErrorAnalysis, SpecRange, Spec } from './HerbieTypes';
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext';
import * as HerbieContext from './HerbieContext';
import { nextId } from './utils'
import { SelectableVisualization } from './SelectableVisualization';
import { Tooltip } from 'react-tooltip'

import './ExpressionTable.css';

function ExpressionTable() {
  // translate the above to use useGlobal
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [analyses, setAnalyses] = HerbieContext.useGlobal(HerbieContext.AnalysesContext)
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext)
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)
  const [expressionStyles, setExpressionStyles] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext)

  const [addExpression, setAddExpression] = useState('');
  const [clickedRowId, setClickedRowId] = useState<number | null>(null); // State to keep track of the clicked row id

  // keep track of expanded expressions
  const [expandedExpressions, setExpandedExpressions] = useState<number[]>([]);

  // const { expressionIdsForSpecs } = useContext(HerbieContext.ExpressionIdsForSpecsContext)  

  //const { spec } = useContext(SpecContext);
  // const [spec, ] = HerbieContext.useGlobal(HerbieContext.SpecContext)

  const handleExpressionClick = (id: number) => {
    setSelectedExprId(id);
    // setClickedRowId(id);
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

  // exprId is the first available id for a new expression given the current values in expressions
  // we compute this by sorting expressions on id and then finding the first id that is not used
  const getNextExprId = (expressions: Expression[]) => () => expressions.sort((a, b) => a.id - b.id).reduce((acc, curr) => {
    if (acc === curr.id) {
      return acc + 1;
    } else {
      return acc;
    }
  }, 0);

  return (
    <div className="expressions">
      <div className="expression">
        <div>
          <input type="text" value={addExpression} onChange={(event) => setAddExpression(event.target.value)} />
          <button
            onClick={() => {
              setExpressions([
                new Expression(addExpression, nextId(expressions)),
                ...expressions,
              ]);
            }}
          >
            Add expression
          </button>
        </div>
      </div>

      {expressions.map((expression) => {
        const isChecked = compareExprIds.includes(expression.id);
        const analysisData = analyses.find((analysis) => analysis.expressionId === expression.id)?.data;
        const analysisResult =
          !analysisData
            ? 'no analysis yet'
            : (analysisData.errors.reduce((acc: number, v: any) => {
              return acc + v;
            }, 0) / 8000).toFixed(2);
        return (
          <div className="expression-container">
            <div key={expression.id} className={`expression ${expression.id === selectedExprId ? 'selected' : ''}`} >
              {/* expand button [+] */}
              <div className="expand">
                <div onClick={() => handleExpandClick(expression.id)}>
                  {expandedExpressions.includes(expression.id) ? '－' : '＋'}
                </div>
              </div>
              <input type="checkbox" checked={isChecked} onChange={(event) => handleCheckboxChange(event, expression.id)} onClick={event => event.stopPropagation()}
                style={({ accentColor: expressionStyles.find((style) => style.expressionId === expression.id)?.color })}
              />
            <div className="expression-text" onClick={() => handleExpressionClick(expression.id)} >
                {expression.text}
              </div>
              <div className="analysis">
                {analysisResult}
              </div>
              <div className="herbie">
                <button onClick={() => { }}>
                  Herbie
                </button>
              </div>
              
              <div className="copy" onClick={() => { navigator.clipboard.writeText(expression.text) }} data-tooltip-id="copy-tooltip" >
                <a className="copy-anchor">⧉</a>
              </div>
              <div className="delete">
                <button onClick={() => setExpressions(expressions.filter((e) => e.id !== expression.id))}>
                x
                </button>
              </div>
            </div>
            {expandedExpressions.includes(expression.id) && (
              <div className="dropdown">
                <SelectableVisualization expressionId={ expression.id } />
              </div>
            )}
          </div>
        );
      })}
      < Tooltip anchorSelect=".copy-anchor" place="top" >
        Copy to clipboard
      </Tooltip> 
    </div>
  )
}

export { ExpressionTable }