import React, { useReducer, useState, createContext, useContext, useEffect } from 'react';

import './HerbieUI.css';

import { SpecComponent } from './SpecComponent';
import { ServerStatusComponent } from './ServerStatus';
import { ExpressionTable } from './ExpressionTable';
import * as Contexts from './HerbieContext';
import { Expression, ErrorAnalysis, SpecRange, Spec, Sample } from './HerbieTypes';
import * as Types from './HerbieTypes'
import { nextId } from './utils';
import * as utils from './utils';
import { SelectableVisualization } from './SelectableVisualization';

import * as fpcorejs from './fpcore';
import * as herbiejs from './herbiejs';

interface ContextProviderProps {
  children: React.ReactNode;
}

function GlobalContextProvider ({ children }: ContextProviderProps): JSX.Element {
  const globals = utils.getGlobals().map((g) => {
    return ({ context: g.context, value: useState(g.init) })
  })

  return (
    <>
      {globals.reduceRight((children, { context, value }) => 
        React.createElement(context.Provider, { value }, children)
      , children)}
    </>
  );
}

function HerbieUIInner() {
  const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext)
  const [samples, setSamples] = Contexts.useGlobal(Contexts.SamplesContext)
  const [serverUrl, ] = Contexts.useGlobal(Contexts.ServerContext)
  const [analyses, setAnalyses] = Contexts.useGlobal(Contexts.AnalysesContext)
  const [spec, ] = Contexts.useGlobal(Contexts.SpecContext)
  const [compareExprIds, setCompareExprIds] = Contexts.useGlobal(Contexts.CompareExprIdsContext)
  const [styles, setExpressionStyles] = Contexts.useGlobal(Contexts.ExpressionStylesContext)
  const [selectedExprId, setSelectedExprId] = Contexts.useGlobal(Contexts.SelectedExprIdContext)
  const [selectedSampleId, setSelectedSampleId] = Contexts.useGlobal(Contexts.SelectedSampleIdContext)

  // const [expressionIdsForSpec, setExpressionIdsForSpec] = useState([] as Types.ExpressionIdsForSpec[]);
  //const [inputRangesTable, ] = useState([] as Types.InputRanges[]);
  const [inputRangesTable, setInputRangesTable] = Contexts.useGlobal(Contexts.InputRangesTableContext)

  const [showOverlay, setShowOverlay] = useState(true);

  // Data relationships
  // Reactively update analyses whenever expressions change
  useEffect(() => {
    setTimeout(async () => {
      // When a new expression is added, add a new analysis
      // An analysis is obtained by taking the most recent sample and checking the error of the expression on that sample
      // The analyze server call looks like
      // (await (await fetch(`${serverUrl}/api/analyze`, { method: 'POST', body: JSON.stringify({ formula: fpcorejs.mathjsToFPCore((spec as Spec).expression), sample: samples[samples.length - 1], seed: 5 }) })).json())
      if (samples.length === 0) {
        return
      }
      setAnalyses((await Promise.all(expressions.map(async expression => {
        const sample = samples[samples.length - 1]

        let result = analyses.find(a => a.expressionId === expression.id && a.sampleId === sample.id)
        if (result) {
          return result as ErrorAnalysis
        }
        // TODO switch to correct analysis object with full pointsJson info
        //herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(expression.text), samples[samples.length - 1].points, 5)
        try {
          const analysis = await herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(expression.text), sample, serverUrl)
          // const analysis: [[number, number], number][] = (await (await fetch(`${serverUrl}/api/analyze`, { method: 'POST', body: JSON.stringify({ formula: fpcorejs.mathjsToFPCore(expression.text), sample: samples[samples.length - 1].points, seed: 5 }) })).json()).points
          console.log('Analysis was:', analysis)
          // analysis now looks like [[[x1, y1], e1], ...]. We want to average the e's

          // setCompareExprIds to include the new expression without duplicates
          setCompareExprIds([...compareExprIds, expression.id].filter((v, i, a) => a.indexOf(v) === i))
          
          return new ErrorAnalysis(analysis, expression.id, sample.id)
        } catch (e) {
          throw e;
          // TODO handle + display errors
          return;
        }
      }))).filter(e => e) as ErrorAnalysis[]);
    });
  }, [expressions, samples]);

  // Reactively update expression styles whenever expressions change
  useEffect(() => {
    setExpressionStyles(expressions.map((expression) => {
      // expression styles are just a list of colors for each expression
      // but they do need to be unique
      // and they need to be consistent across renders
      // so we use the expression id to index into a list of colors
      const color = `hsl(${(expression.id + 7) * 100 % 360}, 100%, 40%)`
      return new Types.ExpressionStyle(color, { line: { stroke: color }, dot: { stroke: color } }, expression.id)
    }))
  }, [expressions])
      
  // useEffect(() => {
  //   // if a new expression appears, it is marked as relevant to the current spec
  //   // if an expression is removed, it is marked as irrelevant to the current spec
  //   const newExpressionIds = expressions.map(e => e.id)
  //   setSpec(new Spec(spec.expression, [...spec.expressionIds.filter(id => expressions.map(e => e.id).includes(id)), ...newExpressionIds], spec.ranges, spec.id))
  // }, [expressions])

  // immediately select the first available expression if none is selected
  useEffect(() => {
    if (expressions.length === 1) {
      setSelectedExprId(expressions[0].id);
      setCompareExprIds([expressions[0].id]);
    }
  }, [expressions])

  // Example of calling the server:
  // whenever the spec is defined, 
  // * reset expressions to just the naive expression(the spec)
  // * sample the spec
  useEffect(() => {
    // if (spec !== undefined) {
    async function sample() {
      const inputRanges = inputRangesTable.find(r => r.specId === spec.id)
      if (inputRanges === undefined) {
        throw new Error(`No input ranges found for spec ${spec.id}`)
      }
        // TODO use input range from inputRangesTable in the sample call
        const sample_points = (await (await fetch(`${serverUrl}/api/sample`, { method: 'POST', body: JSON.stringify({ formula: fpcorejs.mathjsToFPCore((spec as Spec).expression), seed: 5 }) })).json()).points
        setExpressions([])  // prevent samples from updating analyses
        setSamples([...samples, new Sample(sample_points, spec.id, inputRanges.id, nextId(samples))]);
        setExpressions([new Expression(spec.expression, nextId(expressions))])
      }
      if (!samples.find(s => s.specId === spec.id)) { sample() }
    // }
  }, [inputRangesTable])

  // Select and show the sample whenever one is added
  useEffect(() => {
    if (samples.length > 0) {
      setSelectedSampleId(samples[samples.length - 1].id)
    }
  }, [samples])

  return (
    <div className="grid-container">
      <div className="header">
        <SpecComponent {...{showOverlay, setShowOverlay}} />
        <ServerStatusComponent />
      </div>
      <ExpressionTable />
      <SelectableVisualization />
    </div>
  );
}

export function HerbieUI() {
  return (
    <GlobalContextProvider>
      <HerbieUIInner />
    </GlobalContextProvider>
  )
}