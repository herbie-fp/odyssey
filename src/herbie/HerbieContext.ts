import React, { createContext } from 'react';
import * as HerbieTypes from './HerbieTypes';

type setter<T> = React.Dispatch<T>

export interface Global<T> {
  isGlobal: true
  context: React.Context<[T, setter<T>]>
  init: T
}

type reducerAction = { type: string }
type reducer<T> = (init: T, action: any) => T
export type reducerApply = (action: reducerAction) => void
export interface ReducerGlobal<T> {
  isReducerGlobal: true
  context: React.Context<[T, reducerApply]>
  reducer: reducer<T>
  init: T
}

const makeReducerGlobal = <T>(reducer: reducer<T>, init: T): ReducerGlobal<T> => {
  return {
    isReducerGlobal: true,
    context: createContext({} as [T, reducerApply]),
    reducer,
    init: init
  }
}

const makeGlobal = <T>(init: T): Global<T> => {
  return {
    isGlobal: true,
    context: createContext({} as [T, React.Dispatch<T>]),
    init: init
  }
}

export const useGlobal = <T>(global: Global<T>): [T, setter<T>] => {
  return React.useContext(global.context)
}

export const useReducerGlobal = <T>(reducerGlobal: ReducerGlobal<T>): [T, reducerApply] => {
  return React.useContext(reducerGlobal.context)
}

export const hoveredExpressionId = makeGlobal(0)
export const SelectedExprIdContext = makeGlobal(-1)
export const CompareExprIdsContext = makeGlobal([] as number[]) //createContext({} as { compareExprIds: number[], setCompareExprIds: React.Dispatch<number[]> });
export const ExpressionsContext = makeGlobal([] as HerbieTypes.Expression[])//new types.Expression(defaultExpression2, 1, 0)] as types.Expression[]);//[new types.Expression('x', 1), new types.Expression('sqrt(x + 1)', 2)] as types.Expression[])
export const DerivationsContext = makeGlobal([] as HerbieTypes.Derivation[])
export const AlternativesJobResponseContext = makeGlobal({} as HerbieTypes.AlternativesJobResponse)
export const AnalysesContext = makeGlobal([] as HerbieTypes.ErrorAnalysis[])
export const CostContext = makeGlobal([] as HerbieTypes.CostAnalysis[])
export const SpecContext = makeGlobal(new HerbieTypes.Spec('', 0) as HerbieTypes.Spec)
//@ts-ignore
export const ServerContext = makeGlobal('http://127.0.0.1:8000')//window.acquireVsCodeApi ? '' : 'https://herbie.uwplse.org/demo')
//@ts-ignore
export const FPTaylorServerContext = makeGlobal(window.acquireVsCodeApi ? 'http://localhost:8888/fptaylor' : 'https://herbie.uwplse.org/fptaylor')
//@ts-ignore
export const FPBenchServerContext = makeGlobal(window.acquireVsCodeApi ? 'http://localhost:8888/fpbench' : 'https://herbie.uwplse.org/fpbench')
export const ExpressionStylesContext = makeGlobal([] as HerbieTypes.ExpressionStyle[])
export const SelectedSampleIdContext = makeGlobal(undefined as number | undefined);// undefined as number | undefined)
export const SamplesContext = makeGlobal([] as HerbieTypes.Sample[])
export const SelectedPointContext = makeGlobal(undefined as HerbieTypes.ordinalPoint | undefined)
export const SelectedSubsetRangeContext = makeGlobal(undefined as HerbieTypes.SelectedSubset | undefined)
export const SelectedSubsetAnalysesContext = makeGlobal(undefined as HerbieTypes.SubsetErrorAnalysis[] | undefined)
export const SelectedPointsLocalErrorContext = makeGlobal([] as HerbieTypes.PointLocalErrorAnalysis[])
export const SelectedPointsErrorExpContext = makeGlobal([] as HerbieTypes.PointErrorExpAnalysis[])
export const AverageLocalErrorsContext = makeGlobal([] as HerbieTypes.AverageLocalErrorAnalysis[])
export const FPTaylorAnalysisContext = makeGlobal([] as HerbieTypes.FPTaylorAnalysis[])
export const FPTaylorRangeContext = makeGlobal([] as HerbieTypes.FPTaylorRange[])
export const InputRangesTableContext = makeGlobal([] as (HerbieTypes.InputRanges | HerbieTypes.RangeInSpecFPCore) [])
export const SelectedInputRangeIdContext = makeGlobal(0)
export const ArchivedExpressionsContext = makeGlobal([] as number[])
export const gpuFpxSelected = makeGlobal(false);
export const ExpandedExpressionsContext = makeGlobal([] as number[])  // Spec IDs

type jobCountAction = { type: 'increment' } | { type: 'decrement' }
function jobCountReducer(jobCount: number, action : jobCountAction ) {
  switch (action.type) {
    case 'increment':
      return jobCount + 1;
    case 'decrement':
      return jobCount - 1;
  }
}

export const JobCountContext = makeReducerGlobal(jobCountReducer, 0)
