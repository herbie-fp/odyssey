import React, { useReducer, useState, createContext, useContext, useEffect } from 'react';

import './HerbieUI.css';

import { SpecComponent } from './SpecComponent';
import { ServerStatusComponent } from './ServerStatus';
import { ExpressionTable } from './ExpressionTable';
import * as Contexts from './HerbieContext';
import { Derivation, Expression, ErrorAnalysis, SpecRange, Spec, Sample } from './HerbieTypes';
import * as Types from './HerbieTypes'
import { nextId } from './lib/utils';
import * as utils from './lib/utils';
import { SelectableVisualization } from './SelectableVisualization';
import { ErrorPlot } from './ErrorPlot';
import { DerivationComponent } from './DerivationComponent';
import { FPTaylorComponent } from './FPTaylorComponent';

import * as fpcorejs from './lib/fpcore';
import * as herbiejsImport from './lib/herbiejs';
import GitHubIssueButton from './GitHubIssueButton';
import { DocumentationButton } from './DocumentationButton';

interface ContextProviderProps {
  children: React.ReactNode;
}

function GlobalContextProvider({ children }: ContextProviderProps): JSX.Element {
  const globals = utils.getGlobals().map((g) => {
    return ({ context: g.context, value: useState(g.init) })
  })
  const reducerGlobals = utils.getReducerGlobals().map((g) => {
    return ({ context: g.context, value: useReducer(g.reducer, g.init) })
  })

  return (
    <>
      {[...globals, ...reducerGlobals].reduceRight((children, { context, value }) =>
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
  function hueToRgb(p: number, q: number, t: number) {
    if (t < 0) { t += 1; }
    if (t > 1) { t -= 1; }
    if (t < 1 / 6) { return p + (q - p) * 6 * t; }
    if (t < 1 / 2) { return q; }
    if (t < 2 / 3) { return p + (q - p) * (2 / 3 - t) * 6; }
    return p;
  }
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  function componentToHex(c: number) {
    var hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }

  function rgbToHex(r: number, g: number, b: number) {
    return componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  return rgbToHex(round(r * 255), round(g * 255), round(b * 255));
}

export function addJobRecorder(herbiejs: typeof herbiejsImport) {
  const [, setJobCount] = Contexts.useReducerGlobal(Contexts.JobCountContext)
  function jobRecorder<P extends any[], Q>(f: (...args: P) => Q) {
    return async function run(...args: P) {
      console.debug('Running job', f.name, 'with args', args)
      setJobCount({ type: 'increment' })
      try {
        return await f(...args)
      } finally {
        console.debug('Finished job', f.name, 'with args', args)
        setJobCount({ type: 'decrement' })
      }
    }
  }
  // HACK apply the decorator to all functions in the module
  return utils.applyDecoratorToAllModuleFunctions(herbiejsImport, jobRecorder)
}

function HerbieUIInner() {
  // use declarations
  const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext)
  const [derivations, setDerivations] = Contexts.useGlobal(Contexts.DerivationsContext)
  const [samples, setSamples] = Contexts.useGlobal(Contexts.SamplesContext)
  const [serverUrl,] = Contexts.useGlobal(Contexts.ServerContext)
  const [analyses, setAnalyses] = Contexts.useGlobal(Contexts.AnalysesContext)
  const [spec,] = Contexts.useGlobal(Contexts.SpecContext)
  const [compareExprIds, setCompareExprIds] = Contexts.useGlobal(Contexts.CompareExprIdsContext)
  const [styles, setExpressionStyles] = Contexts.useGlobal(Contexts.ExpressionStylesContext)
  const [selectedExprId, setSelectedExprId] = Contexts.useGlobal(Contexts.SelectedExprIdContext)
  const [selectedSampleId, setSelectedSampleId] = Contexts.useGlobal(Contexts.SelectedSampleIdContext)
  const [averageLocalErrors, setAverageLocalErrors] = Contexts.useGlobal(Contexts.AverageLocalErrorsContext)
  const [selectedPoint,] = Contexts.useGlobal(Contexts.SelectedPointContext)
  const [selectedPointsLocalError, setSelectedPointsLocalError] = Contexts.useGlobal(Contexts.SelectedPointsLocalErrorContext);
  const [FPTaylorAnalysis, setFPTaylorAnalysis] = Contexts.useGlobal(Contexts.FPTaylorAnalysisContext);
  const [FPTaylorRanges, setFPTaylorRanges] = Contexts.useGlobal(Contexts.FPTaylorRangeContext);
  const [inputRangesTable,] = Contexts.useGlobal(Contexts.InputRangesTableContext)
  const [archivedExpressions,] = Contexts.useGlobal(Contexts.ArchivedExpressionsContext)

  const herbiejs = addJobRecorder(herbiejsImport)

  const [showOverlay, setShowOverlay] = useState(true);

  // Data relationships
  // Reactively update analyses whenever expressions change
  useEffect(updateAnalyses, [spec, expressions, samples]);
  function updateAnalyses() {
    async function updateAnalysesAsync() {
      // When a new expression is added, add a new analysis
      // An analysis is obtained by taking the most recent sample and checking the error of the expression on that sample
      if (samples.length === 0) {
        return
      }
      setAnalyses((await Promise.all(expressions.map(async expression => {
        const sample = samples[samples.length - 1]

        let result = analyses.find(a => a.expressionId === expression.id && a.sampleId === sample.id)
        if (result) {
          return result as ErrorAnalysis
        }

        // Only get analyses for the current spec
        if (sample.specId !== spec.id) {
          return;
        }
        console.debug('Getting new analysis for expression', expression, 'and sample', sample, '...')

        try {
          // HACK to make sampling work on Herbie side
          const specVars = fpcorejs.getVarnamesMathJS(spec.expression)
          const analysis = await herbiejs.analyzeExpression(fpcorejs.mathjsToFPCore(expression.text, spec.expression, specVars), sample, serverUrl)
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
    }
    updateAnalysesAsync();
  }

  // Reactively update expression styles whenever expressions change

  useEffect(updateExpressionStyles, [expressions])
  function updateExpressionStyles() {
    setExpressionStyles(expressions.map((expression) => {
      // expression styles are just a list of colors for each expression
      // but they do need to be unique
      // and they need to be consistent across renders
      // so we use the expression id to index into a list of colors
      const color = '#' + hslToRgb((expression.id + 7) * 100 % 360 / 360, 1, .4)
      //`hsl(${(expression.id + 7) * 100 % 360}, 100%, 40%)`
      console.debug('color for expression', expression.id, 'is', color)
      return new Types.ExpressionStyle(color, { line: { stroke: color }, dot: { stroke: color } }, expression.id)
    }))
  }

  // HACK immediately select the first available expression if none is selected
  useEffect(selectFirstExpression, [expressions])
  function selectFirstExpression() {
    if (expressions.length > 0) {
      setSelectedExprId(expressions[0].id);
      setCompareExprIds([expressions[0].id]);
    }
  }

  // Example of calling the server:
  // whenever a new input range is defined,
  // * reset expressions to just the naive expression(the spec)
  // * sample the spec
  useEffect(sampleSpecOnInputRange, [spec, inputRangesTable])
  function sampleSpecOnInputRange() {
    async function sample() {
      const inputRanges = inputRangesTable.findLast(r => r.specId === spec.id)
      if (inputRanges === undefined) {
        console.debug(`No input ranges found for spec ${spec.id}. Input ranges and spec must be defined for sampling to occur.`)
        return;
      }
      if (samples.find(s => s.inputRangesId === inputRanges.id)) {
        console.debug(`Already sampled for input ranges ${inputRanges.id}. Skipping.`)
        return;
      }
      console.debug(`Sampling spec ${spec.id} for input ranges ${inputRanges.id}...`)
      console.debug(herbiejs.getSample)

      const fpCore =
        (inputRanges instanceof Types.InputRanges) ?
          fpcorejs.makeFPCore2({
            vars: fpcorejs.getVarnamesMathJS(spec.expression),
            pre: fpcorejs.FPCorePreconditionFromRanges(
              inputRanges.ranges.map(r => [r.variable, [r.lowerBound, r.upperBound]])
            ),
            body: fpcorejs.FPCoreBody(spec.expression)
          })
          : spec.fpcore

      if (!fpCore) {
        return  // should never get here
      }

      const sample_points = (await herbiejs.getSample(fpCore, serverUrl)).points;
      // always create a new sample with this spec and these input ranges
      const sample = new Sample(sample_points, spec.id, inputRanges.id, nextId(samples))
      setSamples([...samples, sample]);
      console.debug(`Sampled spec ${spec.id} for input ranges ${inputRanges.id}:`, sample)
    }
    sample()
  }

  // Add spec to expressions if it doesn't exist
  useEffect(addSpecToExpressions, [spec, expressions])
  function addSpecToExpressions() {
    if (expressions.find(e => e.text === spec.expression)) { return }
    const expressionId = nextId(expressions)
    console.debug(`Adding spec ${spec.expression} to expressions with id ${expressionId}...`)
    setExpressions([new Expression(spec.expression, expressionId, spec.id), ...expressions])
    setDerivations([
      new Derivation("<p>Original Spec Expression</p>", expressionId, undefined),
      ...derivations,
    ]);
  }

  // // Select and show the sample whenever one is added
  useEffect(selectLastSample, [samples])
  function selectLastSample() {
    if (samples.length > 0) {
      setSelectedSampleId(samples[samples.length - 1].id)
    }
  }

  // Reactively update average local errors (currently off because this gets very slow)
  // useEffect(updateAverageLocalErrors, [expressions, samples, serverUrl])
  function updateAverageLocalErrors() {
    /* A little tricky. We have to make sure that we've collected our responses and then update the state in one pass. */
    async function getLocalErrorUpdates() {
      async function getLocalError(expression: Expression, sample: Sample) {
        try {
          // HACK to make sampling work on Herbie side
          const vars = fpcorejs.getVarnamesMathJS(expression.text)
          const specVars = fpcorejs.getVarnamesMathJS(spec.expression)
          const modSample = new Sample(sample.points.map(([x, y], _) => [x.filter((xi, i) => vars.includes(specVars[i])), y]), sample.specId, sample.inputRangesId, sample.id)
          const localErrorTree = (await herbiejs.analyzeLocalError(fpcorejs.mathjsToFPCore(expression.text, /*fpcorejs.mathjsToFPCore(spec.expression)*/), modSample, serverUrl))
          return new Types.AverageLocalErrorAnalysis(expression.id, sample.id, localErrorTree)
          // updates.push(new Types.AverageLocalErrorAnalysis(expression.id, sample.id, localErrorTree))
        } catch (e: any) {
          return Error(`Local error failed for expression with id ${expression.id} (${expression.text}) and sample ${sample.id}: ${e}`)
        }
      }
      const updates = await Promise.all((await Promise.all(expressions.map(e => samples.map(s => getLocalError(e, s))))).flat())
      const nonErrors = updates.filter(e => !(e instanceof Error)) as Types.AverageLocalErrorAnalysis[];
      const errors = updates.filter(e => e instanceof Error)
      setAverageLocalErrors([...averageLocalErrors, ...nonErrors])
      if (errors.length > 0) {
        throw errors[0]
      }
    }
    setTimeout(getLocalErrorUpdates)
  }

  // when the selected point changes, update the selected point local error
  useEffect(updateSelectedPointLocalError, [selectedPoint, serverUrl, expressions])
  function updateSelectedPointLocalError() {
    async function getPointLocalError() {
      const localErrors = []
      for (const expression of expressions) {
        if (selectedPoint && expression) {
          // HACK to make sampling work on Herbie side
          const vars = fpcorejs.getVarnamesMathJS(expression.text)
          const specVars = fpcorejs.getVarnamesMathJS(spec.expression)
          const modSelectedPoint = selectedPoint.filter((xi, i) => vars.includes(specVars[i]))
          localErrors.push(
            new Types.PointLocalErrorAnalysis(
              expression.id,
              selectedPoint,
              await herbiejs.analyzeLocalError(
                fpcorejs.mathjsToFPCore(expression.text),
                { points: [[modSelectedPoint, 1e308]] } as Sample,
                serverUrl
              )
            )
          )
        }
      }
      setSelectedPointsLocalError(localErrors)
    }

    setTimeout(getPointLocalError)
  }

  useEffect(updateFPTaylorAnalysis, [FPTaylorRanges, serverUrl, expressions])
  function updateFPTaylorAnalysis() {
    async function getFPTaylorAnalysis() {
      const FPTaylorAnalyses: Types.FPTaylorAnalysis[] = []
      for (const expression of expressions) {
        if (expression && FPTaylorRanges) {
          // Get the expression itself
          const index = expression.id;

          // Get the ranges
          const ranges: [string, [number, number]][] = FPTaylorRanges.find((item) => item?.expressionId === index)?.ranges.map(
            ({ variable, lowerBound, upperBound }) => [variable, [lowerBound, upperBound]]
          ) || [];
          if (!ranges) {
            continue
          }

          const formula = fpcorejs.makeFPCore2({
            vars: fpcorejs.getVarnamesMathJS(expression.text),
            pre: fpcorejs.FPCorePreconditionFromRanges(ranges),
            body: fpcorejs.FPCoreBody(expression.text)
          })

          console.log(formula)

          const fptaylorInputResponse = await (await fetch(
            "http://localhost:8888/fpbench",
            {
              method: 'POST', // *GET, POST, PUT, DELETE, etc.
              mode: 'cors', // no-cors, *cors, same-origin
              cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
              credentials: 'same-origin', // include, *same-origin, omit
              headers: {
                'Content-Type': 'application/json'
              },
              redirect: 'follow', // manual, *follow, error
              referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
              body: JSON.stringify({ 'formulas': [formula] }) // body data type must match "Content-Type" header
            }
          )).json();

          const fptaylorInput = fptaylorInputResponse.stdout;

          const parseFPTaylorOutput = async (text: string) => {
            const response = [];
            try {
                const bounds = [...text.matchAll(/Bounds \(without rounding\): (.*)$/gm)];
                const abserror = [...text.matchAll(/Absolute error \(exact\): (.*)\(/gm)];
                for (let i = 0; i < bounds.length || i < abserror.length; i++) {
                    const boundsValue = bounds[i] ? bounds[i][1] : null;
                    const abserrorValue = abserror[i] ? abserror[i][1] : null;
                    response.push({ bounds: boundsValue, absoluteError: abserrorValue });
                }
            } catch (e) {
                console.error(e);
            }
        
            return response;
        };        

          const fptaylorResult = await parseFPTaylorOutput((
            await (
              await fetch(
                "http://localhost:8888/fptaylor",
                {
                  method: 'POST', // *GET, POST, PUT, DELETE, etc.
                  mode: 'cors', // no-cors, *cors, same-origin
                  cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
                  credentials: 'same-origin', // include, *same-origin, omit
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  redirect: 'follow', // manual, *follow, error
                  referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
                  body: JSON.stringify({ 'fptaylorInput': fptaylorInput }) // body data type must match "Content-Type" header
                }
              )
            ).json()
          ).output)

          FPTaylorAnalyses.splice(index, 0,
            new Types.FPTaylorAnalysis(
              index,
              fptaylorResult
            )
          )
        }
      }

      console.log(FPTaylorAnalyses)
      setFPTaylorAnalysis(FPTaylorAnalyses)
    }

    setTimeout(getFPTaylorAnalysis)
  }

  const components = [
    { value: 'errorPlot', label: 'Error Plot', component: <ErrorPlot /> },
    // { value: 'localError', label: 'Local Error', component: <LocalError expressionId={expressionId} /> },
    { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent expressionId={selectedExprId} /> },
    // { value: 'fpTaylorComponent', label: 'FPTaylor', component: <FPTaylorComponent/> },
  ];

  return (
    <div className="grid-container">
      <div className="header">
        <div className="header-top">
          <div className="app-name">Odyssey</div>
          <ServerStatusComponent />
        </div>
        <SpecComponent {...{ showOverlay, setShowOverlay }} />
      </div>
      <ExpressionTable />
      <SelectableVisualization components={components} />
      <div className="help-buttons" >
        <DocumentationButton />
        <GitHubIssueButton />
      </div>
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
