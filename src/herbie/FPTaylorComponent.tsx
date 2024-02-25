import React, { useState } from 'react';
import * as Contexts from './HerbieContext';
import { FPTaylorRange, SpecRange } from './HerbieTypes';
import { getVarnamesMathJS } from './lib/fpcore';

const FPTaylorComponent = ({ expressionId }: { expressionId: number }) => {
  const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
  const [FPTaylorAnalyses, setFPTaylorAnalyses] = Contexts.useGlobal(Contexts.FPTaylorAnalysisContext);
  const [FPTaylorRanges, setFPTaylorRanges] = Contexts.useGlobal(Contexts.FPTaylorRangeContext);

  let variablesSet: Set<string> = new Set<string>();
  expressions.forEach(expression => {
    const result = getVarnamesMathJS(expression.text);
    variablesSet = new Set([...variablesSet, ...result]);
  });
  const [variables, _] = useState(Array.from(variablesSet));

  const initialVariableRanges: { [key: string]: { min: number; max: number } } = {};
  variables.forEach(variable => {
    initialVariableRanges[variable] = { min: 0, max: 0 };
  });

  const [variableRanges, setVariableRanges] = useState(initialVariableRanges);

  React.useEffect(() => {
    const specRanges = variables.map(
      variable => new SpecRange(variable, variableRanges[variable].min, variableRanges[variable].max)
    );

    let updatedFPTaylorRanges = [...FPTaylorRanges];
    updatedFPTaylorRanges[expressionId] = new FPTaylorRange(expressionId, specRanges);

    setFPTaylorRanges(updatedFPTaylorRanges);
  }, [variableRanges, expressionId]);

  const analysisResult = FPTaylorAnalyses.find((item) => item.expressionId === expressionId)?.analysis[0];
  const bounds = analysisResult?.bounds ?? "FPTaylor returned no error bounds.";
  const absoluteError = analysisResult?.absoluteError ?? "FPTaylor returned no absolute error.";

  return (
    <div>
      <p>Bounds: {bounds}</p>
      <p>Absolute Error: {absoluteError}</p>
      {variables.map(variable => (
        <div key={variable}>
          <label>
            {variable} - Min:
            <input
              type="number"
              value={variableRanges[variable].min}
              onChange={(e) => setVariableRanges(prevRanges => ({
                ...prevRanges,
                [variable]: { min: Number(e.target.value), max: prevRanges[variable].max }
              }))}
            />
          </label>
          <label>
            {variable} - Max:
            <input
              type="number"
              value={variableRanges[variable].max}
              onChange={(e) => setVariableRanges(prevRanges => ({
                ...prevRanges,
                [variable]: { min: prevRanges[variable].min, max: Number(e.target.value)}
              }))}
            />
          </label>
        </div>
      ))}
    </div>
  );
};

export { FPTaylorComponent };
