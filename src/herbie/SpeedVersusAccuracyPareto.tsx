import React from 'react';
const Plot = require('@observablehq/plot')  // have to do this for ES modules for now


interface SpeedVersusAccuracyParetoProps {
    // Define your component props here
}
type Point = [number, number]

async function plotParetoPoints (bits: number, initial_pt: Point, rest_pts: Point[]) {
    // const bits = benchmark["bits"];

    // The line differs from rest_pts in two ways:
    // - We filter to the actual pareto frontier, in case points moved
    // - We make a broken line to show the real Pareto frontier
    let line: Point[] = [];

    // create a new array with rest_pts reverse sorted from lowest to highest cost
    const sorted_pts = rest_pts.slice().sort((a, b) => a[0] - b[0]);  // note: should be b - a, changed to a - b to revert to old working version
    console.log("sorted points: ", sorted_pts);
    debugger;

    let mostAccurateSoFar: Point | null = null;  // not needed, since we have mostAccurateSoFar. Reverted to old working version
    
    for (let pt of sorted_pts) {
        if (!mostAccurateSoFar || pt[1] < mostAccurateSoFar[1]) {
            if (mostAccurateSoFar) line.push([pt[0], mostAccurateSoFar[1]]);
            line.push([pt[0], pt[1]]);
            mostAccurateSoFar = pt;
        }
    }

    const out = Plot.plot({
        marks: [
            Plot.line(line, {
                x: (d: Point) => initial_pt[0]/d[0],
                y: (d: Point) => 1 - d[1]/bits,
                stroke: "#00a", strokeWidth: 3, strokeOpacity: .6,
            }),
            Plot.dot(rest_pts, {
                x: (d: Point) => initial_pt[0]/d[0],
                y: (d: Point) => 1 - d[1]/bits,
                fill: "#00a", r: 9,
            }),
        ].filter(x=>x),
        marginBottom: 0,
        marginRight: 0,
        width: '800',
        height: '300',
        x: { line: true, nice: true, tickFormat: (c : string) => c + "×" },
        y: { nice: true, line: true, domain: [0, 1], tickFormat: "%" },
    })
    return out
}

async function makeExampleSVG(color: string) {
    // make a simple svg
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100');
    svg.setAttribute('height', '100');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '10');
    rect.setAttribute('y', '10');
    rect.setAttribute('width', '80');
    rect.setAttribute('height', '80');
    rect.setAttribute('fill', color);
    svg.appendChild(rect);
    return svg;
}

import * as Contexts from './HerbieContext';
import { debug } from 'console';

const SpeedVersusAccuracyPareto: React.FC<SpeedVersusAccuracyParetoProps> = (props) => {
    const [color, setColor] = React.useState('red');
    // Access the global expressions field
    const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
    // get the spec
    const [spec, setSpec] = Contexts.useGlobal(Contexts.SpecContext);
    // get the costs and errors for each expression
    const [costs, setCosts] = Contexts.useGlobal(Contexts.CostContext);
    const [analyses, setAnalyses] = Contexts.useGlobal(Contexts.AnalysesContext);
    // convert error to percent accuracy
    const errorToAccuracy = (error: number) => error// 1 - error / 64;
    // get the spec's expression
    const naiveExpression = expressions.find(e => e.text === spec.expression);
    if (naiveExpression === undefined) {
        return <div>Naive expression not found</div>
    }
    // get the cost and accuracy for the naiveExpression
    const naiveCost = costs.find(c => c.expressionId === naiveExpression.id)?.cost;
    const naiveError = analyses.find(a => a.expressionId === naiveExpression.id)?.data.meanBitsError;
    if (naiveCost === undefined || naiveError === undefined) {
        return <div>Naive cost or error not found</div>
    }
    const naiveAccuracy = errorToAccuracy(naiveError);
    // get the ids of the selected expressions
    const [selectedExprIds, setSelectedExprIds] = Contexts.useGlobal(Contexts.CompareExprIdsContext);

    // iterate through each expression to find its cost and accuracy and store them in an array as as [cost, accuracy] tuple
    const points = selectedExprIds.map(id => {
        const expression = expressions.find(e => e.id === id);
        if (expression === undefined) {
            return [0, 0] as Point;
        }
        const cost = costs.find(c => c.expressionId === expression.id)?.cost;
        const error = analyses.find(a => a.expressionId === expression.id)?.data.meanBitsError;
        if (cost === undefined || error === undefined) {
            return [0, 0] as Point;
        }
        const accuracy = errorToAccuracy(error);
        return [cost, accuracy] as Point;
    });

    return (
        <div>
            {/* Use a ref to update the svg*/}
            <svg viewBox="0 -25 840 360" ref={async (svg) => {
                if (!svg) {
                    return
                  }
                  svg.innerHTML = ''
                  const plot = await plotParetoPoints(64, [naiveCost, naiveAccuracy], points);
                  ([...plot.children]).map(c => svg.appendChild(c))
            }
        }></svg>
        </div>
    );
};

export default SpeedVersusAccuracyPareto;
