import { useContext, useState } from 'react';
import { Expression, ErrorAnalysis, SpecRange, Spec } from './HerbieTypes';
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext';
import * as HerbieContext from './HerbieContext';
import { nextId } from './utils'

function ExpressionTable() {
  // translate the above to use useGlobal
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [analyses, setAnalyses] = HerbieContext.useGlobal(HerbieContext.AnalysesContext)
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext)
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)
  const [expressionStyles, setExpressionStyles] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext)

  const [addExpression, setAddExpression] = useState('');
  const [clickedRowId, setClickedRowId] = useState<number | null>(null); // State to keep track of the clicked row id

  // const { expressionIdsForSpecs } = useContext(HerbieContext.ExpressionIdsForSpecsContext)  

  //const { spec } = useContext(SpecContext);
  // const [spec, ] = HerbieContext.useGlobal(HerbieContext.SpecContext)

  const handleExpressionClick = (id: number) => {
    setSelectedExprId(id);
    setClickedRowId(id);
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
          <div>
            <div key={expression.id} className={`expression ${expression.id === selectedExprId ? 'selected' : ''}`} onClick={() => handleExpressionClick(expression.id)} >
              <input type="checkbox" checked={isChecked} onChange={(event) => handleCheckboxChange(event, expression.id)} onClick={event => event.stopPropagation()}
                style={({ accentColor: expressionStyles.find((style) => style.expressionId === expression.id)?.color })}
              />
              <div >
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
              <div className="delete">
                <button onClick={() => setExpressions(expressions.filter((e) => e.id !== expression.id))}>
                  Delete
                </button>
              </div>
            </div>
            {clickedRowId === expression.id && (
              <div className="placeholder-viz">
                Placeholder visualization goes here!
              </div>
            )}
          </div>
        );
      })}
    </div>
  )
}

export { ExpressionTable }