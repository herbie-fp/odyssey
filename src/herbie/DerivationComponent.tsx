import Latex from 'react-latex-next';
import * as HerbieContext from './HerbieContext';
import './DerivationComponent.css';

const DerivationComponent = ({ expressionId }: { expressionId: number }) => {
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)

  let selectedDerivation = derivations.find(d => d.id === expressionId)
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
    currentExpressionId = nextDerivation.origExpId
  }

  return (
    <div>
      <Latex>{selectedDerivation.history}</Latex>
    </div>
  );
};

export { DerivationComponent };
