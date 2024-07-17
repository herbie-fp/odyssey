import React from 'react';
const Plot = require('@observablehq/plot')  // have to do this for ES modules for now


interface SpeedVersusAccuracyParetoProps {
    // Define your component props here
}
// type Point = [number, number]
type Point = {
    cost: number
    accuracy: number
    id: number
}

async function plotParetoPoints (bits: number, initial_pt: Point, rest_pts: Point[], clickedExpressionId: number) {
    // const bits = benchmark["bits"];

    // The line differs from rest_pts in two ways:
    // - We filter to the actual pareto frontier, in case points moved
    // - We make a broken line to show the real Pareto frontier
    // let line: Point[] = [];
    // initialize line as empty object
    let line: Point[] = [];

    // create a new array with rest_pts reverse sorted from lowest to highest cost
    const sorted_pts = rest_pts.slice().sort((a, b) => a.cost - b.cost);
    console.log("sorted points: ", sorted_pts);
    // debugger;

    let mostAccurateSoFar: Point | null = null; 
    
    for (let pt of sorted_pts) {
        if (!mostAccurateSoFar || pt.accuracy < mostAccurateSoFar.accuracy) {
            if (mostAccurateSoFar) {
                line.push({ cost: pt.cost, accuracy: mostAccurateSoFar.accuracy, id: pt.id});
            }
            line.push({ cost: pt.cost, accuracy: pt.accuracy, id: pt.id });
            mostAccurateSoFar = pt;
        }
    }

    const out = Plot.plot({
        r: {range: [0, 10]},
        marks: [
            Plot.line(line, {
                x: (d: Point) => initial_pt.cost/d.cost,
                y: (d: Point) => 1 - d.accuracy/bits,
                stroke: "#00a", strokeWidth: 3, strokeOpacity: .6,
            }),
            Plot.dot(rest_pts, {
                x: (d: Point) => initial_pt.cost/d.cost,
                y: (d: Point) => 1 - d.accuracy/bits,
                // if the id of the selected expression is equal to the id of the current point, set the radius to 15, otherwise set it to 9
                fill: "#00a", 
                r: (d: Point) => d.id === clickedExpressionId ? 8 : 2,
                
                // fill: "#00a", r: (d: Point) => initial_pt.id === 1 ? 50 : 15, 
                // TODO: Fix this ^^^
                // fill: "#00a", r: 9,
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
    // get the selected expression id
    // const naiveExpressionId = naiveExpression?.id || 0;
    const naiveExpressionId = selectedExprIds.find(id => id === naiveExpression.id) || 0;

    // get the clicked on expression
    const [clickedExpressionId, setClickedExpressionId] = Contexts.useGlobal(Contexts.SelectedExprIdContext);

    // iterate through each expression to find its cost and accuracy and store them in an array as as [cost, accuracy] tuple
    const points = selectedExprIds.map(id => {
        const expression = expressions.find(e => e.id === id);
        if (expression === undefined) {
            return { cost: 0, accuracy: 0, id: 0 } as Point;
        }
        const cost = costs.find(c => c.expressionId === expression.id)?.cost;
        const error = analyses.find(a => a.expressionId === expression.id)?.data.meanBitsError;
        if (cost === undefined || error === undefined) {
            return { cost: 0, accuracy: 0, id: 0 } as Point;
        }
        const accuracy = errorToAccuracy(error);
        return { cost: cost, accuracy: accuracy, id: id } as Point;
    });

    return (
        <div>
            {/* Use a ref to update the svg*/}
            <svg viewBox="0 -25 840 360" ref={async (svg) => {
                if (!svg) {
                    return
                  }
                  svg.innerHTML = ''
                const plot = await plotParetoPoints(64, { cost: naiveCost, accuracy: naiveAccuracy, id: naiveExpressionId }, points, clickedExpressionId);
                  ([...plot.children]).map(c => svg.appendChild(c))
            }
        }></svg>
        </div>
    );
};

export default SpeedVersusAccuracyPareto;
