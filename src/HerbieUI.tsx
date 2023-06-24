import React, { useReducer, useState, createContext, useContext, useEffect } from 'react';

import './HerbieUI.css';

import { SpecComponent } from './SpecComponent';

import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext } from './HerbieContext';
import { Expression, Analysis, SpecRange, Spec } from './HerbieTypes';

function ServerStatusComponent(){
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    // Fetch the status
    const fetchStatus = async () => {
      // const response = await fetch('http://127.0.0.1:8000/api/sample', {
      //   method: 'POST',
      //   body: JSON.stringify({ formula: '(FPCore (x) (- (sqrt (+ x 1))))', seed: 5 }),
      // });

      const response = await fetch('http://127.0.0.1:8000/up');
      const status = await response.json();
      setServerStatus(status);
    };

    fetchStatus();
  }, []);

  return (
    <div>
      {serverStatus ? (
        <div>
          <h2>Server Response:</h2>
          <p>{JSON.stringify(serverStatus)}</p>
        </div>
      ) : (
        <p>Loading server status...</p>
      )}
    </div>
  );
};

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

  const handleOptionChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
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