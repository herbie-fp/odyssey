import * as contexts from './HerbieContext';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

import './DerivationComponent.css';

const DerivationComponent = () => {
  const [derivations, setDerivations] = contexts.useGlobal(contexts.DerivationsContext)
  const [selectedExprId, setSelectedExprId] = contexts.useGlobal(contexts.SelectedExprIdContext)

  const selectedDerivation = derivations.find(d => d.id === selectedExprId)
  if (!selectedDerivation) {
    return <div>Could not find expression with id {selectedExprId}</div>
  }

  let currentExpressionId: number | undefined = selectedDerivation.id
  let expressionAncestry = []

  // While the current expression is a root expression
  while (currentExpressionId !== undefined) {
    // Find its parent
    const nextDerivation = derivations.find(d => d.id === currentExpressionId)

    // If parent is not found, break
    if (nextDerivation === undefined) {
      break
    }

    // Otherwise, add it to the ancestry
    expressionAncestry.push(nextDerivation.id)

    // Examine the parent as the next expression
    currentExpressionId = nextDerivation.parentId
  }

  return (
    <div>
      <Latex>{selectedDerivation.derivation}</Latex>
    </div>
  );
};

export { DerivationComponent };