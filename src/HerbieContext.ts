import React, { createContext } from 'react';
import { Expression, ErrorAnalysis, Spec, ExpressionStyle }  from './HerbieTypes'

const SelectedExprIdContext = createContext({} as { selectedExprId: number, setSelectedExprId: React.Dispatch<number> });
const CompareExprIdsContext = createContext({} as { compareExprIds: number[], setCompareExprIds: React.Dispatch<number[]> });
const ExpressionsContext = createContext({} as { expressions: Expression[], setExpressions: React.Dispatch<Expression[]> });
const AnalysesContext = createContext({} as { analyses: ErrorAnalysis[], setAnalyses: React.Dispatch<ErrorAnalysis[]> });
const SpecContext = createContext({} as { spec: Spec | undefined, setSpec: React.Dispatch<Spec> });
const ServerContext = createContext({} as { serverUrl: string | undefined, setServerUrl: React.Dispatch<string> });
const ExpressionStylesContext = createContext({} as { expressionStyles: ExpressionStyle[], setExpressionStyles: React.Dispatch<ExpressionStyle[]> });

export { SelectedExprIdContext, ExpressionsContext, AnalysesContext, ServerContext, SpecContext, CompareExprIdsContext, ExpressionStylesContext };