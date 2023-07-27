import React, { createContext } from 'react';
import * as types from './HerbieTypes';

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
export const ExpressionsContext = makeGlobal([new types.Expression('sqrt(x + 1) - sqrt(x)', 0), new types.Expression('x', 1), new types.Expression('sqrt(x + 1)', 2)] as types.Expression[]) 
export const AnalysesContext = makeGlobal([] as types.ErrorAnalysis[])
export const SpecContext = makeGlobal(new types.Spec('sqrt(x + 1) - sqrt(x)', [new types.SpecRange('x', -1e308, 1e308, 0)], 0) as types.Spec)
export const ServerContext = makeGlobal('http://127.0.0.1:8000')
export const ExpressionStylesContext = makeGlobal([] as types.ExpressionStyle[])
export const SelectedSampleIdContext = makeGlobal(-1)
export const SamplesContext = makeGlobal([] as types.Sample[])
export const SelectedPointContext = makeGlobal(undefined as types.ordinalPoint | undefined)
export const SelectedPointsLocalErrorContext = makeGlobal([] as types.PointLocalErrorAnalysis[])
export const AverageLocalErrorsContext = makeGlobal([] as types.AverageLocalErrorAnalysis[])
//createContext({} as { selectedSampleId: number, setSelectedSampleId: React.Dispatch<number> });
// export const ExpressionIdsForSpecsContext = createContext({} as { expressionIdsForSpecs: HerbieTypes.ExpressionIdsForSpec[], setExpressionIdsForSpecs: React.Dispatch<HerbieTypes.ExpressionIdsForSpec[]> });
export const InputRangesTableContext = makeGlobal([new types.InputRanges([new types.SpecRange('x', -1e308, 1e308, 0)], 0, 0)])
export const SelectedInputRangeIdContext = makeGlobal(0)
//createContext({} as { inputRangesTable: HerbieTypes.InputRanges[], setInputRangesTable: React.Dispatch<HerbieTypes.InputRanges[]> });