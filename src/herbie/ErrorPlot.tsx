// Also want to fix build -- maybe switch to vite, but most important is to move webview to subfolder
import {useState, useEffect} from "react";
import { Tooltip } from "react-tooltip";

import * as HerbieContext from './HerbieContext'
import { Expression, ordinal, expressionError, SpecRange, InputRanges,
  ErrorAnalysisData, ExpressionStyle } from './HerbieTypes'

import * as fpcorejs from './lib/fpcore'
import * as ordinals from './lib/ordinals'
import * as herbiejs from './lib/herbiejs'
import { nextId } from "./lib/utils";

import { InputRangeEditor1 } from "./InputRangesEditor";

import './ErrorPlot.css'

const Plot = require('@observablehq/plot')  // have to do this for ES modules for now
import { select } from 'd3-selection';      // Required for brushing
import { brushX } from 'd3-brush';

type varname = string

// Useful comparator for sorting data points: accepts fn that defines what to sort on
// (e.g. field of an object)
const keyFn = <T,>(fn: (u: T) => number) => (a: T, b: T) => fn(a) - fn(b)

// Error point data for single varible, makes sense only in context of a "current variable"
interface OrdinalErrorPoint {
  x: ordinal,         // Point for single variable or full ordinal point
  y: expressionError, // Error for point
  orig: ordinal[]     // original point with all variables
}

// Plotting styles for a specific experession line
type LineAndDotStyle = { 
  expId: number // ID of expression styles are for
  line: { stroke: string }, 
  dot: { 
    stroke: string, 
    fill: string,
    r?: number,
    fillOpacity: number
  },
  selected: boolean, // if expression is selected
}

/**
 * Plot the error of all expressions for a SINGLE variable
 * @param varidx index of variable (in varnames) being plotted
 * @param data data points for exp and var, in the form: 
 *   {x: var's value at point, y: error at point, orig: ordinal point with all vars}
 * @param varnames all variable names for the original points
 * @param ticks A string<->ordinal mapping for labeling ticks, eg [['1e10', 12345678], ...]
 * @param splitpoints A list of splitpoints to draw vertical bars at
 * @param styles styles for each expression
 * @param width resulting SVG width
 * @param height resulting SVG height (- 30)
 * @returns An SVG element containing dot and line plots 
  */
async function plotVarError(varidx: number, data: OrdinalErrorPoint[][], varnames: varname[],  
    ticks: [string, ordinal][], splitpoints: number[], styles: LineAndDotStyle[], 
    width: number = 800, height: number = 400): Promise<SVGElement> {
  const tickLabels = ticks.map(t => t[0])
  const tickOrdinals = ticks.map(t => t[1])
  const tickZeroIndex = tickLabels.indexOf("0")
  const domain = [Math.min(...tickOrdinals), Math.max(...tickOrdinals)]

  // Compress `arr` to length `outLen` by dividing into chunks and applying `chunkCompressor` to each chunk.
  const compress = (arr : any[], outLen: number, chunkCompressor = (points: any[]) => points[0]) => {
    return arr.reduce((acc, pt, i) =>
      i % Math.floor(arr.length / outLen) !== 0 ? acc
      : (acc.push(chunkCompressor(arr.slice(i, i + Math.floor(arr.length / outLen)))), acc)
      , [])
  }

  // Averages point and error data in OrdinalErrorPoints
  const average = (points: OrdinalErrorPoint[]) => ({
    y: points.reduce((acc, e) => e.y + acc, 0) / points.length,
    x: points.reduce((acc, e) => e.x + acc, 0) / points.length
  })

  // Helper function for compressing data for line plot:
  //   computes a new array of the same length as `points` by averaging on a 
  //   window of `size` at each point
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

  // Helper function to plot line and dots for a SINGLE expression and current variable
  //  - Creates a line graph based on a sliding window of width binSize
  //  - Compresses points to set of representatives to reasonably fit in plot width
  // 
  // @param data of points for exp and var
  //   in the form: {x: var's value at point, y: error at point, orig: ordinal point with all vars}
  // @param expId id of expression data points are for
  // @param style attributes of line and points to plot (colors, if it should appear 'selected')
  const lineAndDotGraphs = (data: OrdinalErrorPoint[], expId: number, style: LineAndDotStyle) => {
    // Average data points and compress for error plot line
    const binSize = 128; // size of window to average over
    const compressedSlidingWindow = compress(
      slidingWindow(data.sort(keyFn(p => p.x)), binSize), width, average)
    const percentageCompressedSlidingWindow = compressedSlidingWindow.map(({x,y}:{x:any,y:any})=>({x,y:(100-(y/64*100))}));

    // Condense point data to create 800 representative points to plot
    const percentageData = data.sort(keyFn(p => p.orig[0]))      // Consistently sort by same variable for bucketting (first one)
      .filter((p, i) => i % (data.length / width) === 0)         // Make size (8000 / 800) buckets by taking bucket at that point
      .sort(keyFn(p => p.x))                                     // Re-sort by current variable so points are plotted in order
      .map(({x, y, orig}) => ({x, y: (100-(y/64*100)), orig}));  // format error
    
      return [
        Plot.line(percentageCompressedSlidingWindow, {
            x: "x",
            y: "y",
        strokeWidth: style.selected ? 4 : 2, ...style.line,
        title: (_d: any) => JSON.stringify({expId}), // HACK to keep the id of the line with the line
        }),
      Plot.dot(percentageData, {
        x: "x", y: "y", r: 3,
          // HACK pass stuff out in the title attribute, we will update titles afterward
        title: (d: {orig: any} ) => JSON.stringify({ orig: d.orig, expId }),
        ...style.dot
        })
    ]
  }

  // Create line and dot plots for each expression
  const out: SVGElement = Plot.plot({
    width: width,
    height: height,
    x: {
      tickFormat: (d: number) => tickLabels[tickOrdinals.indexOf(d)],
      line: true, grid: true,
        ticks: tickOrdinals, label: `value of ${varnames[varidx]}`,  // LATER axis label
      labelAnchor: 'left', labelOffset: 40,
        domain
    },
    y: {
        line: true,
        label: "% Accuracy", domain: [0, 100],
        ticks: new Array(100 / 5 + 1).fill(0).map((_, i) => i * 5),
        tickFormat: (d: number) => d % 50 !== 0 ? '' : d
    },
    marks: [
      ...[ // Vertical bars ("rules")
        // The splitpoints
        ...splitpoints.map(p => Plot.ruleX([p], { stroke: "lightgray", strokeWidth: 4 })),
        // The 0-rule
        ...(tickZeroIndex > -1 ? [Plot.ruleX([tickOrdinals[tickZeroIndex]])] : []),
      ],
      // Create graphs for each expression, data should be 1:1 with styles
      ...data.map((data: OrdinalErrorPoint[], i: number) => lineAndDotGraphs(data, styles[i].expId, styles[i])).flat()
    ]
  })
  out.setAttribute('viewBox', `0 0 ${width} ${height + 30}`)

  return out;
}


// need to get varnames from expression, varidx
// varnames, varidx, ticks, splitpoints, data, bits, styles, width=800, height=400
function ErrorPlot() {
  const [spec, ] = HerbieContext.useGlobal(HerbieContext.SpecContext)
  const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext)
  const [analyses, ] = HerbieContext.useGlobal(HerbieContext.AnalysesContext)
  const [allExpressions, ] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
  const [compareExprIds, ] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext)
  const [expressionStyles, ] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext)
  const [selectedSampleId, ] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext)
  const [selectedPoint, setSelectedPoint] = HerbieContext.useGlobal(HerbieContext.SelectedPointContext)
  const [selectedSubset, setSelectedSubset] = HerbieContext.useGlobal(HerbieContext.SelectedSubsetRangeContext)
  const [_, setSelectedAnalysis] = HerbieContext.useGlobal(HerbieContext.SelectedSubsetAnalysesContext)
  const [samples, ] = HerbieContext.useGlobal(HerbieContext.SamplesContext)
  const [inputRangesTable, setInputRangesTable] = HerbieContext.useGlobal(HerbieContext.InputRangesTableContext)
  const [jobCount, ] = HerbieContext.useReducerGlobal(HerbieContext.JobCountContext)
  const sample = samples.find(s => s.id === selectedSampleId)
  const width = 800;

  let inputRanges : SpecRange[] | undefined;
  if (sample) {
    const foundRange = inputRangesTable.find(r => sample.inputRangesId === r.id);
    if (foundRange instanceof InputRanges) {
      inputRanges = foundRange ? foundRange.ranges : undefined;
    } else {
      inputRanges = undefined;
    }
  } else {
    inputRanges = undefined;
  }

  const [myInputRanges, setMyInputRanges] = useState(inputRanges)
  const [archivedExpressions, ] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext)

  // Update myInputRanges when the sample changes
  useEffect(() => {setMyInputRanges(inputRanges)}, [sample])

  const expressions = allExpressions.filter(e => !archivedExpressions.includes(e.id))
  
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

  const analysisData = (expression: Expression) => analyses.find((analysis) => analysis.expressionId === expression.id && analysis.sampleId === selectedSampleId)?.data
  const compareExpressions = expressions.filter(e => compareExprIds.includes(e.id) && analysisData(e))
  if (compareExpressions.length === 0) {
    return <div className="empty-error-plot"></div>
  }

  /* We want to get the data for each expression and put it into an array. */
  const exprData = compareExpressions
    // put selected expression last so it's drawn last
    .sort(keyFn(e => e.id === selectedExprId ? 1 : 0))
    .map(e => {
      // we already checked that analysisData(e) exists for all compareExpressions
      const analysis = analysisData(e) as ErrorAnalysisData
      
      return analysis.vars.map((v, i) => {
        return analysis.ordinalSample.reduce((acc, p, j) => {
          acc.push({
            x: p[i],
            y: analysis.errors[j],
            orig: p
          })
          return acc
        }, [] as OrdinalErrorPoint[])
      })
    })

  // We need to get some variables for setting up the graph from one of the expressions,
  // so we define a default.
  let defaultData = analysisData(selectedExpr);

  if (!defaultData) {
    // Look through the expressions to find the first one with analysis data
    const firstExpr = expressions.find(e => analysisData(e))
    if (!firstExpr) {
      return <div className="empty-error-plot">No analysis data for any expressions yet.</div>
    }
    defaultData = analysisData(firstExpr) as ErrorAnalysisData;
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


  // Styles for drawing error line and points for each of the expressions
  const styles = compareExpressions.map(e => {
    const style = (expressionStyles.find(e1 => e1.expressionId === e.id) as ExpressionStyle).style
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
      selected,
      expId: e.id
    }
  })

  if (styles.length !== compareExpressions.length) {
    throw new Error(`Missing a style for one of the expressions`)
  }

  // resample the data using the updated input ranges on click
  function resample() {
    // Add a new inputRangesTable entry
    const inputRangesId = nextId(inputRangesTable)
    // HACK need to think through cases when myInputRanges isn't defined
    if (!myInputRanges) {
      console.log('Doing nothing because myInputRanges is undefined')
      return }
    setInputRangesTable([...inputRangesTable, new InputRanges(myInputRanges, spec.id, inputRangesId)])
  }

  // Only want to show resample button if the range has changed
  const showResample = JSON.stringify(inputRanges) !== JSON.stringify(myInputRanges)

  // Creates a new "d" attr for a <path> element based on given "d" bounded by bounds
  const calculatePath = (bounds: number[], d: string): string => {
    // Create new path bounded to selection: "M"ove to the beginning of line in region
    let newD = "M";
    // Trim off initial "M" then divide path of original line into each point component
    const linePoints = d.slice(1).split("L");
    for (const lp of linePoints) {
      const x = Number(lp.split(",")[0]);
      // If this part of original path is within bounds, add to new path
      if (x >= bounds[0] && x <= bounds[1]) {
        newD += (lp + "L");
      }
    }
    return newD.slice(0, newD.length - 1); // slice off last fencepost L
  }

  return <div className="error-plot">
    {/* Plot each var */}
    {vars.map((v, i) => [v, i] as [string, number])
        // display vars alphabetically
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([v, i]) => {
      const range = inputRanges?.find(r => r.variable === v);
      // TODO: handle case when range cannot be found?

      // Data for each expression for only the current, ith, variable
      const data = exprData.map(varData => varData[i]);
      const dataPoints: number[][] = [];
      if (selectedPoint || selectedSubset) {
        // Picking out x-axis data (variable values) for each expression
        data.forEach(e => {
          dataPoints.push(e.map((d: OrdinalErrorPoint) => ordinals.ordinalToFloat(d.x)));
        });      
      }
      
      return <div key={i}>
        <span className="variable-name">{v}:</span>
        {range && ( // Do not display if range is undefined, which occurs when there is no InputRanges (expr is FPCore)
          <InputRangeEditor1 value={{
            varname: v,
            lower: range.lowerBound.toString(),
            upper: range.upperBound.toString(),
            minAbsValue: range.minAbsValue.toString()
          }} setValue={
            (value: { lower: string, upper: string, minAbsValue?: string }) => {
              if (!myInputRanges) { return }  // HACK figure out what to do when myInputRanges isn't defined
              console.debug('set input range', v, value)
              setMyInputRanges(myInputRanges.map(r => r.variable === v ? new SpecRange(
                v, 
                parseFloat(value.lower), 
                parseFloat(value.upper), 
                value.minAbsValue !== undefined ? parseFloat(value.minAbsValue) : undefined) : r)
              )
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
            const plot = await plotVarError(
              i, // varIdx              
              data, // data for the current variable
              varnames,
              ticksByVarIdx[i],
              splitpointsByVarIdx[i],
              styles,
              width,
              300
            );

            // Prepping variables to layer selected point label on top of graph
            let labelContainer, labelPoint, labelPointBorder: undefined | SVGElement = undefined;

            plot.querySelectorAll('[aria-label="dot"] circle title').forEach((t: any) => {
              const { orig, expId }: {orig:  ordinal[], expId: number} = JSON.parse(t.textContent)

              const c = t.parentNode
              const point = orig.map((v: ordinal) => ordinals.ordinalToFloat(v))
            c.onclick = async () => {
              if (jobCount > 0) { // there are pending jobs
                return;
              }

              setSelectedPoint(point)
              setSelectedExprId(expId)

              // remove brushing and revert back to full sample analysis
              setSelectedSubset(undefined)
              setSelectedAnalysis(undefined)

              fetch('https://herbie.uwplse.org/odyssey-log/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  actionType: "PointSelection",
                  sessionId: sessionStorage.getItem('sessionId'),
                  SelectedPoint: point,
                  SelectedExpression: expressions.find(e => e.id === expId)?.text,
                  timestamp: new Date().toLocaleString(),
                }),
              })
              .then(response => {
                if (response.ok) {
                  console.log('Server is running and log saved');
                }
                else {
                  console.error('Server responded with an error:', response.status);
                }
              })
              .catch(error => console.error('Request failed:', error));
            }

              // If the current point is selected
            if (selectedPoint && (point.every((v, i) =>  v === selectedPoint?.[i]))) {
              // Increase size of selected point on all expressions,
              c.setAttribute('r', '15px');
              if (selectedExprId === expId) { // only make opaque that of selected expression
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

              // Adding Nodes to svg is so bulky! hence this kind of disturbing (&buggy?) approach
              labelContainer.innerHTML = `
                <rect class="selected-label" x=${xAdjusted - 70 + ""} y=${-27 + ""} height="22px"></rect>
                <text class="full-num-anchor" x=${xAdjusted - 66 + ""} y=${-10 + ""}>${v}: ${herbiejs.displayNumber(selectedPoint[i])}</text>
                <foreignObject x=${xAdjusted + 23 + ""} y=${-28 + ""} height="22px" width="22px">
                  <xhtml:div class="copy">
                    <xhtml:a class="copy-anchor">⧉</xhtml:a>
                  </xhtml:div>
                </foreignObject>
                <foreignObject x=${xAdjusted + 40 + ""} y=${-28 + ""} height="20px" width="16px">
                  <xhtml:a class="deselect" style="font-size: 16px;">×</xhtml:a>
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

          // Map from expression id --> data about line for expression (only includes currently selected lines)
          const highlightMap: Map<number, {line: Element, stroke: string, d: string, newPath: Element, pathG: Node}> = new Map();
          plot.querySelectorAll('[aria-label="line"] ').forEach((line) => {
            const stroke = line.getAttribute("stroke") ?? "#d2d2d2";
            // Little hack for getting line's expression's id
            const text = line.querySelector("title")?.textContent;
            const expId = text && text !== null ? JSON.parse(text).expId : 0;

            // Create a new a highlight line with an empty path (for now)
            const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
            g.setAttribute("stroke", stroke);
            g.setAttribute("stroke-width", expId === selectedExprId ? "4px" : "2px");
            g.setAttribute("class", "highlight-line");
            const newPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
            g.appendChild(newPath);

            highlightMap.set(expId, 
              { line, stroke, d: line.querySelector("path")?.getAttribute("d") ?? "", newPath, pathG: g });
          })
          

          // Grab all the plot circles to color them differently
          const circles: {circle: Element, parent: ParentNode | null, orig: ordinal[], expId: number}[] = [];
          plot.querySelectorAll('[aria-label="dot"] circle').forEach(circle => {
            const t: any = circle.querySelector("title"); // `any` feels like a HACK, but very resistant to work otherwise
            const { orig, expId }: {orig:  ordinal[], expId: number} = JSON.parse(t.textContent);
            const parent = circle.parentNode;
            circles.push({circle, parent, orig, expId})

            // Done using circle ordinal & id info, reset textContent so onHover of points doesn't bother the user
            t.textContent = ''
          });
          let brushedPoints: ordinal[][] = [];

          // Layering brushing on top of plot
          const brush = brushX()
            // Bounds brushing is enabled in, rectangle in svg created by x+y axes
            .extent([[39, 17], [782, 269]]) 
            .on('brush', (event: any) => {
              const selection = event.selection;
              if (selection) {
                const [x1, x2] = selection; // x bounds
                
                // To store ordinal values of all points within brushed region
                brushedPoints = [];
                // For each circle, highlight if within brushed area
                circles.forEach((c) => {
                  const xPos = Number(c.circle.getAttribute("cx"));

                  // grey out points outside of brushed bounds, remove styling from selected points
                  if (!(x1 <= xPos && xPos <= x2)) { 
                    c.circle.setAttribute("class", "unbrushed"); // grey out
                  } else {
                    c.circle.setAttribute("class", "brushed");
                    brushedPoints.push(c.orig);
                  }
                });
                
                // For each line, highlight portion within brushed region
                highlightMap.forEach((hLine) => {
                  hLine.line.setAttribute("class", "unbrushed-line"); // grey out

                  // Calculate highlight line path, render on top of greyed original lines
                  hLine.newPath.setAttribute('d', calculatePath(selection, hLine.d));
                  svg.appendChild(hLine.pathG);
                })
              } 
            })
            .on('end', (event: any) => {
              if (event.selection){
                // store selected points subset in global variable, triggers re-render
                const firstPoint = brushedPoints.length > 0 ? brushedPoints[0] : null;
                const lastPoint = brushedPoints.length > 0 ? brushedPoints[brushedPoints.length - 1] : null;

                const firstFloat = firstPoint !== null ? firstPoint.map(v => ordinals.ordinalToFloat(v)) : null;
                const lastFloat = lastPoint !== null ? lastPoint.map(v => ordinals.ordinalToFloat(v)) : null;

                setSelectedSubset({
                  selection: event.selection,
                  varIdx: i, 
                  points: brushedPoints,
                });
                fetch('https://herbie.uwplse.org/odyssey-log/log', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    sessionId: sessionStorage.getItem('sessionId'),
                    actionType: "BrushedPoints",
                    start: { ordinal: firstPoint, float: firstFloat },
                    end: { ordinal: lastPoint, float: lastFloat },
                    timestamp: new Date().toLocaleString(),
                  }),
                })
                .then(response => {
                  if (response.ok) {
                    console.log('Server is running and log saved');
                  }
                  else {
                    console.error('Server responded with an error:', response.status);
                  }
                })
                .catch(error => console.error('Request failed:', error));
                // Selected points & selected subset cannot exist simultaneously
                setSelectedPoint(undefined);
              } else { // empty selection, revert brush styling
                circles.forEach((c) => c.circle.removeAttribute("class"));
                highlightMap.forEach((highlightLine) => {
                  highlightLine.line.removeAttribute("class");
                  highlightLine.newPath.removeAttribute("d");
                })
              }
            });
          
          select(svg).append('g')
            .attr('id', 'brush')
            .call(brush)
            .on("click dblclick", () => {
              brush.clear(select(svg).select('g'));
              // Returns lines & points to original colors
              circles.forEach((c) => c.circle.removeAttribute("class"));
              highlightMap.forEach((highlightLine) => {
                highlightLine.line.removeAttribute("class");
                highlightLine.newPath.removeAttribute("d");
              })

              // un-set global selected subset & analysis states, triggers re-render
              setSelectedSubset(undefined);
              setSelectedAnalysis(undefined);
            });

          // Append all plot components to svg
          [...plot.children].map(c => svg.appendChild(c));

          // If a point is selected, append point label to plot
          if (labelContainer && labelPoint && labelPointBorder) {
            svg.appendChild(labelPointBorder);
            svg.appendChild(labelContainer);
            svg.appendChild(labelPoint);
          } else if (selectedSubset) { // maybe brushing is happening
            // This styling only appears for plot where brushing originally appeared (adj points)
            if (selectedSubset.varIdx === i) {
              // set shading rectangle
              const selectionRect = svg.getElementById('brush').querySelector('.selection');
              selectionRect?.removeAttribute("style"); // remove style="display: none;"
              selectionRect?.setAttribute("x", `${selectedSubset.selection[0]}`);
              selectionRect?.setAttribute("y", "17");
              selectionRect?.setAttribute("width", `${selectedSubset.selection[1] - selectedSubset.selection[0]}`);
              selectionRect?.setAttribute("height", "252");

              // append highlight lines
              highlightMap.forEach((highlightLine, lineExpIdx) => {
                highlightLine.line.setAttribute("class", "unbrushed-line");

                // Calculate highlight line path, render on top of greyed original lines
                highlightLine.newPath.setAttribute('d', calculatePath(selectedSubset.selection, highlightLine.d));
                if (lineExpIdx !== selectedExprId) {
                  svg.appendChild(highlightLine.pathG);
                }
              })
              // append line for selected expression last so it's on top:
              const selectedHighlight = highlightMap.get(selectedExprId);
              if (selectedHighlight) {
                svg.appendChild(selectedHighlight.pathG);
              }
            } else {
              // Just grey out lines
              highlightMap.forEach((highlightLine, _) => {
                highlightLine.line.setAttribute("class", "unbrushed-line");
              });
            }

            // grey out unbrushed circles
            circles.forEach((c) => {
              // determine if it's one of the selected subset
              if (selectedSubset.points.some(p => p.every((v, i) =>  v === c.orig?.[i]))) { 
                c.circle.setAttribute("class", "brushed");
                // bit of a a hack to get circle on top of unbrushed circles:
                c.parent?.removeChild(c.circle)
                c.parent?.appendChild(c.circle)
              } else {
                c.circle.setAttribute("class", "unbrushed"); // grey out
              }
            })
          }
        }} />
        {/* Tooltip for full selected value on selected point label*/}
        <Tooltip anchorSelect=".full-num-anchor" place="top" >
          {selectedPoint ? selectedPoint[i] : ""}
        </Tooltip>
        {/* Tooltip for deselect 'X' on selected point label*/}
        <Tooltip anchorSelect=".deselect" place="top" >
          Deselect
        </Tooltip>
      </div>
    })}
  </div>

}

export { ErrorPlot }
