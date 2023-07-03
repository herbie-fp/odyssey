import React, { useContext, useState } from 'react';
import { LocalError } from './LocalError';
import { ErrorPlot } from './ErrorPlot';
import { SelectedExprIdContext } from './HerbieContext';

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
    <div className="visualization">
      <select value={selectedOption} onChange={handleOptionChange}>
        <option value="errorPlot">Error Plot</option>
        <option value="localError">Local Error</option>
      </select> for expression {selectedExprId}
      <div>
        {selectedComponent}
      </div>
    </div>
  );
}

export { SelectableVisualization}