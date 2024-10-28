// External imports (libraries, etc.) will go here
import React, { useState } from 'react';
import * as contexts from './HerbieContext';
import './GPU_FPX.css';
import './ExpressionExport';
import { ExpressionExportResponse } from './lib/herbiejs';

// Other local imports (Herbie types, Contexts, etc) will go here

// If you have any external parameters that should be passed in to the component,
// this should be defined in the next line to be passed into the function.
const GPU_FPX = ({ expressionId }: { expressionId: number }) => {
  //Get expressions
  const [expressions, ] = contexts.useGlobal(contexts.ExpressionsContext);
  const current_expression = expressions.find(expression => expression.id === expressionId);
  const [exportCode, setExportCode] = useState<ExpressionExportResponse | null>(null);
  const [gpuFpxSelected] = contexts.useGlobal(contexts.gpuFpxSelected);

  // Convert to CUDA
  function someFunction() {
    // do something here
  }

  const otherFunction = (parameter: number) => {
    // do something else here
  }

  return (
    <div>
      <p>Current expression:</p>
      <p>{current_expression?.text}</p>

      <p>Should run cuda translate and send to GPU-FPX Server?</p>
      <p>
        {gpuFpxSelected ? "yes" : "no"}
      </p>
    </div>
  );
};

export { GPU_FPX };