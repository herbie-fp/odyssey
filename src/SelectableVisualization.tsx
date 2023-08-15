import React, { ReactText, useState } from 'react';
import { LocalError } from './LocalError';
import { ErrorPlot } from './ErrorPlot';
import { DerivationComponent } from './DerivationComponent';
import GitHubIssueButton from './GitHubIssueButton';

import './SelectableVisualization.css';

// Define SelectableVisualization component
function SelectableVisualization({ components }: { components: { value:string, label: string, component: React.ReactElement}[] }) {
  const [selectedOption, setSelectedOption] = useState(components[0].value);

  const handleOptionChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setSelectedOption(event.target.value);
  };

  const selectedComponent = components.find((comp) => comp.value === selectedOption)?.component;

  return (
    <div className="visualization">
      <select value={selectedOption} onClick={e => e.stopPropagation() } onChange={handleOptionChange}>
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
