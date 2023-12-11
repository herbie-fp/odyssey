import React, { useState, ChangeEvent, useEffect } from 'react';

interface InputRange {
  lower: string;
  upper: string;
}

/**
 * Props for the InputRangeEditor component.
 */
interface InputRangeEditorProps {
  variableName: string;
  onRangeChange: (variable: string, lower: string, upper: string) => void;
}

/**
 * InputRangeEditor component.
 * Renders an input range editor for a specific variable.
 * @param {InputRangeEditorProps} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
const InputRangeEditor: React.FC<InputRangeEditorProps> = ({
  variableName,
  onRangeChange,
}) => {
  const [lowerBound, setLowerBound] = useState('-1.79e308');
  const [upperBound, setUpperBound] = useState('1.79e308');

  const handleLowerBoundChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setLowerBound(value);
    onRangeChange(variableName, value, upperBound);
  };

  const handleUpperBoundChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setUpperBound(value);
    onRangeChange(variableName, lowerBound, value);
  };

  return (
    <div>
      <label>{variableName}</label>
      <div>
        <input
          type="number"
          placeholder="Lower bound"
          value={lowerBound}
          onChange={handleLowerBoundChange}
        />
        <input
          type="number"
          placeholder="Upper bound"
          value={upperBound}
          onChange={handleUpperBoundChange}
        />
      </div>
    </div>
  );
};

/**
 * Props for the InputRangeEditor component.
 */
interface InputRangeEditor1Props {
  value: InputRange ;
  setValue: (inputRange: InputRange) => void;
}

/**
 * InputRangeEditor component.
 * Renders an input range editor for a specific variable.
 * @param {InputRangeEditorProps} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
export const InputRangeEditor1: React.FC<InputRangeEditor1Props> = ({ value, setValue }) => {
  const [lowerBound, setLowerBound] = useState(value.lower || '-1e308');
  const [upperBound, setUpperBound] = useState(value.upper || '1e308');
  const [error, setError] = useState('');

  useEffect(() => {
    if (rangesValid()) {
      setValue({ lower: lowerBound, upper: upperBound });
    }
  }, [lowerBound, upperBound]);

  const rangesValid = () => {
    if (lowerBound === '' || upperBound === '') {
      setError('All ranges must be filled.');
      return false;
    } else if (Number(lowerBound) >= Number(upperBound)) {
      setError('Lower bound must be less than upper bound for all ranges.');
      return false;
    }
    setError('');
    return true
  };

  return (
    <div className="input-ranges-editor">
      <span className="lower">
        <input
          type="number"
          placeholder="Lower bound"
          value={lowerBound}
          onChange={e => setLowerBound(e.target.value)}
        />
      </span>
      <span className="separator"> to </span>
      <span className="upper">
        <input
          type="number"
          placeholder="Upper bound"
          value={upperBound}
          onChange={e => setUpperBound(e.target.value)}
        />
      </span>
      {error && <div style={{ color: 'red' }} className="error">{error}</div>}
    </div>
  );
};


/**
 * Props for the InputRangesEditor component.
 */
interface InputRangesEditorProps {
  value: {
    ranges: { [key: string]: InputRange };
  };
  setValue: (value: {
    ranges: { [key: string]: InputRange };
  }) => void;
}

/**
 * InputRangesEditor component.
 * Renders an editor for multiple input ranges.
 * @param {InputRangesEditorProps} props - The component props.
 * @returns {JSX.Element} The rendered component.
 */
const InputRangesEditor: React.FC<InputRangesEditorProps> = ({ value, setValue }) => {
  const [ranges, setRanges] = useState<{ [key: string]: InputRange }>(value.ranges);
  const [error, setError] = useState('');
  const variables = Object.keys(value.ranges)

  useEffect(() => {
    if (error === '') {
      setValue({ ranges });
    }
  }, [ranges, error]);

  useEffect(() => {
    validateRanges()
  }, [ranges])

  const handleRangeChange = (variable: string, lower: string, upper: string) => {
    setRanges((prevRanges) => ({
      ...prevRanges,
      [variable]: { lower, upper },
    }));
  };

  const validateRanges = () => {
    for (const variable in ranges) {
      const { lower, upper } = ranges[variable];
      if (lower === '' || upper === '') {
        setError('All ranges must be filled.');
        return;
      } else if (Number(lower) >= Number(upper)) {
        setError('Lower bound must be less than upper bound for all ranges.');
        return;
      }
    }
    setError('');
  };

  return (
    <div>
      {variables.map((variable) => (
        <InputRangeEditor
          key={variable}
          variableName={variable}
          onRangeChange={handleRangeChange}
        />
      ))}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};

export { InputRange, InputRangesEditor };
