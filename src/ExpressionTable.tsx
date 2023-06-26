import { useContext, useState } from 'react';
import { Expression, ErrorAnalysis, SpecRange, Spec, Sample } from './HerbieTypes';
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext';
import {nextId} from './utils'

function ExpressionTable() {
  const { selectedExprId, setSelectedExprId } = useContext(SelectedExprIdContext);
  const { expressions, setExpressions } = useContext(ExpressionsContext);
  const { analyses, setAnalyses } = useContext(AnalysesContext);
  const { compareExprIds, setCompareExprIds } = useContext(CompareExprIdsContext);
  const [ addExpression, setAddExpression ] = useState('');

  const handleExpressionClick = (id: number) => {
    setSelectedExprId(id);
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
        const analysisResult = analyses.find((analysis) => analysis.expressionId === expression.id)?.result || 'no analysis yet';
        return (
          <div key={expression.id} className={`expression ${expression.id === selectedExprId ? 'selected' : ''}`} >
            <input type="checkbox" checked={isChecked} onChange={(event) => handleCheckboxChange(event, expression.id)} />
            <div onClick={() => handleExpressionClick(expression.id)}>
              {expression.text}
            </div>
            <div className="analysis">
              {analysisResult}
            </div>
          </div>
        );
      })}
    </div>
  )
}

export { ExpressionTable }