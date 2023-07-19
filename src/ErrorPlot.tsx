// Want to port over old visualization code to React
// Also want to fix build -- maybe switch to vite, but most important is to move webview to subfolder
import {useState, useContext} from "react";
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext'
import * as HerbieContext from './HerbieContext'

import * as fpcorejs from './fpcore'
import * as ordinals from './ordinals'
import * as herbiejs from './herbiejs'

import { Expression, OrdinalExpressionInput, ExpressionError } from './HerbieTypes'
import * as HerbieTypes from './HerbieTypes'
import * as contexts from './HerbieContext'

const Plot = require('@observablehq/plot')  // have to do this for ES modules for now

type ordinal = number
type varname = string

interface OrdinalErrorPoint {
  x: OrdinalExpressionInput,
  y: ExpressionError,
  orig: OrdinalExpressionInput[]  // the original point associated with this input
}
interface PlotArgs {
  /** A list of variable names for the original points. */
  varnames: varname[];

  /** For each function being plotted, for each `x` in the input, a `y` for the error. */
  data: OrdinalErrorPoint[][]

  /** styles for each function */
  styles: { line: { stroke: string }, dot: { stroke: string } }[]

  /** A string<->ordinal mapping to let us label ticks, eg [['1e10', 12345678], ...] */
  ticks: [string, ordinal][]
  splitpoints: number[]

  /** SVG width */
  width?: number
  /** SVG height */
  height?: number

  [propName: string]: any  // could have other properties
}
/**
 * Plot the error of a function.
 * @param varnames A list of variable names for the original points.
 * @param data For each function being plotted, for each `x` in the input, a `y` for the error.
 * @param ticks A string<->ordinal mapping to let us label ticks, eg [['1e10', 12345678], ...]
 * @param splitpoints A list of splitpoints to draw vertical bars at.
 * @param bits The number of bits of error to plot.
 * @param styles styles for each function
 * @param width SVG width
 * @param height SVG height
 * @returns An SVG element.
  */
async function plotError({ varnames, varidx, ticks, splitpoints, data, bits, styles, width = 800, height = 400 }: PlotArgs): Promise<SVGElement> {
  const tickStrings = ticks.map(t => t[0])
  const tickOrdinals = ticks.map(t => t[1])
  const tickZeroIndex = tickStrings.indexOf("0")
  const domain = [Math.min(...tickOrdinals), Math.max(...tickOrdinals)]
  const zip = (arr1: any[], arr2: any[], arr3=[]) => arr1.reduce((acc, _, i) => (acc.push([arr1[i], arr2[i], arr3?.[i]]), acc), [])

  /** Compress `arr` to length `outLen` by dividing into chunks and applying `chunkCompressor` to each chunk. */
  function compress(arr : any[], outLen: number, chunkCompressor = (points :any[]) => points[0]) {
    return arr.reduce((acc, pt, i) =>
      i % Math.floor(arr.length / outLen) !== 0 ? acc
      : (acc.push(chunkCompressor(arr.slice(i, i + Math.floor(arr.length / outLen)))), acc)
      , [])
  }

  /** Compute a new array of the same length as `points` by averaging on a window of size `size` at each point. */
  const slidingWindow = (points: OrdinalErrorPoint[], size : number) => {
    const half = Math.floor(size / 2)
    const runningSum = points.reduce((acc, v) => (
        acc.length > 0 ? acc.push(v.y + acc[acc.length - 1])
        : acc.push(v.y), acc)
      , [] as number[])
    return runningSum.reduce((acc, v, i) => {
      const length = 
          (i - half) < 0 ? half + i
          : (i + half) >= runningSum.length ? (runningSum.length - (i - half))
          : size
      const top =
          (i + half) >= runningSum.length ? runningSum[runningSum.length - 1]
          : runningSum[i + half]
      const bottom =
          (i - half) < 0 ? 0
          : runningSum[i - half]
      acc.push({y: (top - bottom) / length, x: points[i].x, orig: points[i].orig})
      return acc
    }, [] as OrdinalErrorPoint[])
  }

  /** Takes an array of {x, y} data points.
   * Creates a line graph based on a sliding window of width binSize.
   * Further compresses points to width.
   * */
  function lineAndDotGraphs({data, style: { line, dot, selected, id }, binSize = 128, width = 800 }: {data: OrdinalErrorPoint[], style: any, binSize?: number, width?: number}) {
    const average = (points: OrdinalErrorPoint[]) => ({
      y: points.reduce((acc, e) => e.y + acc, 0) / points.length,
      x: points.reduce((acc, e) => e.x + acc, 0) / points.length
    })
    // console.log(data)
    // console.log(slidingWindow(data, binSize))
    const compressedSlidingWindow = compress(
      slidingWindow(data, binSize), width, average)
    //console.log(compressedSlidingWindow)
    return [
        Plot.line(compressedSlidingWindow, {
            x: "x",
            y: "y",
            strokeWidth: selected ? 4 : 2, ...line,
        }),
      Plot.dot(compress(data, width), {
        x: "x", y: "y", r: 3,
          // HACK pass stuff out in the title attribute, we will update titles afterward
        title: (d: {orig: any} ) => JSON.stringify({ o: d.orig, id }),//.map((v, i) => `${varnames[i]}: ${displayNumber(ordinalsjs.ordinalToFloat(v))}`).join('\n'),
          // @ts-ignore
            //"data-id": d => id,//() => window.api.select('Expressions', id),
            ...dot
        })
    ]
  }
  console.log('splitpoints', splitpoints)
  const out = Plot.plot({
    width: width,
    height: height,                
    x: {
        tickFormat: (d: number) => tickStrings[tickOrdinals.indexOf(d)],
        ticks: tickOrdinals, label: `value of ${varnames[varidx]}`,  // LATER axis label
        labelAnchor: 'left', labelOffset: 40, /* tickRotate: 70, */
        domain,
        grid: true
    },
    y: {
        label: "Bits of Error", domain: [0, bits],
        ticks: new Array(bits / 4 + 1).fill(0).map((_, i) => i * 4),
        tickFormat: (d: number) => d % 8 !== 0 ? '' : d
    },
    marks: [
      ...[ // Vertical bars ("rules")
        // The splitpoints
        ...splitpoints.map(p => Plot.ruleX([p], { stroke: "lightgray", strokeWidth: 4 })),
        // The 0-rule
        ...(tickZeroIndex > -1 ? [Plot.ruleX([tickOrdinals[tickZeroIndex]])] : []),
      ],
      // The graphs
      ...zip(data, styles).map(([data, style]: [any, any]) => lineAndDotGraphs({ data, style, width })).flat()]
  })
  out.setAttribute('viewBox', `0 0 ${width} ${height + 30}`)
  
  return out as SVGElement
}

// const zip =  <T1,T2,T3>(arr1: T1[], arr2: T2[], arr3=[] as T3[])  : [T1, T2, T3][] => arr1.reduce((acc, _, i) => (acc.push([arr1[i], arr2[i], arr3?.[i]]), acc), [] as [T1, T2, T3][])

// need to get varnames from expression, varidx
// varnames, varidx, ticks, splitpoints, data, bits, styles, width=800, height=400
function ErrorPlot() {

  const [selectedExprId, setSelectedExprId] = contexts.useGlobal(SelectedExprIdContext)
  const [analyses, ] = contexts.useGlobal(AnalysesContext)
  const [expressions, ] = contexts.useGlobal(ExpressionsContext)
  const [compareExprIds, ] = contexts.useGlobal(CompareExprIdsContext)
  const [expressionStyles, ] = contexts.useGlobal(HerbieContext.ExpressionStylesContext)
  const [selectedSampleId, ] = contexts.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [selectedPoint, setSelectedPoint ] = contexts.useGlobal(HerbieContext.SelectedPointContext)

  console.log('selectedExprId', selectedExprId)

  // get the expression
  const selectedExpr = expressions.find(e => e.id === selectedExprId)
  if (!selectedExpr) {
    return <div>Could not find expression with id {selectedExprId}</div>
    // throw new Error(`Could not find expression with id ${selectedExprId}`)
  }
  // get the variables from the expression
  const varnames = fpcorejs.getVarnamesMathJS(selectedExpr.text)
  // we will iterate over indices

  // TODO ticks are stored with expressions/sample
  const analysisData = (expression: Expression) => analyses.find((analysis) => analysis.expressionId === expression.id && analysis.sampleId === selectedSampleId)?.data
  const compareExpressions = expressions.filter(e => compareExprIds.includes(e.id) && analysisData(e))

  if (compareExpressions.length === 0) {
    return <div>No selected expressions with analyses to compare yet.</div>
  }
  
  /* We want to get the data for each expression and put it into an array. */
  const keyFn = <T,>(fn: (u: T) => number) => (a: T, b: T) => fn(a) - fn(b)
  const exprData = compareExpressions
    // draw the data for the selected expression last
    .sort(keyFn(e => e.id === selectedExprId ? 1 : 0))
    .map(e => {
      const {
        ordinalSample,
        ticksByVarIdx,
        splitpointsByVarIdx,
        bits,
        vars,
        errors,
        meanBitsError
      } = analysisData(e) as HerbieTypes.ErrorAnalysisData // we already checked that analysisData(e) exists for all compareExpressions
      return vars.map((v, i) => {
        return ordinalSample.reduce((acc, p, j) => {
          acc.push({
            x: p[i],
            y: errors[j],
            orig: p
          })
          return acc
        }, [] as OrdinalErrorPoint[]).sort(keyFn(p => p.x))
      })
    })
  
  const defaultData = analysisData(selectedExpr) as HerbieTypes.ErrorAnalysisData

  if (!defaultData) {
    return <div>No analysis data for selected expression yet.</div>
  }

  const {
    ordinalSample,
    ticksByVarIdx,
    splitpointsByVarIdx,
    bits,
    vars,
    errors,
    meanBitsError
  } = defaultData

  const styles = compareExpressions.map(e => {
    const style = (expressionStyles.find(e1 => e1.expressionId === e.id) as HerbieTypes.ExpressionStyle).style
    const selected = selectedExpr.id === e.id
    const dotAlpha = selected ? 'b5' : '25'
    const color = style.dot.stroke
    return {
      ...style,
      dot: {
        stroke: color + dotAlpha,
        fill: color,
        fillOpacity: 0
      },
      // TODO check why these are necessary
      selected,
      id: e.id
    }
  })

  if (styles.length !== compareExpressions.length) {
    throw new Error(`Missing a style for one of the expressions`)
  }
  
  return <div>
    {/* Plot all vars */}
    {vars.map((v, i) => {
      return <div key={i}>
        <div>{v}</div>
        <svg viewBox="0 0 800 200" ref={async (svg) => {
          if (!svg) {
            return
          }
          const plot = await plotError({
            varnames,
            varidx: i,
            ticks: ticksByVarIdx[i],
            splitpoints: splitpointsByVarIdx[i],
            // get the data for the current variable
            // data is stored as exprData -> varData -> Point[], so:
            data: exprData.map(varData => varData[i]),
            bits,
            styles,
            width: 800,
            height: 200
          });
          plot.querySelectorAll('[aria-label="dot"] circle title').forEach((t: any) => {
            const { o, id } = JSON.parse(t.textContent)

            // TODO make sure this mouseover text shows up on hover
            t.textContent = o.map((v : ordinal, i :number) => `${vars[i]}: ${herbiejs.displayNumber(ordinals.ordinalToFloat(v))}`).join('\n')

            // TODO set the selected point on click
            // t.parentNode.onclick = async () => {
            //   api.select('Expressions', id)
            //   const expression = getByKey(api, 'Expressions', 'id', id)
            //   const result = await herbiejs.analyzeLocalError(expression.fpcore, { points: [[o.map(v => ordinalsjs.ordinalToFloat(v)), 1e308]] }, getHost())
            //   const entry = { specId, id, tree: result.tree, sample: [[o.map(v => ordinalsjs.ordinalToFloat(v)), 1e308]] }
            //   api.action('create', 'demo', 'LocalErrors', entry)
            // }
          });
          [...plot.children].map(c => svg.appendChild(c))
        }} />
      </div>
    })}
  </div>
  
}

export { ErrorPlot }