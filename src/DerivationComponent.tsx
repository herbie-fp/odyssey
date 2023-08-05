import React, { useState } from 'react';
import { Expression } from './HerbieTypes';
import { nextId } from './utils'
import * as herbiejs from './herbiejs'
import * as fpcore from './fpcore'
import * as types from './HerbieTypes'
import * as contexts from './HerbieContext';

import './DerivationComponent.css';

const DerivationComponent = () => {
  const [expressions, setExpressions] = contexts.useGlobal(contexts.ExpressionsContext)
  const [derivations, setDerivations] = contexts.useGlobal(contexts.DerivationsContext)
  const [selectedExprId, setSelectedExprId] = contexts.useGlobal(contexts.SelectedExprIdContext)
  
  const selectedExpr = expressions.find(e => e.id === selectedExprId)
  
  // Function to handle button click
  const handleButtonClick = () => {
    console.log(derivations)
    console.log('derivations');
  };

  return (
    <div>
      <p>Derivation component here.</p>      
      <button onClick={handleButtonClick}>Click Me</button>
    </div>
  );
};

export { DerivationComponent };