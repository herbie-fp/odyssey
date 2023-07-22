import React, { useReducer, useState, createContext, useContext, useEffect } from 'react';

import './HerbieUI.css';

import { SpecComponent } from './SpecComponent';
import { ServerStatusComponent } from './ServerStatus';
import { ResampleComponent } from './ResampleComponent';
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

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h: number, s: number, l: number) {
  const { round } = Math;
  function hueToRgb(p:number, q:number, t:number) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }

  function componentToHex(c :number) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  }
  
  function rgbToHex(r:number, g:number, b:number) {
    return componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  return rgbToHex(round(r * 255), round(g * 255), round(b * 255));
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
  const [averageLocalErrors, setAverageLocalErrors] = Contexts.useGlobal(Contexts.AverageLocalErrorsContext)
  const [selectedPoint,] = Contexts.useGlobal(Contexts.SelectedPointContext)
  const [selectedPointsLocalError, setSelectedPointsLocalError] = Contexts.useGlobal(Contexts.SelectedPointsLocalErrorContext)

  // const [expressionIdsForSpec, setExpressionIdsForSpec] = useState([] as Types.ExpressionIdsForSpec[]);
  //const [inputRangesTable, ] = useState([] as Types.InputRanges[]);
  const [inputRangesTable, setInputRangesTable] = Contexts.useGlobal(Contexts.InputRangesTableContext)

  const [showOverlay, setShowOverlay] = useState(false);  // TODO switch back to show overlay in production

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
        console.log('Getting new analysis for expression', expression.id, 'and sample', sample.id, '...')

        // TODO switch to correct analysis object with full pointsJson info
        //herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(expression.text), samples[samples.length - 1].points, 5)
        try {
          // HACK to make sampling work on Herbie side
          const vars = fpcorejs.getVarnamesMathJS(expression.text)
          const modSample = new Sample(sample.points.map(([x, y], _) => [x.filter((xi, i) => vars.includes(spec.ranges[i].variable)), y]), sample.specId, sample.inputRangesId, sample.id)
          const analysis = await herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(expression.text), modSample, serverUrl)
          console.log('Analysis was:', analysis)
          // analysis now looks like [[[x1, y1], e1], ...]. We want to average the e's

          // setCompareExprIds to include the new expression without duplicates
          setCompareExprIds([...compareExprIds, expression.id].filter((v, i, a) => a.indexOf(v) === i))
          
          return new ErrorAnalysis(analysis, expression.id, sample.id)
        } catch (e) {
          const throwError = (e: any) => () => {
            throw Error(`Analysis failed for expression with id ${expression.id} (${expression.text}) and sample ${sample.id}: ${e}`)
          }
          setTimeout(throwError(e))
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
      const color = '#'+ hslToRgb((expression.id + 7) * 100 % 360 / 360, 1, .4)
        //`hsl(${(expression.id + 7) * 100 % 360}, 100%, 40%)`
      console.debug('color for expression', expression.id, 'is', color)
      return new Types.ExpressionStyle(color, { line: { stroke: color }, dot: { stroke: color } }, expression.id)
    }))
  }, [expressions])

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
        // TODO make sure errors are converted to numbers from strings
        const sample_points = (await (await fetch(`${serverUrl}/api/sample`, { method: 'POST', body: JSON.stringify({ formula: fpcorejs.mathjsToFPCore((spec as Spec).expression), seed: 5 }) })).json()).points
        // setExpressions([])  // prevent samples from updating analyses
        setSamples([...samples, new Sample(sample_points, spec.id, inputRanges.id, nextId(samples))]);
        setExpressions([...expressions, new Expression(spec.expression, nextId(expressions))])
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

  useEffect(() => {
    for (const expression of expressions) {
      for (const sample of samples) {
        async function getLocalError() {
          try {
            // HACK to make sampling work on Herbie side
            const vars = fpcorejs.getVarnamesMathJS(expression.text)
            const modSample = new Sample(sample.points.map(([x, y], _) => [x.filter((xi, i) => vars.includes(spec.ranges[i].variable)), y]), sample.specId, sample.inputRangesId, sample.id)
            const localErrorTree = (await herbiejs.analyzeLocalError(fpcorejs.mathjsToFPCore(expression.text, /*fpcorejs.mathjsToFPCore(spec.expression)*/), modSample, serverUrl))
            setAverageLocalErrors([...averageLocalErrors, new Types.AverageLocalErrorAnalysis(expression.id, sample.id, localErrorTree)])
          } catch (e: any) {
            throw Error(`Local error failed for expression with id ${expression.id} (${expression.text}) and sample ${sample.id}: ${e}`)
          }
          // console.log('Local error was:', localErrorTree)
        }
        if (!averageLocalErrors.find(a => a.expressionId === expression.id && a.sampleId === sample.id)) {
          setTimeout(getLocalError)
        }
      }
    }
  }, [expressions, samples, serverUrl])

  // when the selected point changes, update the selected point local error
  useEffect(() => {
    // const expression = expressions.find(e => e.id === selectedExprId)
    async function getPointLocalError() {
      const localErrors = []
      for (const expression of expressions) {
        if (selectedPoint && expression) {
          // HACK to make sampling work on Herbie side
          const vars = fpcorejs.getVarnamesMathJS(expression.text)
          const modSelectedPoint = selectedPoint.filter((xi, i) => vars.includes(spec.ranges[i].variable))
          localErrors.push(new Types.PointLocalErrorAnalysis(expression.id, selectedPoint, await herbiejs.analyzeLocalError(fpcorejs.mathjsToFPCore(expression.text), { points: [[modSelectedPoint, 1e308]] } as Sample, serverUrl)))
        }
      }
      setSelectedPointsLocalError(localErrors)
    }
    
    setTimeout(getPointLocalError)
  }, [selectedPoint, serverUrl, expressions])

  useEffect(() => {
    console.log('averageLocalErrors:', averageLocalErrors)
  }, [averageLocalErrors])

  return (
    <div className="grid-container">
      <div className="header">
        <SpecComponent {...{showOverlay, setShowOverlay}} />
        <ServerStatusComponent />
      </div>
      <ExpressionTable />
      <SelectableVisualization expressionId={ selectedExprId } />
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