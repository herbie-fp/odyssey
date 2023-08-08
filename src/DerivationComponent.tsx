import * as contexts from './HerbieContext';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

import './DerivationComponent.css';

const DerivationComponent = () => { 
  const [derivations, setDerivations] = contexts.useGlobal(contexts.DerivationsContext)
  const [selectedExprId, setSelectedExprId] = contexts.useGlobal(contexts.SelectedExprIdContext)
  
  const selectedExprDerivation = derivations.find(d => d.id === selectedExprId)
  if (!selectedExprDerivation) {
    return <div>Could not find expression with id {selectedExprId}</div>
  }

  return (
    <div>
      <Latex>{selectedExprDerivation.derivation}</Latex>
    </div>
  );
};

export { DerivationComponent };