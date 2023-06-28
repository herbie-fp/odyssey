import React, { useReducer, useState, createContext, useContext, useEffect } from 'react';

import './HerbieUI.css';

import { SpecComponent } from './SpecComponent';
import { ServerStatusComponent } from './StatusComponent';
import { ExpressionTable } from './ExpressionTable';
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext';
import * as Contexts from './HerbieContext';
import { Expression, ErrorAnalysis, SpecRange, Spec, Sample } from './HerbieTypes';
import * as Types from './HerbieTypes'
import { nextId } from './utils';
import { SelectableVisualization } from './SelectableVisualization';

import * as fpcorejs from './fpcore';

function HerbieUI() {
  // State setters/getters (provided to children via React context)
  const [expressions, setExpressions] = useState([] as Expression[]);
  const [samples, setSamples] = useState([] as Sample[]);
  const [serverUrl, setServerUrl] = useState('http://127.0.0.1:8000')
  const [analyses, setAnalyses] = useState([] as ErrorAnalysis[]);
  const [selectedExprId, setSelectedExprId] = useState(-1);
  const [spec, setSpec] = useState(undefined as Spec | undefined)//new Spec('sqrt(x + 1) - sqrt(x)', [new SpecRange('x', -1e308, 1e308, 0)], 0))
  const [compareExprIds, setCompareExprIds] = useState([] as number[]);
  const [expressionStyles, setExpressionStyles] = useState([] as Types.ExpressionStyle[]);
  
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
      setAnalyses(await Promise.all(expressions.map(async expression => {
        let result = analyses.find(a => a.expressionId === expression.id)
        if (result) {
          return result as ErrorAnalysis
        }
        const analysis : [[number, number], number][] = (await (await fetch(`${serverUrl}/api/analyze`, { method: 'POST', body: JSON.stringify({ formula: fpcorejs.mathjsToFPCore(expression.text), sample: samples[samples.length - 1].points, seed: 5 }) })).json()).points
        console.log('Analysis was:', analysis)
        // analysis now looks like [[[x1, y1], e1], ...]. We want to average the e's
        return new ErrorAnalysis(analysis, expression.id)
      })));
    }, 1000);
  }, [expressions, samples]);

  // immediately select the first available expression if none is selected
  useEffect(() => {
    if (expressions.length === 1) {
      setSelectedExprId(expressions[0].id);
    }
  }, [expressions])

  // Example of calling the server:
  // whenever the spec is defined, 
  // * reset expressions to just the naive expression(the spec)
  // * sample the spec
  useEffect(() => {
    if (spec !== undefined) {
      setExpressions([new Expression(spec.expression, spec.id)]);
      async function sample() {
        const sample_points = (await (await fetch(`${serverUrl}/api/sample`, { method: 'POST', body: JSON.stringify({ formula: fpcorejs.mathjsToFPCore((spec as Spec).expression), seed: 5 }) })).json()).points
        console.log(sample_points)
        setSamples([...samples, new Sample(sample_points, nextId(samples))]);
      }
      sample()
    }
  }, [spec])

  // Show the sample whenever it changes
  useEffect(() => {
    console.log(samples)
  }, [samples])

  function HerbieUIInner() {
    return (
      <div className="grid-container">
        <div className="header">
          <SpecComponent />
          <ServerStatusComponent />
        </div>
        <ExpressionTable />
        <SelectableVisualization />
      </div>
    );
  }
  return (
    // provide contexts to all components-- kind of awkward, but it works
    // a little better than passing props down the tree. Reducers would be better,
    // but they introduce unnecessary re-renders if we group the state together.
    // I would definitely like to know if there's a better way of doing this.
    <SpecContext.Provider value={{ spec, setSpec }}>
      <SelectedExprIdContext.Provider value={{ selectedExprId, setSelectedExprId }}>
        <ExpressionsContext.Provider value={{ expressions, setExpressions }}>
          <AnalysesContext.Provider value={{ analyses, setAnalyses }}>
            <CompareExprIdsContext.Provider value={{ compareExprIds, setCompareExprIds }}>
              <Contexts.ExpressionStylesContext.Provider value={{ expressionStyles, setExpressionStyles }}>
                <HerbieUIInner />
              </Contexts.ExpressionStylesContext.Provider>
            </CompareExprIdsContext.Provider>
          </AnalysesContext.Provider>
        </ExpressionsContext.Provider>
      </SelectedExprIdContext.Provider>
    </SpecContext.Provider>
  );
}

export { HerbieUI };