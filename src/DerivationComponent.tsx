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
  
  const selectedExprDerivation = derivations.find(d => d.id === selectedExprId)
  if (!selectedExprDerivation) {
    return <div>Could not find expression with id {selectedExprId}</div>
  }

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: selectedExprDerivation.derivation }} />
    </div>
  );
};

export { DerivationComponent };