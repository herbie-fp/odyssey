import React, { useReducer, useState, createContext, useContext, useEffect } from 'react';

import './HerbieUI.css';

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

class SpecRange {
  constructor(public readonly variable: string, public readonly lowerBound: number, public readonly upperBound: number, public readonly id: number) {
    this.variable = variable;
    this.lowerBound = lowerBound;
    this.upperBound = upperBound;
    this.id = id;
  }
}

class Spec {
  constructor(public readonly expression: string, public readonly ranges: SpecRange[], public readonly id: number) {
    this.expression = expression;
    this.ranges = ranges;
    this.id = id;
  }
}

// Stub component for the Spec
function SpecComponent() {
  const { spec, setSpec } = useContext(SpecContext);
  // When the spec is clicked, we show an overlay menu for editing the spec and the input ranges for each variable.
  const [showOverlay, setShowOverlay] = useState(false);
  
  const handleSpecClick = () => {
    setShowOverlay(true);
  }
  const handleOverlayClick = () => {
    setShowOverlay(false);
  }
  
  function getVariables(spec: Spec) : string[] {
    // TODO
    return ['x']
  }
  
  // Create a new SpecRange when the range is submitted by clicking the done button
  

  // Create a new Spec when the spec is submitted by clicking the done button
  const handleSpecChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setSpec(new Spec(event.target.value, spec.ranges, spec.id));
  }
  return (
    <div className="spec-container">
      <div className="spec-text" onClick={handleSpecClick}>{spec.expression}</div>
      {showOverlay && <div className="spec-overlay" onClick={handleOverlayClick}>
        {/* Show a dialogue for editing the spec with a "done" button. */}
        <div className="spec-overlay-content" onClick={(event) => event.stopPropagation()}>
          <div className="spec-overlay-header">
            <div>Spec</div>
            <button onClick={handleOverlayClick}>Done</button>
          </div>
          {/* Show inputs for lower and higher bounds for each variable. Dynamically adjust as the variables in the expression change. */}
          <div className="spec-ranges">
            {getVariables(spec).map((variable) => {
              return (
                <div className="spec-range" key={variable}>
                  <div className="spec-range-variable">{variable}</div>
                  <div className="spec-range-inputs">
                    <input type="number" value={spec.ranges.find((range:SpecRange) => range.variable === variable)?.lowerBound} onChange={}/>
                    <input type="number" value={spec.ranges.find((range: SpecRange) => range.variable === variable)?.upperBound} />
                  </div>
                </div>
              );
            })}   
          </div>
          <div className="spec-add-range">
            <button>Add range</button>
          </div>

          
          <textarea className="spec-textarea" value={spec} onChange={handleSpecChange} />
        </div>
      </div>}
    </div>
  );
}

// Stub component for the server status
function ServerStatusComponent() {
  return <div className="server-status">Server Status Component</div>;
}

// Stub component for ErrorPlot visualization
function ErrorPlot() {
  console.log('ErrorPlot rendered');
  return <div>Error Plot Component</div>;
}

// Stub component for LocalError visualization
function LocalError() {
  return <div>Local Error Component</div>;
}

// Define SelectableVisualization component
function SelectableVisualization() {
  const [selectedOption, setSelectedOption] = useState('errorPlot');

  const handleOptionChange : React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setSelectedOption(event.target.value);
  };

  // Render the selected visualization component based on the chosen option
  let selectedComponent;
  if (selectedOption === 'errorPlot') {
    selectedComponent = <ErrorPlot />;
  } else if (selectedOption === 'localError') {
    selectedComponent = <LocalError />;
  }

  const { selectedExprId } = useContext(SelectedExprIdContext);

  return (
    <div>
      <select value={selectedOption} onChange={handleOptionChange}>
        <option value="errorPlot">Error Plot</option>
        <option value="localError">Local Error</option>
      </select> for expression {selectedExprId}
      <div className="visualization">
        {selectedComponent}
      </div>
    </div>
  );
}


function ExpressionTable() {
  const { selectedExprId, setSelectedExprId } = useContext(SelectedExprIdContext);
  const { expressions, setExpressions } = useContext(ExpressionsContext);
  const { analyses, setAnalyses } = useContext(AnalysesContext);
  const handleExpressionClick = (id: number) => {
    setSelectedExprId(id);
  }

  // exprId is the first available id for a new expression given the current values in expressions
  // we compute this by sorting expressions on id and then finding the first id that is not used
  const getNextExprId = (expressions: Expression[]) => () => expressions.sort((a, b) => a.id - b.id).reduce((acc, curr) => {
    if (acc === curr.id) {
      return acc + 1;
    } else {
      return acc;
    }
  }, 0);
  
  const [exprId, setExprId] = useState(getNextExprId(expressions));

  return (
    <div className="expressions">
      <button
        onClick={() => {
          setExpressions([
            ...expressions,
            new Expression(`expression ${exprId}`, exprId),
          ]);
          setExprId(getNextExprId(expressions));
        }}
      >
        Add expression
      </button>
      {expressions.map((expression) => {
        return (
          <div className={`expression ${expression.id === selectedExprId ? 'selected' : ''}`} onClick={() => handleExpressionClick(expression.id)} key={expression.id}>
            {expression.text}
            <div className="analysis">
              {analyses.find((analysis) => analysis.id === expression.id)
                ?.result || 'no analysis yet'}
            </div>
          </div>
        );
      })}
    </div>
  )
}

// create a context for the selected expression id
const SelectedExprIdContext = createContext({} as { selectedExprId: number, setSelectedExprId: React.Dispatch<number> });
const ExpressionsContext = createContext({} as { expressions: Expression[], setExpressions: React.Dispatch<Expression[]> });
const AnalysesContext = createContext({} as { analyses: Analysis[], setAnalyses: React.Dispatch<Analysis[]> });
const SpecContext = createContext({} as { spec: Spec, setSpec: React.Dispatch<Spec> });

function HerbieUI() {
  // State setters/getters (provided to children via React context)
  const [expressions, setExpressions] = useState([] as Expression[]);
  const [analyses, setAnalyses] = useState([] as Analysis[]);
  const [selectedExprId, setSelectedExprId] = useState(-1);
  const [spec, setSpec] = useState(new Spec('sqrt(x + 1) - sqrt(x)', [new SpecRange('x', -1e308, 1e308, 0)], 0))
  
  // Data relationships
  // Reactively update analyses whenever expressions change
  useEffect(() => {
    setTimeout(() => {
      setAnalyses(expressions.map(expression => new Analysis(`analysis ${expression.id}`, expression.id)));
    }, 1000);
  }, [expressions]);

  // immediately select the first available expression if none is selected
  useEffect(() => {
    if (selectedExprId === -1 && expressions.length > 0) {
      setSelectedExprId(expressions[0].id);
    }
  }, [expressions])

  function HerbieUIInner() {
    return (
      <div className="grid-container">
        <div className="header">
          <SpecComponent />
          <ServerStatusComponent />
        </div>
        <ExpressionTable />
        <SelectableVisualization />
      </div>
    );
  }
  return (
    // provide contexts to all components-- kind of awkward, but it works
    // a little better than passing props down the tree. Reducers would be better,
    // but they introduce unnecessary re-renders if we group the state together.
    // I would definitely like to know if there's a better way of doing this.
    <SpecContext.Provider value={{ spec, setSpec }}>
      <SelectedExprIdContext.Provider value={{ selectedExprId, setSelectedExprId }}>
        <ExpressionsContext.Provider value={{ expressions, setExpressions }}>
          <AnalysesContext.Provider value={{ analyses, setAnalyses }}>
            <HerbieUIInner />
          </AnalysesContext.Provider>
        </ExpressionsContext.Provider>
      </SelectedExprIdContext.Provider>
    </SpecContext.Provider>
  );
}

export { HerbieUI };

// // Render the component into the 'root' div
// ReactDOM.render(<HerbieUI />, document.getElementById('root'));