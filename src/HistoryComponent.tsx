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
}

const DerivationTree: React.FC<DerivationTreeProps> = ({ derivations, selectedExprId, parentId }) => {
    const childDerivations = derivations.filter(derivation => derivation.parentId === parentId);

    return (
        <ul>
            {childDerivations.map(derivation => (
                <li key={derivation.id} className={derivation.id === selectedExprId ? 'selected' : ''}>
                    {derivation.id}
                    <DerivationTree derivations={derivations} selectedExprId={selectedExprId} parentId={derivation.id} />
                </li>
            ))}
        </ul>
    );
};

const HistoryComponent = () => {
    const [derivations, setDerivations] = contexts.useGlobal(contexts.DerivationsContext)
    const [selectedExprId, setSelectedExprId] = contexts.useGlobal(contexts.SelectedExprIdContext)
    return (
        <div>
            <h2>Derivation Tree</h2>
            <DerivationTree derivations={derivations} selectedExprId={selectedExprId} />
        </div>
    );
}

export { HistoryComponent };
