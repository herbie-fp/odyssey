import React, { ReactText, useState } from 'react';
import { LocalError } from './LocalError/LocalError';
import { ErrorPlot } from './ErrorPlot';
import { DerivationComponent } from './DerivationComponent';
import GitHubIssueButton from './GitHubIssueButton';
import * as Contexts from './HerbieContext'
import './SelectableVisualization.css';

// Define SelectableVisualization component
function SelectableVisualization({ components }: { components: { value:string, label: string, component: React.ReactElement}[] }) {
  const [selectedOption, setSelectedOption] = useState(components[0].value);
  const [gpuFpxSelected,setGpuFpxSelected] = Contexts.useGlobal(Contexts.gpuFpxSelected);
  const handleOptionChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const newSelectedOption = event.target.value;
    setSelectedOption(newSelectedOption);
    setGpuFpxSelected(newSelectedOption === 'GPU_FPX');
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
