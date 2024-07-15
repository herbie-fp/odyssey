import React, { createContext } from 'react';
import * as types from './HerbieTypes';
import * as herbiejs from './lib/herbiejs';

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

let defaultExpression = 'sqrt(x + 1) - sqrt(x)';
let defaultExpression2 = `1 / (sqrt(1 + x) + sqrt(x))`;

// If this is running on the web, allow URL to pass in default expression
if (typeof window !== 'undefined') {
  const queryParams = new URLSearchParams(window.location.search);
  const expr = queryParams.get('expr');

  console.log('Argument 1:', expr);
  defaultExpression = expr ? expr : defaultExpression;
}

// const defaultRanges = new types.InputRanges([new types.SpecRange('x', -1e308, 1e308)], 0, 0)

export const hoveredExpressionId = makeGlobal(0)
export const SelectedExprIdContext = makeGlobal(-1)
export const CompareExprIdsContext = makeGlobal([] as number[]) //createContext({} as { compareExprIds: number[], setCompareExprIds: React.Dispatch<number[]> });
export const ExpressionsContext = makeGlobal([] as types.Expression[])//new types.Expression(defaultExpression2, 1, 0)] as types.Expression[]);//[new types.Expression('x', 1), new types.Expression('sqrt(x + 1)', 2)] as types.Expression[])
export const DerivationsContext = makeGlobal([] as types.Derivation[])
export const AnalysesContext = makeGlobal([] as types.ErrorAnalysis[])
export const CostContext = makeGlobal([] as types.CostAnalysis[])
export const SpecContext = makeGlobal(new types.Spec(defaultExpression, 0) as types.Spec)
//@ts-ignore
export const ServerContext = makeGlobal(window.acquireVsCodeApi ? 'http://127.0.0.1:8000' : 'https://herbie.uwplse.org/demo')
//@ts-ignore
export const FPTaylorServerContext = makeGlobal(window.acquireVsCodeApi ? 'http://localhost:8888/fptaylor' : 'https://herbie.uwplse.org/fptaylor')
//@ts-ignore
export const FPBenchServerContext = makeGlobal(window.acquireVsCodeApi ? 'http://localhost:8888/fpbench' : 'https://herbie.uwplse.org/fpbench')
export const ExpressionStylesContext = makeGlobal([] as types.ExpressionStyle[])
export const SelectedSampleIdContext = makeGlobal(undefined as number | undefined);// undefined as number | undefined)
export const SamplesContext = makeGlobal([] as types.Sample[])
export const SelectedPointContext = makeGlobal(undefined as types.ordinalPoint | undefined)
export const SelectedPointsLocalErrorContext = makeGlobal([] as types.PointLocalErrorAnalysis[])
export const AverageLocalErrorsContext = makeGlobal([] as types.AverageLocalErrorAnalysis[])
export const FPTaylorAnalysisContext = makeGlobal([] as types.FPTaylorAnalysis[])
export const FPTaylorRangeContext = makeGlobal([] as types.FPTaylorRange[])
export const InputRangesTableContext = makeGlobal([] as (types.InputRanges | types.RangeInSpecFPCore) [])
export const SelectedInputRangeIdContext = makeGlobal(0)
export const ArchivedExpressionsContext = makeGlobal([] as number[])

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
