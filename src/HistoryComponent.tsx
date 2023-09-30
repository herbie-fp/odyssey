import React from 'react';
import * as contexts from './HerbieContext';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

import './HistoryComponent.css';

import { Derivation } from './HerbieTypes';

interface DerivationTreeProps {
  derivations: Derivation[];
  selectedExprId: number;
  parentId?: number;
  level?: number;
}

const DerivationTree: React.FC<DerivationTreeProps> = ({
  derivations,
  selectedExprId,
  parentId,
  level = 0, // Default indentation level is 0
}) => {
  const childDerivations = derivations.filter(
    (derivation) => derivation.parentId === parentId
  );

  return (
    <div className="tree-node" style={{ marginLeft: `${level * 20}px` }}>
      {childDerivations.map((derivation) => (
        <div
          key={derivation.id}
          className={`tree-node-content ${
            derivation.id === selectedExprId ? 'selected' : ''
          }`}
        >
          {derivation.id}
          <DerivationTree
            derivations={derivations}
            selectedExprId={selectedExprId}
            parentId={derivation.id}
            level={level + 1} // Increase the indentation level
          />
        </div>
      ))}
    </div>
  );
};

const HistoryComponent = () => {
  const [derivations, setDerivations] = contexts.useGlobal(
    contexts.DerivationsContext
  );
  const [selectedExprId, setSelectedExprId] = contexts.useGlobal(
    contexts.SelectedExprIdContext
  );
  return (<div></div>);
  return (
    <div>
      <h2>Derivation Tree</h2>
      <div className="tree-container">
        <DerivationTree derivations={derivations} selectedExprId={selectedExprId} />
      </div>
    </div>
  );
};

export { HistoryComponent };
