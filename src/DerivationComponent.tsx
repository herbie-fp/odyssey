import * as contexts from './HerbieContext';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

import './DerivationComponent.css';
import { Derivation } from './HerbieTypes';

const DerivationComponent = ({ expressionId }: { expressionId: number }) => {
  const [derivations, setDerivations] = contexts.useGlobal(contexts.DerivationsContext)

  let selectedDerivation = derivations.find(d => d.id === expressionId)

  if(expressionId === -1) {
    const [selectedExprId, setSelectedExprId] = contexts.useGlobal(contexts.SelectedExprIdContext)
    selectedDerivation = derivations.find(d => d.id === selectedExprId)
  }

  if (!selectedDerivation) {
    return <div>Could not find expression with id {expressionId}</div>
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