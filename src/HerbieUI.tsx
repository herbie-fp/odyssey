import React, { useReducer, useState, useContext, useEffect } from 'react';
import ReactDOM from 'react-dom';

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

// Stub component for the Spec
function SpecComponent() {
  return <div>Spec Component</div>;
}

// Stub component for the server status
function ServerStatusComponent() {
  return <div>Server Status Component</div>;
}

// Stub component for ErrorPlot visualization
function ErrorPlot() {
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

  return (
    <div>
      <select value={selectedOption} onChange={handleOptionChange}>
        <option value="errorPlot">Error Plot</option>
        <option value="localError">Local Error</option>
      </select>
      <div className="visualization">
        {selectedComponent}
      </div>
    </div>
  );
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
  return (
    <div className="grid-container">
      <div className="header">
        <div className="spec">
          <SpecComponent />
        </div>
        <div className="server-status">
          <ServerStatusComponent />
        </div>
      </div>
      <div className="expressions">
        <button
          onClick={() => {
            setExpressions([
              ...expressions,
              new Expression(`expression ${exprId}`, exprId),
            ]);
            setExprId(exprId + 1);
          }}
        >
          Add expression
        </button>
        {expressions.map((expression) => {
          return (
            <div className="expression" key={expression.id}>
              {expression.text}
              <div className="analysis">
                {analyses.find((analysis) => analysis.id === expression.id)
                  ?.result || 'no analysis yet'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="visualization">
        <SelectableVisualization />
      </div>
    </div>
  );
}

export { HerbieUI };

// // Render the component into the 'root' div
// ReactDOM.render(<HerbieUI />, document.getElementById('root'));