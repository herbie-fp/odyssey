import React, { useState } from 'react';
import { LocalError } from './LocalError';
import { ErrorPlot } from './ErrorPlot';
import { DerivationComponent } from './DerivationComponent';

import './SelectableVisualization.css';

// Define SelectableVisualization component
function SelectableVisualization({ expressionId }: { expressionId: number }) {
  const [selectedOption, setSelectedOption] = useState('errorPlot');

  const handleOptionChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setSelectedOption(event.target.value);
  };

  const components = [
    { value: 'errorPlot', label: 'Error Plot', component: <ErrorPlot /> },
    { value: 'localError', label: 'Local Error', component: <LocalError expressionId={expressionId} /> },
    { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent /> },
  ];

  const selectedComponent = components.find((comp) => comp.value === selectedOption)?.component;

  return (
    <div className="visualization">
      <select value={selectedOption} onChange={handleOptionChange}>
        {components.map((comp) => (
          <option key={comp.value} value={comp.value}>
            {comp.label}
          </option>
        ))}
      </select>
      <div>{selectedComponent}</div>
    </div>
  );
}

export { SelectableVisualization };
