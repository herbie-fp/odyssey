// Also want to fix build -- maybe switch to vite, but most important is to move webview to subfolder
import {useState, useEffect} from "react";
import { SelectedExprIdContext, ExpressionsContext, AnalysesContext, SpecContext, CompareExprIdsContext } from './HerbieContext'
import * as HerbieContext from './HerbieContext'

import * as fpcorejs from './lib/fpcore'
import * as ordinals from './lib/ordinals'
import * as herbiejs from './lib/herbiejs'

import { Expression, ordinal, expressionError } from './HerbieTypes'
import * as HerbieTypes from './HerbieTypes'
import * as contexts from './HerbieContext'
import { InputRangeEditor1 } from "./InputRangesEditor";

import './ErrorPlot.css'
import { nextId } from "./lib/utils";
import { Tooltip } from "react-tooltip";

const Plot = require('@observablehq/plot')  // have to do this for ES modules for now

type varname = string

interface OrdinalErrorPoint {
  x: ordinal,
  y: expressionError,
  orig: ordinal[]  // the original point associated with this input
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
    
    const percentageCompressedSlidingWindow = compressedSlidingWindow.map(({x,y}:{x:any,y:any})=>({x,y:(100-(y/64*100))}))
    const percentageData = compress(data,width).map(({x,y,orig}:{x:any,y:any,orig:any})=>({x,y:(100-(y/64*100)),orig}))
    return [
        Plot.line(percentageCompressedSlidingWindow, {
            x: "x",
            y: "y",
            strokeWidth: selected ? 4 : 2, ...line,
        }),
      Plot.dot(percentageData, {
        x: "x", y: "y", r: 3,
          // HACK pass stuff out in the title attribute, we will update titles afterward
        title: (d: {orig: any} ) => JSON.stringify({ o: d.orig, id }),//.map((v, i) => `${varnames[i]}: ${displayNumber(ordinalsjs.ordinalToFloat(v))}`).join('\n'),
          // @ts-ignore
            //"data-id": d => id,//() => window.api.select('Expressions', id),
            ...dot
        })
    ]
  }
  const out = Plot.plot({
    width: width,
    height: height,
    x: {
      tickFormat: (d: number) => tickStrings[tickOrdinals.indexOf(d)],
      line: true, grid: true,
        ticks: tickOrdinals, label: `value of ${varnames[varidx]}`,  // LATER axis label
      labelAnchor: 'left', labelOffset: 40, /* tickRotate: 70, */
        domain
    },
    y: {
        line: true,
        label: "% Accuracy", domain: [0, 100],
        ticks: new Array(100 / 5 + 1).fill(0).map((_, i) => i * 5),
        tickFormat: (d: number) => d % 25 !== 0 ? '' : d
    },
    // y: {
    //     line: true,
    //     label: "% Accuracy", domain: [0, 100],
    //     ticks: new Array(100 / 25 + 1).fill(0).map((_, i) => i * 25),
    //     tickFormat: '%' //(d: number) => d % 25 !== 0 ? '' : `%`
    // },
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
  const [spec, ] = contexts.useGlobal(SpecContext)
  const [selectedExprId, setSelectedExprId] = contexts.useGlobal(SelectedExprIdContext)
  const [analyses, ] = contexts.useGlobal(AnalysesContext)
  const [allExpressions, ] = contexts.useGlobal(ExpressionsContext)
  const [compareExprIds, ] = contexts.useGlobal(CompareExprIdsContext)
  const [expressionStyles, ] = contexts.useGlobal(HerbieContext.ExpressionStylesContext)
  const [selectedSampleId, ] = contexts.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [selectedPoint, setSelectedPoint] = contexts.useGlobal(HerbieContext.SelectedPointContext)
  const [samples, ] = contexts.useGlobal(HerbieContext.SamplesContext)
  const [inputRangesTable, setInputRangesTable] = contexts.useGlobal(HerbieContext.InputRangesTableContext)
  const sample = samples.find(s => s.id === selectedSampleId)
  const width = 800;

  let inputRanges : HerbieTypes.SpecRange[] | undefined;
  if (sample) {
    const foundRange = inputRangesTable.find(r => sample.inputRangesId === r.id);
    if (foundRange instanceof HerbieTypes.InputRanges) {
      inputRanges = foundRange ? foundRange.ranges : undefined;
    } else {
      inputRanges = undefined;
    }
  } else {
    inputRanges = undefined;
  }

  const [myInputRanges, setMyInputRanges] = useState(inputRanges)
  const [archivedExpressions, ] = contexts.useGlobal(HerbieContext.ArchivedExpressionsContext)

  // Update myInputRanges when the sample changes
  useEffect(() => {setMyInputRanges(inputRanges)}, [sample])

  const expressions = allExpressions.filter(e => !archivedExpressions.includes(e.id))

  // console.log('selectedExprId', selectedExprId)
  
  // get the expression
  const selectedExpr = expressions.find(e => e.id === selectedExprId)
  // if there are no expressions yet, return an empty div
  if (selectedExprId === -1) {
    return <div className="empty-error-plot"></div>
  }
  if (!selectedExpr) {
    return <div className="empty-error-plot">Could not find expression with id {selectedExprId}</div>
    // TODO Instead, we want to return an empty graph in this case -- still render the SVG, just with no data
  }
  // get the variables from the expression
  const varnames = fpcorejs.getVarnamesMathJS(spec.expression)
  // we will iterate over indices

  if (selectedSampleId === undefined) {
    return <div className="empty-error-plot"></div>
  }
  if (!sample) {
    return <div className="empty-error-plot">Could not find sample with id {selectedSampleId}</div>
  }
  // if (!inputRanges) {
  //   return <div>Could not find input ranges with id {sample.inputRangesId}</div>
  // }

  const analysisData = (expression: Expression) => analyses.find((analysis) => analysis.expressionId === expression.id && analysis.sampleId === selectedSampleId)?.data
  const compareExpressions = expressions.filter(e => compareExprIds.includes(e.id) && analysisData(e))

  if (compareExpressions.length === 0) {
    return <div className="empty-error-plot"></div>
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

  let defaultData = analysisData(selectedExpr) as HerbieTypes.ErrorAnalysisData

  if (!defaultData) {
    // Look through the expressions to find the first one with analysis data
    const firstExpr = expressions.find(e => analysisData(e))
    if (!firstExpr) {
      return <div className="empty-error-plot">No analysis data for any expressions yet.</div>
    }
    defaultData = analysisData(firstExpr) as HerbieTypes.ErrorAnalysisData
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
      // LATER check why these are necessary
      selected,
      id: e.id
    }
  })

  if (styles.length !== compareExpressions.length) {
    throw new Error(`Missing a style for one of the expressions`)
  }

  // create state for the input ranges
  // just use a list that looks like input ranges


  // resample the data using the updated input ranges on click
  function resample() {
    // Add a new inputRangesTable entry
    const inputRangesId = nextId(inputRangesTable)
    // HACK need to think through cases when myInputRanges isn't defined
    if (!myInputRanges) {
      console.log('Doing nothing because myInputRanges is undefined')
      return }
    setInputRangesTable([...inputRangesTable, new HerbieTypes.InputRanges(myInputRanges, spec.id, inputRangesId)])
  }

  // Only want to show resample button if the range has changed
  const showResample = JSON.stringify(inputRanges) !== JSON.stringify(myInputRanges)

  return <div className="error-plot">
    {/* <ResampleComponent /> */}
    {/* Plot all vars */}
    
    {vars.map((v, i) => [v, i] as [string, number]).sort((a, b) => a[0].localeCompare(b[0])).map(([v, i]) => {
      const range = inputRanges?.find(r => r.variable === v)
      // if (!range) {
      //   return <div>Could not find range for variable {v}, which should be in {JSON.stringify(inputRanges)}</div>
      // }

      const data = exprData.map(varData => varData[i]);
      const dataPoints: number[][] = [];
      if (selectedPoint) {
        // Picking out x-axis data (variable values) for each expression
        data.forEach(e => {
          dataPoints.push(e.map((d: OrdinalErrorPoint) => ordinals.ordinalToFloat(d.x)));
        });      
      }
      
      return <div key={i}>
        <span className="variable-name">{v}: </span>
        {range && ( // Do not display if range is undefined, which occurs when there is no InputRanges (expr is FPCore)
          <InputRangeEditor1 value={{
            varname: v,
            lower: range.lowerBound.toString(),
            upper: range.upperBound.toString()
          }} setValue={
            (value: { lower: string, upper: string }) => {
              if (!myInputRanges) { return }  // HACK figure out what to do when myInputRanges isn't defined
              console.debug('set input range', v, value)
              setMyInputRanges(myInputRanges.map(r => r.variable === v ? new HerbieTypes.SpecRange(v, parseFloat(value.lower), parseFloat(value.upper)) : r))
            }
          } />
        )}
        <div>
        {showResample && <button className="resample" onClick={ resample }>Resample</button>}
        </div>
        <svg viewBox="-5 -30 840 365" ref={async (svg) => {
          if (!svg) {
            return
          }
          svg.innerHTML = ''
          const plot = await plotError({
            varnames,
            varidx: i,
            ticks: ticksByVarIdx[i],
            splitpoints: splitpointsByVarIdx[i],
            // get the data for the current variable
            // data is stored as exprData -> varData -> Point[], so:
            data,
            bits,
            styles,
            width: width,
            height: 300
          });

          // Prepping variables to layer selected point label on top of graph
          let labelContainer, labelPoint, labelPointBorder: undefined | SVGElement = undefined;

          plot.querySelectorAll('[aria-label="dot"] circle title').forEach((t: any) => {
            const { o, id }: {o :  ordinal[], id: number} = JSON.parse(t.textContent)

            t.textContent = o.map((v : ordinal, i :number) => `${vars[i]}: ${herbiejs.displayNumber(ordinals.ordinalToFloat(v))}`).join('\n')

            const c = t.parentNode
            const point = o.map((v: ordinal) => ordinals.ordinalToFloat(v))
            t.parentNode.onclick = async () => {
              setSelectedPoint(point)
              setSelectedExprId(id)
            }

            // Compare the selectedPoint's bucket to that of the given point
            const compareBuckets = () => {
              if (selectedPoint) {
                const expIdx = compareExpressions.map((e, i) => ([e,i] as [Expression, number])).filter(([e,i]) => e.id === id)[0][1];

                const pIdx = dataPoints[expIdx].indexOf(point[i]);
                const selectedIdx = dataPoints[expIdx].indexOf(selectedPoint[i]);

                return pIdx === selectedIdx - (selectedIdx % Math.floor(dataPoints[expIdx].length / width));
              }
            }

            // See if the current point is selected, if not check if it belongs to the same bucket
            if (selectedPoint && point.every((v, i) =>  v.toString() === selectedPoint?.[i].toString() || compareBuckets())) {
              // Increase size of selected point on all expressions,
              c.setAttribute('r', '15px');
              if (selectedExprId === id) { // only make opaque that of selected expression
                c.setAttribute('class', 'selected-circle');
              }

              // Get point position, to position label above
              let x = Number(c.getAttribute("cx"));

              // Create an extra tick at the selected point horizontal-axis value
              const selectedTick = document.createElementNS("http://www.w3.org/2000/svg", "line");
              selectedTick.setAttribute("x1", `${x}`);
              selectedTick.setAttribute("x2", `${x}`);
              selectedTick.setAttribute("y1", `0`);
              selectedTick.setAttribute("y2", `275`);
              selectedTick.setAttribute("stroke", "currentColor");
              selectedTick.setAttribute("stroke-opacity", "0.3");
              svg.appendChild(selectedTick);

              // Create label box
              labelContainer = document.createElementNS("http://www.w3.org/2000/svg", "g");
              labelContainer.setAttribute("class", "label-container");

              // Handle overlap around edge of plot
              const xAdjusted = (x < 66) ? 66 : (x > 774) ? 774 : x;

              // Adding Nodes to svg is so bulky! hence this kind of disturbing (&buggy?) approach, will consider alternatives
              labelContainer.innerHTML = `
                <rect class="selected-label" x=${xAdjusted - 70 + ""} y=${-27 + ""} height="22px"></rect>
                <text x=${xAdjusted - 66 + ""} y=${-10 + ""}>${v}: ${herbiejs.displayNumber(selectedPoint[i])}</text>
                <foreignObject x=${xAdjusted + 20 + ""} y=${-27 + ""} height="22px" width="22px">
                  <xhtml:div class="copy">
                    <xhtml:a class="copy-anchor">⧉</xhtml:a>
                  </xhtml:div>
                </foreignObject>
                <foreignObject x=${xAdjusted + 45 + ""} y=${-26 + ""} height="20px" width="14px">
                  <xhtml:a class="deselect">╳</xhtml:a>
                </foreignObject>`;

              // Add copy functionality on click of '⧉' icon to get point values of all point variables
              labelContainer.querySelector(".copy")?.addEventListener("click", (e) => {
                navigator.clipboard.writeText(v + ": " + selectedPoint[i]); 
                e.stopPropagation(); 
              });

              // Add deselect point functionality on click of 'X' icon
              labelContainer.querySelector(".deselect")?.addEventListener("click", () => {
                setSelectedPoint(undefined);
              });

              // Triangle point of the label box to create text bubble shape
              labelPointBorder = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
              labelPointBorder.setAttribute("points", `${x-7},-8 ${x},5 ${x+7},-8`);
              labelPointBorder.setAttribute("fill", "var(--foreground-color)");
              labelPoint = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
              labelPoint.setAttribute("points", `${x-7},-9 ${x},2 ${x+7},-9`);
              labelPoint.setAttribute("fill", "var(--ui-color)");
            }
          });
          [...plot.children].map(c => svg.appendChild(c));

          // If a point is selected, append point label to plot
          if (labelContainer && labelPoint && labelPointBorder) {
            svg.appendChild(labelPointBorder);
            svg.appendChild(labelContainer);
            svg.appendChild(labelPoint);
          }
        }} />
        {/* Tooltip for deselect 'X' on selected point label*/}
        <Tooltip anchorSelect=".deselect" place="top" >
          Deselect
        </Tooltip>
      </div>
    })}
  </div>

}

export { ErrorPlot }
