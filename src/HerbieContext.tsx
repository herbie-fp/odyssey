import React, { createContext } from 'react';
import { Expression, Analysis, Spec }  from './HerbieTypes'

const SelectedExprIdContext = createContext({} as { selectedExprId: number, setSelectedExprId: React.Dispatch<number> });
const ExpressionsContext = createContext({} as { expressions: Expression[], setExpressions: React.Dispatch<Expression[]> });
const AnalysesContext = createContext({} as { analyses: Analysis[], setAnalyses: React.Dispatch<Analysis[]> });
const SpecContext = createContext({} as { spec: Spec, setSpec: React.Dispatch<Spec> });

export { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext };