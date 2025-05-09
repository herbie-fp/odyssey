import React, { useReducer, useState, createContext, useContext, useEffect } from 'react';

import './HerbieUI.css';

import * as HerbieTypes from './HerbieTypes'
import * as HerbieContext from './HerbieContext';

import { SpecComponent } from './SpecComponent';
import { ServerStatusComponent } from './ServerStatus';
import { SerializeStateComponent } from './SerializeStateComponent';
import { ExpressionTable } from './ExpressionTable';
import { SelectableVisualization } from './SelectableVisualization';
import { ErrorPlot } from './ErrorPlot';
import { DerivationComponent } from './DerivationComponent';
import SpeedVersusAccuracyPareto from './SpeedVersusAccuracyPareto';
import { expressionToTex } from './ExpressionTable';

import * as utils from './lib/utils';
import { getApi } from './lib/servercalls';
import * as fpcorejs from './lib/fpcore';
import * as herbiejs from './lib/herbiejs';
import { ToastContainer } from 'react-toastify';
import { ErrorBoundary as ErrorBoundary2 } from "react-error-boundary";

const { Octokit } = require("@octokit/core");
import { nextId } from './lib/utils';

import 'react-toastify/dist/ReactToastify.css';
import ErrorBoundary from '../ErrorBoundary';

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

export function addJobRecorder(_: typeof herbiejs) {
  const [, setJobCount] = HerbieContext.useReducerGlobal(HerbieContext.JobCountContext)
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
  return utils.applyDecoratorToAllModuleFunctions(herbiejs, jobRecorder)
}

function HerbieUIInner() {
  // use declarations
  const [expressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [derivations, setDerivations] = HerbieContext.useGlobal(HerbieContext.DerivationsContext)
  const [samples, setSamples] = HerbieContext.useGlobal(HerbieContext.SamplesContext)
  const [serverUrl, setServerUrl] = HerbieContext.useGlobal(HerbieContext.ServerContext)
  const [fptaylorServerUrl, setFPTaylorServerUrl] = HerbieContext.useGlobal(HerbieContext.FPTaylorServerContext)
  const [fpbenchServerUrl, setFPBenchServerUrl] = HerbieContext.useGlobal(HerbieContext.FPBenchServerContext)
  const [analyses, setAnalyses] = HerbieContext.useGlobal(HerbieContext.AnalysesContext)
  const [cost, setCosts] = HerbieContext.useGlobal(HerbieContext.CostContext)
  const [spec, setSpec] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [compareExprIds, setCompareExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext)
  const [styles, setExpressionStyles] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext)
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)
  const [selectedSampleId, setSelectedSampleId] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [averageLocalErrors, setAverageLocalErrors] = HerbieContext.useGlobal(HerbieContext.AverageLocalErrorsContext)
  const [selectedPoint, setSelectedPoint] = HerbieContext.useGlobal(HerbieContext.SelectedPointContext)
  const [selectedSubsetRange, setSelectedSubset] = HerbieContext.useGlobal(HerbieContext.SelectedSubsetRangeContext);
  const [selectedSubsetAnalyses, setSelectedSubsetAnalyses] = HerbieContext.useGlobal(HerbieContext.SelectedSubsetAnalysesContext);
  const [selectedPointsLocalError, setSelectedPointsLocalError] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
  const [selectedPointsErrorExp, setSelectedPointsErrorExp] = HerbieContext.useGlobal(HerbieContext.SelectedPointsErrorExpContext);
  const [FPTaylorAnalysis, setFPTaylorAnalysis] = HerbieContext.useGlobal(HerbieContext.FPTaylorAnalysisContext);
  const [FPTaylorRanges, setFPTaylorRanges] = HerbieContext.useGlobal(HerbieContext.FPTaylorRangeContext);
  const [inputRangesTable, setInputRangesTable] = HerbieContext.useGlobal(HerbieContext.InputRangesTableContext)
  const [archivedExpressions, setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext)
  const [expandedExpressions, setExpandedExpressions] = HerbieContext.useGlobal(HerbieContext.ExpandedExpressionsContext)

  const herbiejsJobs = addJobRecorder(herbiejs)

  const [showSpecEntry, setShowSpecEntry] = useState(true);

  // onLoad of Odyssey, check if any url params have been passed in specifying
  // expression to load. Explore that immediately instead of showing spec page
  useEffect(loadSpecByURL, []);
  function loadSpecByURL() {
    const submitURLSpec = async (urlExpr: string, urlAlts: string | null) => {
      // Manually trigger explore with default values
      const specId = spec.id + 1;
      const urlSpec = new HerbieTypes.Spec(urlExpr, specId);
      const variables = fpcorejs.getVarnamesMathJS(urlExpr);

      // TODO: do expression validation, see SpecComponent
      setSpec(urlSpec);

      // Get ranges from URL parameters if they exist
      const customRanges = getRangesFromURL(variables);
      
      // Use custom ranges if provided, otherwise use defaults
      const defaultRanges = [];
      for (const v of variables) {
        const customRange = customRanges.find(r => r.variable === v);
        if (customRange) {
          defaultRanges.push(customRange);
        } else {
          defaultRanges.push(new HerbieTypes.SpecRange(v, -1e308, 1e308));
        }
      }

      setInputRangesTable([...inputRangesTable, new HerbieTypes.InputRanges(
        defaultRanges,
        specId,
        utils.nextId(inputRangesTable)
      )]);

      if (urlAlts !== null) {    
        const alts: HerbieTypes.Expression[] = [];    
        let expId = 0;
        // alternatives given in , separated list under "alts"
        for (const alt of urlAlts.split(',')) {
          alts.push(new HerbieTypes.Expression(
            alt, ++expId, specId, await expressionToTex(alt, variables.length, serverUrl)))
        }
        // Manually add spec to expressions list so ids line up nicely
        alts.push(new HerbieTypes.Expression(
          urlExpr, 0, specId, await expressionToTex(urlExpr, variables.length, serverUrl)));

        setExpressions(alts)
        setCompareExprIds(alts.map(a => a.id))
      }

      // TODO: add logging

      // Skip showing spec entry page, go straight to main page
      setShowSpecEntry(false);
    }

    // Helper function to parse ranges from URL
    const getRangesFromURL = (variables: string[]): HerbieTypes.SpecRange[] => {
      const ranges: HerbieTypes.SpecRange[] = [];
      
      if (typeof window !== 'undefined') {
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for ranges in URL using format: range_<varname>=min,max
        variables.forEach(varName => {
          const rangeParam = queryParams.get(`range_${varName}`);
          if (rangeParam) {
            const [min, max] = rangeParam.split(',').map(Number);
            if (!isNaN(min) && !isNaN(max)) {
              ranges.push(new HerbieTypes.SpecRange(varName, min, max));
            }
          }
        });
      }
      
      return ranges;
    };

    // If this is running on the web, allow URL to pass in default expression
    if (typeof window !== 'undefined') {
      const queryParams = new URLSearchParams(window.location.search);
      const urlExpr = queryParams.get('spec');
      const urlAlts = queryParams.get('alts');

      if (urlExpr !== null) {
        // It only makes sense to have alternatives if there was a spec given
        submitURLSpec(urlExpr, urlAlts);
      }
    }
  }

  // Load in data from URL with gistID
  useEffect(loadSpecFromURLGistId, [])
  function loadSpecFromURLGistId() {
    // -----------------
    const loadSpecFromGist = async (gistId: string) => {
      const octokit = new Octokit();

      try {

        const response = await octokit.request("GET /gists/{gist_id}", {
          gist_id: gistId,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
            "accept": "application/vnd.github+json",
          },
        });
  
        const fileKey = Object.keys(response.data.files)[0];

        if (fileKey.length === 0) throw new Error("No files found in Gist.");

        const rawUrl = response.data.files[fileKey].raw_url;
  
        const rawResponse = await fetch(rawUrl);
        const jsonState = await rawResponse.json();

        console.log("gist jsonState from gist:", gistId, jsonState);

        // LOAD THE STATE FROM JSON
        // ------------------------

        setServerUrl(jsonState.serverUrl);
        setFPTaylorServerUrl(jsonState.fptaylorServerUrl);
        setFPBenchServerUrl(jsonState.fpbenchServerUrl);

        const newSpecId = spec.id + 1;
        const inputRangeId = nextId(inputRangesTable);

        const inputRanges = jsonState.specRanges
        ? new HerbieTypes.InputRanges(jsonState.specRanges, newSpecId, inputRangeId)
        : new HerbieTypes.RangeInSpecFPCore(newSpecId, inputRangeId);

        setArchivedExpressions(expressions.map(e => e.id));
        setInputRangesTable([...inputRangesTable, inputRanges]);
        setSpec({ expression: jsonState.spec.expression, id: newSpecId, fpcore: jsonState.spec.fpcore });

        const oldIdToNew: Map<number, HerbieTypes.Expression> = new Map();
        const newExpressions = [];
        const newDerivations = [];

        for (let i = 0; i < jsonState.expressions.length; i++) {
          const expr = jsonState.expressions[i];
          const newId = nextId(expressions) + i;
          const newExpr = new HerbieTypes.Expression(expr.text, newId, newSpecId, expr.tex);
          oldIdToNew.set(expr.id, newExpr);
          newExpressions.push(newExpr);
        }

        for (const deriv of jsonState.derivations) {
          const newExpr = oldIdToNew.get(deriv.id);
          const newParent = deriv.origExpId ? oldIdToNew.get(deriv.origExpId) : undefined;
          if (newExpr) {
            newDerivations.push(new HerbieTypes.Derivation(deriv.history, newExpr.id, newParent?.id));
          }
        }

        setExpressions([...newExpressions, ...expressions]);
        setDerivations([...newDerivations, ...derivations]);
        setSelectedExprId(oldIdToNew.get(jsonState.selectedExprId)?.id ?? -1);
        setExpandedExpressions(jsonState.expandedExpressions.map((id: number) => oldIdToNew.get(id)?.id ?? -1));
        setCompareExprIds(jsonState.compareExprIds.map((id: number) => oldIdToNew.get(id)?.id ?? -1));

        // ------------------------
        
        setShowSpecEntry(false);

      } catch (err) {
        console.error("Failed to import state from Gist:", err);
      } 

    };

    // -----------------
    const queryParams = new URLSearchParams(window.location.search);

    const gistId = queryParams.get('gist');
    
    if (gistId != null) {
      loadSpecFromGist(gistId);
    }
  }

  // Data relationships

  // when the spec changes, unset the selected point & brushing
  useEffect(unsetSelectedPointAndExpression, [spec])
  function unsetSelectedPointAndExpression() {
    setSelectedPoint(undefined)
    setSelectedSubset(undefined)
  }

  // HACK immediately select the first available expression if none is selected
  // NOTE this doesn't activate when the compareExprIds are set because it causes blinking
  useEffect(selectFirstExpression, [expressions, archivedExpressions])
  function selectFirstExpression() {
    const activeExpressionIds = expressions.filter(e => !archivedExpressions.includes(e.id)).map(e => e.id)
    if (activeExpressionIds.length === 0) {
      return
    }
    if (expressions.length > 0) {
      if (selectedExprId === -1 || archivedExpressions.includes(selectedExprId)) {
        setSelectedExprId(activeExpressionIds[0])
      }
      if (compareExprIds.length === 0) {
        setCompareExprIds(expressions.filter(e => e.specId === spec.id && e.text === spec.expression).map(e => e.id) || activeExpressionIds.slice(0, 1));
      }
    }
  }

  // Reactively update analyses whenever expressions change
  useEffect(updateAnalyses, [spec, expressions, samples, archivedExpressions]);
  function updateAnalyses() {
    async function updateAnalysesAsync() {
      // When a new expression is added, add a new analysis
      // An analysis is obtained by taking the most recent sample and checking the error of the expression on that sample
      if (samples.length === 0) {
        return
      }
      const activeExpressions = expressions.filter(e => !archivedExpressions.includes(e.id))
      setAnalyses((await Promise.all(activeExpressions.map(async expression => {
        const sample = samples[samples.length - 1]

        let result = analyses.find(a => a.expressionId === expression.id && a.sampleId === sample.id)
        if (result) {
          return result as HerbieTypes.ErrorAnalysis
        }

        // Only get analyses for the current spec
        if (sample.specId !== spec.id) {
          return;
        }
        console.debug('Getting new analysis for expression', expression, 'and sample', sample, '...')

        try {
          // HACK to make sampling work on Herbie side
          const specVars = fpcorejs.getVarnamesMathJS(spec.expression)
          const analysis = await herbiejsJobs.analyzeExpression(fpcorejs.mathjsToFPCore(expression.text, spec.expression, specVars), sample, serverUrl)
          // analysis now looks like [[[x1, y1], e1], ...]. We want to average the e's

          return new HerbieTypes.ErrorAnalysis(analysis, expression.id, sample.id)
        } catch (e) {
          const throwError = (e: any) => () => {
            throw Error(`Analysis failed for expression with id ${expression.id} (${expression.text}) and sample ${sample.id}: ${e}`)
          }
          setTimeout(throwError(e))
          return;
        }
      }))).filter(e => e) as HerbieTypes.ErrorAnalysis[]);
    }
    updateAnalysesAsync();
  }

  //create useEffect to update Cost whenever expressions/samples change
  useEffect(updateCost, [expressions, samples, archivedExpressions]);
  function updateCost() {
    async function updateCostAsync() {
      if (samples.length === 0) {
        return
      }
      const activeExpressions = expressions.filter(e => !archivedExpressions.includes(e.id))
      setCosts((await Promise.all(activeExpressions.map(async expression => {
        const sample = samples[samples.length - 1]

        let result = cost.find(a => a.expressionId === expression.id)
        if (result) {
          return result as HerbieTypes.CostAnalysis
        }

        // Only get analyses for the current spec
        if (sample.specId !== spec.id) {
          return;
        }

        try {
          const formula = fpcorejs.mathjsToFPCore(expression.text);
          const costData = await herbiejsJobs.getCost(formula, sample, serverUrl);

          return new HerbieTypes.CostAnalysis(expression.id, costData);
        } catch (e) {
          const throwError = (e: any) => () => {
            throw Error(`Cost analysis failed for expression with id ${expression.id} (${expression.text}) and sample ${sample.id}: ${e}`)
          }
          setTimeout(throwError(e))
          return;
        }
      }))).filter(e => e) as HerbieTypes.CostAnalysis[]);
    }
    updateCostAsync();
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
      return new HerbieTypes.ExpressionStyle(color, { line: { stroke: color }, dot: { stroke: color } }, expression.id)
    }))
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
      console.debug(herbiejsJobs.getSample)

      const fpCore =
        (inputRanges instanceof HerbieTypes.InputRanges) ?
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

      const sample_points = (await herbiejsJobs.getSample(fpCore, serverUrl)).points;
      // always create a new sample with this spec and these input ranges
      const sample = new HerbieTypes.Sample(sample_points, spec.id, inputRanges.id, utils.nextId(samples))
      setSamples([...samples, sample]);
      console.debug(`Sampled spec ${spec.id} for input ranges ${inputRanges.id}:`, sample)
    }
    sample()
  }

  // Whenever a subset of points is selected (brushing completes)
  // * perform an analysis for the points in the selected range
  // * do NOT change the input range component
  useEffect(updateSubsetAnalyses, [selectedSubsetRange, analyses])
  function updateSubsetAnalyses() {
    if (selectedSubsetRange) {
      // Get analyses for active expressions
      const activeAnalyses = analyses.filter(a => !archivedExpressions.includes(a.expressionId))

      const brushedVar = selectedSubsetRange.varIdx;
      const brushedSize = selectedSubsetRange.points.length;

      const subsetAnalyses: HerbieTypes.SubsetErrorAnalysis[] = [];
      for (const a of activeAnalyses) {
        const subsetErrors = [];
        // Don't resample/analyze for any expressions, take subset of existing
        for (const [i, ordSamplePoint] of a.data.ordinalSample.entries()) {
          if (ordSamplePoint[brushedVar] >= selectedSubsetRange.points[0][brushedVar] 
            && ordSamplePoint[brushedVar] <= selectedSubsetRange.points[brushedSize - 1][brushedVar]) {
              subsetErrors.push(a.data.errors[i]); // Indicies of errors and ordinalPoints align 1:1
          }
        }

        const subsetErrorResult = (subsetErrors.reduce((acc: number, v: any) => {
          return acc + v;
        }, 0) / subsetErrors.length).toFixed(2);

        subsetAnalyses.push({expressionId: a.expressionId, subsetErrorResult});
      }

      setSelectedSubsetAnalyses(subsetAnalyses);
    }
  }

  // Add spec to expressions if it doesn't exist
  useEffect(addSpecToExpressions, [spec, expressions])
  function addSpecToExpressions() {
    async function add() {

      if (spec.expression === '' || expressions.find(e =>
        e.specId === spec.id)) { return }
      const expressionId = utils.nextId(expressions)
      const tex = await expressionToTex(spec.expression, fpcorejs.getVarnamesMathJS(spec.expression).length,serverUrl);
      console.debug(`Adding spec ${spec.expression} to expressions with id ${expressionId}...`)
      setExpressions([new HerbieTypes.Expression(spec.expression, expressionId, spec.id, tex), ...expressions])
      
      if (spec.expression === '' || expressions.find(e => e.specId === spec.id)) {
        setDerivations(derivations)
        setExpressions(expressions) // HACK: to avoid mess with multiple threads
        return;
      }

      setDerivations([
        new HerbieTypes.Derivation("<p>Original Spec Expression</p>", expressionId, undefined),
        ...derivations,
      ]);
    } 
    add();
  }

  // Archive all expressions that are not related to the current spec
  useEffect(archiveExpressions, [spec, expressions])
  function archiveExpressions() {
    setArchivedExpressions([...archivedExpressions, ...expressions.filter(e => e.specId !== spec.id).map(e => e.id).filter(id => !archivedExpressions.includes(id))])
    setCompareExprIds(compareExprIds.filter(id => !archivedExpressions.includes(id)))
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
      async function getLocalError(expression: HerbieTypes.Expression, sample: HerbieTypes.Sample) {
        try {
          // HACK to make sampling work on Herbie side
          const vars = fpcorejs.getVarnamesMathJS(expression.text)
          const specVars = fpcorejs.getVarnamesMathJS(spec.expression)
          const modSample = new HerbieTypes.Sample(sample.points.map(([x, y], _) => [x.filter((xi, i) => vars.includes(specVars[i])), y]), sample.specId, sample.inputRangesId, sample.id)
          const localErrorTree = (await herbiejsJobs.analyzeLocalError(fpcorejs.mathjsToFPCore(expression.text, /*fpcorejs.mathjsToFPCore(spec.expression)*/), modSample, serverUrl))
          return new HerbieTypes.AverageLocalErrorAnalysis(expression.id, sample.id, localErrorTree)
          // updates.push(new Types.AverageLocalErrorAnalysis(expression.id, sample.id, localErrorTree))
        } catch (e: any) {
          return Error(`Local error failed for expression with id ${expression.id} (${expression.text}) and sample ${sample.id}: ${e}`)
        }
      }
      const updates = await Promise.all((await Promise.all(expressions.map(e => samples.map(s => getLocalError(e, s))))).flat())
      const nonErrors = updates.filter(e => !(e instanceof Error)) as HerbieTypes.AverageLocalErrorAnalysis[];
      const errors = updates.filter(e => e instanceof Error)
      setAverageLocalErrors([...averageLocalErrors, ...nonErrors])
      if (errors.length > 0) {
        throw errors[0]
      }
    }
    setTimeout(getLocalErrorUpdates)
  }

  // when the selected point changes, update the selected point local error for expanded expressions
  useEffect(updateSelectedPointLocalError, [selectedPoint, serverUrl, expressions, archivedExpressions, expandedExpressions])
  function updateSelectedPointLocalError() {
    async function getPointLocalError() {
      const localErrors = []
      const activeExpressions = expressions.filter(e => !archivedExpressions.includes(e.id) && expandedExpressions.includes(e.id))
      for (const expression of activeExpressions) {
        if (selectedPoint && expression) {
          // HACK to make sampling work on Herbie side
          const vars = fpcorejs.getVarnamesMathJS(expression.text)
          const specVars = fpcorejs.getVarnamesMathJS(spec.expression)
          const modSelectedPoint = selectedPoint.filter((xi, i) => vars.includes(specVars[i]))
          localErrors.push(
            new HerbieTypes.PointLocalErrorAnalysis(
              expression.id,
              selectedPoint,
              await herbiejsJobs.analyzeLocalError(
                fpcorejs.mathjsToFPCore(expression.text),
                { points: [[modSelectedPoint, 1e308]] } as HerbieTypes.Sample,
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


  // when the selected point changes, update the selected point local error
  useEffect(updateSelectedPointErrorExp, [selectedPoint, serverUrl, expressions, archivedExpressions, expandedExpressions])
  function updateSelectedPointErrorExp() {
    async function getPointErrorExp() {
      const errorExp = []
      const activeExpressions = expressions.filter(e => !archivedExpressions.includes(e.id) && expandedExpressions.includes(e.id))
      for (const expression of activeExpressions) {
        if (selectedPoint && expression) {
          // HACK to make sampling work on Herbie side
          const vars = fpcorejs.getVarnamesMathJS(expression.text)
          const specVars = fpcorejs.getVarnamesMathJS(spec.expression)
          const modSelectedPoint = selectedPoint.filter((xi, i) => vars.includes(specVars[i]))
          errorExp.push(
            new HerbieTypes.PointErrorExpAnalysis(
              expression.id,
              selectedPoint,
              await herbiejsJobs.analyzeErrorExpression(
                fpcorejs.mathjsToFPCore(expression.text),
                { points: [[modSelectedPoint, 1e308]] } as HerbieTypes.Sample,
                serverUrl
              )
            )
          )
        }
      }
      setSelectedPointsErrorExp(errorExp)
    }

    setTimeout(getPointErrorExp)
  }

  useEffect(updateFPTaylorAnalysis, [FPTaylorRanges, serverUrl, expressions, archivedExpressions])
  function updateFPTaylorAnalysis() {
    async function getFPTaylorAnalysis() {
      const FPTaylorAnalyses: HerbieTypes.FPTaylorAnalysis[] = []
      const activeExpressions = expressions.filter(e => !archivedExpressions.includes(e.id))
      for (const expression of activeExpressions) {
        if (expression && FPTaylorRanges) {
          
          // TODO this should not use the expression id as an index
          // Get the expression itself
          const index = expression.id;

          // Get the ranges
          const ranges: [string, [number, number]][] = FPTaylorRanges.find((item) => item?.expressionId === index)?.ranges.map(
            ({ variable, lowerBound, upperBound }) => [variable, [lowerBound, upperBound]]
          ) || [];
          if (ranges.length === 0) {
            continue
          }
          const formula = fpcorejs.makeFPCore2({
            vars: fpcorejs.getVarnamesMathJS(expression.text),
            pre: fpcorejs.FPCorePreconditionFromRanges(ranges),
            body: fpcorejs.FPCoreBody(expression.text)
          })

          const fptaylorInputResponse = await (getApi(
            fpbenchServerUrl + "/exec",
           {'formulas': [formula] },
           true
         ));

          const fptaylorInput = fptaylorInputResponse.stdout;

          // TODO this type needs refactoring, should not be an array
          const parseFPTaylorOutput = async (text: string) => {
            const response = [];
            try {
                // TODO we only expect to find one -- why are we matching all?
                const bounds = [...text.matchAll(/Bounds \(without rounding\): (.*)$/gm)];
                const abserror = [...text.matchAll(/Absolute error \(exact\): (.*)\(/gm)];
                for (let i = 0; i < bounds.length || i < abserror.length; i++) {
                    const boundsValue = bounds[i] ? bounds[i][1] : null;
                    const abserrorValue = abserror[i] ? abserror[i][1] : null;
                    response.push({ bounds: boundsValue, absoluteError: abserrorValue, text });
                }
            } catch (e) {
                console.error(e);
            }
        
            return response;
        };        

        const fptaylorResult = await parseFPTaylorOutput((
          await (
            getApi(
              fptaylorServerUrl + "/exec",
              { 'fptaylorInput': fptaylorInput },
              true
          ))
        ).stdout)

          FPTaylorAnalyses.splice(index, 0,
            new HerbieTypes.FPTaylorAnalysis(
              index,
              fptaylorResult
            )
          )
        }
      }
      setFPTaylorAnalysis(FPTaylorAnalyses)
    }

    setTimeout(getFPTaylorAnalysis)
  }

  const components = [
    { value: 'errorPlot', label: 'Error Plot', component: <ErrorPlot /> },
    // { value: '', label: 'Local Error', component: <LocalError expressionId={expressionId} /> },
    { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent expressionId={selectedExprId} /> },
    // { value: 'fpTaylorComponent', label: 'FPTaylor', component: <FPTaylorComponent/> },
    { value: 'SpeedVersusAccuracy', label: 'Speed Versus Accuracy Pareto', component: <SpeedVersusAccuracyPareto />},
  ];

  const components2 = [
    { value: 'None', label: 'None', component: <div />},
    { value: 'SpeedVersusAccuracy', label: 'Speed Versus Accuracy Pareto', component: <SpeedVersusAccuracyPareto />},
    // { value: 'errorPlot', label: 'Error Plot', component: <ErrorPlot /> },
    // { value: 'localError', label: 'Local Error', component: <LocalError expressionId={expressionId} /> },
    // { value: 'derivationComponent', label: 'Derivation', component: <DerivationComponent expressionId={selectedExprId} /> },
    // { value: 'fpTaylorComponent', label: 'FPTaylor', component: <FPTaylorComponent/> },
  ].map((c, i) => {
    return {
      ...c,
      component: (
        <ErrorBoundary2 key={i} fallback={<div>Something went wrong. See error messages or browser console for details.</div>}>
          {c.component}
        </ErrorBoundary2>
      )
    }
  })
  function myHeader() {
    return (
      <div className="header">
        <div className="app-name" onClick={() => setShowSpecEntry(true)}>
          <img src="https://raw.githubusercontent.com/herbie-fp/odyssey/main/images/odyssey-icon.png" style={{ width: '18px', marginRight: '8px' }} alt="Odyssey Icon"></img>
          <span style={{fontSize: '13px'}}>Odyssey</span>
        </div>
        <div className="tabs">
          <a href="https://github.com/herbie-fp/odyssey/?tab=readme-ov-file#odyssey-an-interactive-numerics-workbench" target="_blank">
            Documentation
            <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"></path></svg>
          </a>
          <a href="https://github.com/herbie-fp/odyssey/issues/new" target="_blank">
            Issues
            <svg className="icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M224,104a8,8,0,0,1-16,0V59.32l-66.33,66.34a8,8,0,0,1-11.32-11.32L196.68,48H152a8,8,0,0,1,0-16h64a8,8,0,0,1,8,8Zm-40,24a8,8,0,0,0-8,8v72H48V80h72a8,8,0,0,0,0-16H48A16,16,0,0,0,32,80V208a16,16,0,0,0,16,16H176a16,16,0,0,0,16-16V136A8,8,0,0,0,184,128Z"></path></svg>
          </a>
          <SerializeStateComponent specPage={showSpecEntry}/>
          <ServerStatusComponent />
        </div>
      </div>
    )
  }

  const handleBackToSpecEntry = () => {
    // Remove expr query param from url so navigation behaves as normal
    const url = new URL(window.location.href);
    url.searchParams.delete("expr");
    window.history.pushState({}, '', url);

    setShowSpecEntry(true);
  }

  function mySubHeader() {
    return (
      <div className="subheader">
        <a
          href="#"
          className="left-item action"
          onClick={handleBackToSpecEntry}
        >
          &larr; Back to Spec Entry
        </a>
        <div className="center-item" style={{
            display: 'inline-block',
            maxWidth: '700px', // Adjust as needed
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
          {spec.expression}
        </div>
        <div></div> {/* Empty div for flexible space on the right */}
      </div>
    );
  }  

  return (
    <div>
      {showSpecEntry ?
        <div className="spec-container" style={ {display: "flex", flexDirection: 'column'} }>
          {myHeader()}
          <SpecComponent setShowExplore={() => setShowSpecEntry(false)}/>
        </div>
      :
        <div className="grid-container">
          {myHeader()}
          {mySubHeader()}
          <ExpressionTable />
          <div className="visualizations">
            {/* <SelectableVisualization components={components} /> */}
            <div style={{fontSize: "12px", padding:"11px 0px", fontWeight: 'bold'}}>Error Plot</div>
            <ErrorPlot />
            <h4>Other Comparisons</h4>
            <SelectableVisualization components={components2} />
          </div>
        </div>
      }
      </div>
  );
}

export function HerbieUI() {
  return (
    <ErrorBoundary>
      <GlobalContextProvider>
        <HerbieUIInner />
        <ToastContainer />
      </GlobalContextProvider>
    </ErrorBoundary>
  );
}
