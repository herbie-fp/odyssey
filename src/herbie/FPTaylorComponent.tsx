import React from 'react';
import * as Contexts from './HerbieContext';
import { SpecRange } from './HerbieTypes';
import { getVarnamesMathJS } from './lib/fpcore';

const FPTaylorComponent = ({ expressionId }: { expressionId: number }) => {
  const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
  const [FPTaylorAnalyses, setFPTaylorAnalyses] = Contexts.useGlobal(Contexts.FPTaylorAnalysisContext);
  const [FPTaylorRanges, setFPTaylorRanges] = Contexts.useGlobal(Contexts.FPTaylorRangeContext);

  let variablesSet = new Set<string>();
  expressions.forEach(expression => {
    const result = getVarnamesMathJS(expression.text);
    variablesSet = new Set([...variablesSet, ...result]);
  });
  const variables = Array.from(variablesSet);

  console.log(variables)

  const initialVariableRanges: { [key: string]: { min: number; max: number } } = {};
  variables.forEach(variable => {
    initialVariableRanges[variable] = { min: 0, max: 0 };
  });

  const [variableRanges, setVariableRanges] = React.useState(initialVariableRanges);

  React.useEffect(() => {
    const specRanges = Object.entries(variableRanges).map(([variable, range]) => new SpecRange(variable, range.min, range.max));

    setFPTaylorRanges([...FPTaylorRanges, ...specRanges]);
  }, [variableRanges, setFPTaylorRanges]);

  return (
    <div>
      {variables.map(variable => (
        <div key={variable}>
          <p>{variable} - Bounds: {FPTaylorAnalyses[0].analysis[0].bounds}</p>
          <p>{variable} - Absolute Error: {FPTaylorAnalyses[0].analysis[0].absoluteError}</p>
          <label>
            {variable} - Min:
            <input
              type="number"
              value={variableRanges[variable].min}
              onChange={(e) => setVariableRanges(prevRanges => ({ ...prevRanges, [variable]: { ...prevRanges[variable], min: Number(e.target.value) } }))}
            />
          </label>
          <label>
            {variable} - Max:
            <input
              type="number"
              value={variableRanges[variable].max}
              onChange={(e) => setVariableRanges(prevRanges => ({ ...prevRanges, [variable]: { ...prevRanges[variable], max: Number(e.target.value) } }))}
            />
          </label>
        </div>
      ))}
    </div>
  );
};

export { FPTaylorComponent };
