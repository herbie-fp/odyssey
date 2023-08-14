import React, { createContext } from 'react';
import * as types from './HerbieTypes';
import * as herbiejs from './herbiejs';

type setter<T> = React.Dispatch<T>

export interface Global<T> {
  isGlobal: true
  context: React.Context<[T, setter<T>]>
  init: T
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

export const hoveredExpressionId = makeGlobal(0)
export const SelectedExprIdContext = makeGlobal(-1)
export const CompareExprIdsContext = makeGlobal([] as number[]) //createContext({} as { compareExprIds: number[], setCompareExprIds: React.Dispatch<number[]> });
export const ExpressionsContext = makeGlobal([] as types.Expression[]);//[new types.Expression('x', 1), new types.Expression('sqrt(x + 1)', 2)] as types.Expression[]) 
export const DerivationsContext = makeGlobal([new types.Derivation('<p>Default Expression<p>',0),new types.Derivation('<p>Default Expression<p>',1),new types.Derivation('<p>Default Expression<p>',2),] as types.Derivation[]) 
export const AnalysesContext = makeGlobal([] as types.ErrorAnalysis[])
export const SpecContext = makeGlobal(new types.Spec('sqrt(x + 1) - sqrt(x)', 0) as types.Spec)
export const ServerContext = makeGlobal('http://127.0.0.1:8000')
export const ExpressionStylesContext = makeGlobal([] as types.ExpressionStyle[])
export const SelectedSampleIdContext = makeGlobal(undefined as number | undefined);// undefined as number | undefined)
export const SamplesContext = makeGlobal([] as types.Sample[])
export const SelectedPointContext = makeGlobal(undefined as types.ordinalPoint | undefined)
export const SelectedPointsLocalErrorContext = makeGlobal([] as types.PointLocalErrorAnalysis[])
export const AverageLocalErrorsContext = makeGlobal([] as types.AverageLocalErrorAnalysis[])
export const InputRangesTableContext = makeGlobal([] as types.InputRanges[])
export const SelectedInputRangeIdContext = makeGlobal(0)
export const ArchivedExpressionsContext = makeGlobal([] as number[])