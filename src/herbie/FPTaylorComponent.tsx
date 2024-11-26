import React, { useState } from 'react';
import * as Contexts from './HerbieContext';
import { FPTaylorRange, SpecRange } from './HerbieTypes';
import { getVarnamesMathJS } from './lib/fpcore';

const FPTaylorComponent = ({ expressionId }: { expressionId: number }) => {
  const [expressions, ] = Contexts.useGlobal(Contexts.ExpressionsContext);
  const [FPTaylorAnalyses, ] = Contexts.useGlobal(Contexts.FPTaylorAnalysisContext);
  const [FPTaylorRanges, setFPTaylorRanges] = Contexts.useGlobal(Contexts.FPTaylorRangeContext);

  const expression = expressions.find(expression => expression.id === expressionId);
  if (!expression) {
    return <div>Expression not found.</div>;
  }
  const variables = getVarnamesMathJS(expression.text);

  const [variableRanges, setVariableRanges] = useState(
    Object.fromEntries(variables.map(variable => [variable, { min: "0", max: "10" }])));

  const handleVariableRangeUpdate = () => {
    const specRanges = variables.map(
      variable => new SpecRange(variable, parseFloat(variableRanges[variable].min), parseFloat(variableRanges[variable].max))
    );

    let updatedFPTaylorRanges = [...FPTaylorRanges];
    updatedFPTaylorRanges[expressionId] = new FPTaylorRange(expressionId, specRanges);

    setFPTaylorRanges(updatedFPTaylorRanges);
  };

  const analysisResult = FPTaylorAnalyses.find((item) => item.expressionId === expressionId)?.analysis[0];
  const bounds = analysisResult?.bounds ?? "FPTaylor returned no error bounds.";
  const absoluteError = analysisResult?.absoluteError ?? "FPTaylor returned no absolute error.";

  const errorMessages = (() => {
    // List variable-specific errors for each kind of problem we could encounter in validateVariableRanges
    const messages = [];
    for (const [variable, range] of Object.entries(variableRanges)) {
      if (isNaN(parseFloat(range.min))) {
        messages.push(`Min for ${variable} is not a number.`);
      }
      if (isNaN(parseFloat(range.max))) {
        messages.push(`Max for ${variable} is not a number.`);
      }
      if (parseFloat(range.min) >= parseFloat(range.max)) {
        messages.push(`Min for ${variable} is greater than or equal to max.`);
      }
    }
    return messages;
  })();

  return (
    <div>
      <p>Bounds: {analysisResult ? bounds : 
        "FPTaylor has not been run on this expression yet."
        }</p>
      <p>Absolute Error: {analysisResult ? 
        absoluteError : 
        "FPTaylor has not been run on this expression yet."
      }</p>
      {variables.map(variable => (
        <div key={variable}>
          <label>
            {variable} - Min:
            <input
              value={variableRanges[variable].min}
              onChange={(e) => setVariableRanges(prevRanges => ({
                ...prevRanges,
                [variable]: { min: e.target.value, max: prevRanges[variable].max }
              }))}
            />
          </label>
          &nbsp;
          <label>
            {variable} - Max:
            <input
              value={variableRanges[variable].max}
              onChange={(e) => setVariableRanges(prevRanges => ({
                ...prevRanges,
                [variable]: { min: prevRanges[variable].min, max: e.target.value}
              }))}
            />
          </label>
        </div>
      ))}
      <ul>
        {errorMessages.map((message, index) => <li key={index}>{message}</li>)}
      </ul>
      {errorMessages.length === 0 &&
        <button onClick={handleVariableRangeUpdate}>Analyze Ranges with FPTaylor</button>
      }
    </div>
  );
};

export { FPTaylorComponent };
