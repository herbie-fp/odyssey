import React, { useContext, useState } from 'react';
import { LocalError } from './LocalError';
import { ErrorPlot } from './ErrorPlot';
import { SelectedExprIdContext } from './HerbieContext';
import * as HerbieContext from './HerbieContext';

// Define SelectableVisualization component
function SelectableVisualization({ expressionId }: { expressionId: number }) {
  const [selectedOption, setSelectedOption] = useState('errorPlot');

  const handleOptionChange : React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setSelectedOption(event.target.value);
  };

  // Render the selected visualization component based on the chosen option
  let selectedComponent;
  if (selectedOption === 'errorPlot') {
    selectedComponent = <ErrorPlot />;
  } else if (selectedOption === 'localError') {
    selectedComponent = <LocalError expressionId={expressionId}/>;
  }

  // const { selectedExprId } = useContext(SelectedExprIdContext);
  const [selectedExprId, ] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)

  return (
    <div className="visualization">
      <select value={selectedOption} onChange={handleOptionChange}>
        <option value="errorPlot">Error Plot</option>
        <option value="localError">Local Error</option>
      </select>
      <div>
        {selectedComponent}
      </div>
    </div>
  );
}

export { SelectableVisualization}