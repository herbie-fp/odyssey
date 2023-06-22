import React, { createContext } from 'react';
import { Expression, ErrorAnalysis, Spec }  from './HerbieTypes'

const SelectedExprIdContext = createContext({} as { selectedExprId: number, setSelectedExprId: React.Dispatch<number> });
const CompareExprIdsContext = createContext({} as { compareExprIds: number[], setCompareExprIds: React.Dispatch<number[]> });
const ExpressionsContext = createContext({} as { expressions: Expression[], setExpressions: React.Dispatch<Expression[]> });
const AnalysesContext = createContext({} as { analyses: ErrorAnalysis[], setAnalyses: React.Dispatch<ErrorAnalysis[]> });
const SpecContext = createContext({} as { spec: Spec | undefined, setSpec: React.Dispatch<Spec> });

export { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext };