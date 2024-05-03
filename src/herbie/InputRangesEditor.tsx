import React, { useState, ChangeEvent, useEffect } from 'react';

interface InputRange {
  lower: string;
  upper: string;

  minAbsVal?: string;
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
  const [minAbsVal, setMinAbsVal] = useState(value.minAbsVal || '0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (rangesValid()) {
      setValue({ lower: lowerBound, upper: upperBound, minAbsVal: minAbsVal });
    }
  }, [lowerBound, upperBound, minAbsVal]);

  const rangesValid = () => {
    if (lowerBound === '' || upperBound === '' || minAbsVal === '') {
      setError('All ranges must be filled.');
      return false;
    } else if (Number(lowerBound) >= Number(upperBound)) {
      setError('Lower bound must be less than upper bound for all ranges.');
      return false;
    } 
    
    // These errors can only be triggered if the user selects bounds that cross zero, 
    // and therefore might have a minimum absolute value 
    else if ((Number(lowerBound) <= 0) && (Number(upperBound) >= 0)) {
      if (Number(minAbsVal) < 0) {
        setError('Minimum absolute value must be positive.');
        return false;
      } else if (Math.abs(Number(minAbsVal)) >= Math.abs(Number(lowerBound)) || 
          Math.abs(Number(minAbsVal)) >= Math.abs(Number(upperBound))) {
        setError('Minimum absolute value must be less than magnitude of lower and upper bounds.');
        return false;
      }
    }
    setError('');
    return true
  };

  const boundsCrossesZero = (Number(lowerBound) <= 0) && (Number(upperBound) >= 0);

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
      { 
        boundsCrossesZero &&
        <div>
          <span className="separator"> with a minimum absolute value of </span>
          <span className="min">
          <input
            type="number"
            placeholder="Min abs value"
            value={minAbsVal}
            onChange={e => setMinAbsVal(e.target.value)}
          />
          </span>
        </div>
      }
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
