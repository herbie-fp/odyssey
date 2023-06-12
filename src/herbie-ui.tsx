import { useReducer, useState, useContext, useEffect } from 'react';
import ReactDOM from 'react-dom';

class Expression {
  constructor(public readonly text: string, public readonly id: number) { 
    this.text = text;
    this.id = id;
  }
}

class Analysis {
  constructor(public readonly result: string, public readonly id: number) { 
    this.result = result;
    this.id = id;
  }
}

// Define a React component
function HerbieUI() {
  const [expressions, setExpressions] = useState([] as Expression[]);
  const [analyses, setAnalyses] = useState([] as Analysis[]);
  
  // Reactively update analyses whenever expressions change
  useEffect(() => {
    setTimeout(() => {
      setAnalyses(expressions.map(expression => new Analysis(`analysis ${expression.id}`, expression.id)));
    }, 1000);
  }, [expressions]);

  // track expression id index
  const [exprId, setExprId] = useState(0);
  return <div>
    <h1>Expressions</h1>
    <button onClick={() => { setExpressions([...expressions, new Expression(`expression ${exprId}`, exprId)]); setExprId(exprId + 1); }}>Add expression</button>
    {/* display all expressions with corresponding analyses as a list of divs */}
    <div className="expressions">
      {expressions.map(expression => {
        return <div key={expression.id}>
          <div className="expression">{expression.text}</div>
          <div className="analysis">{analyses.find(analysis => analysis.id === expression.id)?.result || 'no analysis yet'}</div>
        </div>;
      })}
    </div>
  </div>;
}

// Render the component into the 'root' div
ReactDOM.render(<HerbieUI />, document.getElementById('root'));