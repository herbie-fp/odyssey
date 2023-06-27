// Want to port over old visualization code to React
// Also want to fix build -- maybe switch to vite, but most important is to move webview to subfolder
import {useState, useContext} from "react";
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext'

import * as fpcorejs from './fpcore'

import { Expression } from './HerbieTypes'

interface Point {
  x: number,
  y: number,
  orig: number[]  // the original point associated with this input
}
interface PlotArgs {
  /** A list of variable names for the original points. */
  varnames: string[];

  /** For each function being plotted, for each `x` in the input, a `y` for the error. */
  data: Point[][]

  /** styles for each function */
  styles: { line: { stroke: string }, dot: { stroke: string } }[]

  /** A string<->ordinal mapping to let us label ticks, eg [['1e10', 12345678], ...] */
  ticks: [string, number][]
  splitpoints: [number]

  /** SVG width */
  width?: number
  /** SVG height */
  height?: number

  [propName: string]: any  // could have other properties
}

async function plotError({ varnames, varidx, ticks, splitpoints, data, bits, styles, width = 800, height = 400 }: PlotArgs): Promise<SVGElement> {
  const Plot = await import( "@observablehq/plot");  // HACK to let us use an ES module in a non-ES module
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
  const slidingWindow = (points: Point[], size : number) => {
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
    }, [] as Point[])
  }

  /** Takes an array of {x, y} data points.
   * Creates a line graph based on a sliding window of width binSize.
   * Further compresses points to width.
   * */
  function lineAndDotGraphs({data, style: { line, dot, selected, id }, binSize = 128, width = 800 }: {data: any, style: any, binSize?: number, width?: number}) {
    const average = (points: Point[]) => ({
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
        title: d => JSON.stringify({ o: d.orig, id }),//.map((v, i) => `${varnames[i]}: ${displayNumber(ordinalsjs.ordinalToFloat(v))}`).join('\n'),
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
        tickFormat: d => tickStrings[tickOrdinals.indexOf(d)],
        ticks: tickOrdinals, label: `value of ${varnames[varidx]}`,  // LATER axis label
        labelAnchor: 'left', labelOffset: 40, /* tickRotate: 70, */
        domain,
        grid: true
    },
    y: {
        label: "Bits of Error", domain: [0, bits],
        ticks: new Array(bits / 4 + 1).fill(0).map((_, i) => i * 4),
        tickFormat: d => d % 8 !== 0 ? '' : d
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

// need to get varnames from expression, varidx
// varnames, varidx, ticks, splitpoints, data, bits, styles, width=800, height=400
function ErrorPlot() {
  const { selectedExprId, setSelectedExprId } = useContext(SelectedExprIdContext)
  console.log('selectedExprId', selectedExprId)

  // get the expression
  const { expressions } = useContext(ExpressionsContext)
  const expression = expressions.find(e => e.id === selectedExprId)
  if (!expression) {
    return <div>Could not find expression with id {selectedExprId}</div>
    // throw new Error(`Could not find expression with id ${selectedExprId}`)
  }
  // get the variables from the expression
  const varnames = fpcorejs.getVarnamesMathJS(expression.text)
  // we will iterate over indices
  // TODO ticks are stored with expressions/sample
  // splitpoints are stored with expressions
  // data is stored with expressions
  // bits is stored with analyses
  // styles are stored as ExpressionStyles
  console.log('ErrorPlot rendered');
  return <div>
    <h1>ErrorPlot</h1>
    {/* Plot all vars */}
  </div>
  
}

export { ErrorPlot }