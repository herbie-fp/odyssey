// External imports (libraries, etc.) will go here
import React, { useState } from 'react';
import * as contexts from './HerbieContext';
// import './YourComponent.css'; // If you have a CSS file associated with the component
// Other local imports (Herbie types, Contexts, etc) will go here

// If you have any external parameters that should be passed in to the component,
// this should be defined in the next line to be passed into the function.
const GPU_FPX = ({ expressionId }: { expressionId: number }) => {
  // Set up your global contexts at the beginning
  // If you need any global Odyssey state, this will come in the form of Contexts
  // (more on that later in the Contexts section)
  // Using contexts will look something like this:
  // const [someContext, setSomeContext] = contexts.useGlobal(contexts.SomeContext);

  // Functions for logic relating to the component go here
  function someFunction() {
    // do something here
  }

  const otherFunction = (parameter: number) => {
    // do something else here
  }

  return (
    <div>
      <p>Your component's child components will go here.</p>
    </div>
  );
};

export { GPU_FPX };