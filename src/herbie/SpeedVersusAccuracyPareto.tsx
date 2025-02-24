import React from 'react';

import * as HerbieContext from './HerbieContext';
import { ExpressionStyle } from './HerbieTypes';

const Plot = require('@observablehq/plot')  // have to do this for ES modules for now
import './SpeedVersusAccuracyPareto.css';

interface SpeedVersusAccuracyParetoProps {
    // Define your component props here
}

type Point = {
    cost: number
    accuracy: number
    id: number
}

async function plotParetoPoints (bits: number, initial_pt: Point, rest_pts: Point[], clickedExpressionId: number, expressionStyles: ExpressionStyle[]) {
    // The line differs from rest_pts in two ways:
    // - We filter to the actual pareto frontier, in case points moved
    // - We make a broken line to show the real Pareto frontier

    // initialize line as empty object
    let line: Point[] = [];

    // create a new array with rest_pts reverse sorted from lowest to highest cost
    const sorted_pts = rest_pts.slice().sort((a, b) => a.cost - b.cost);

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
                // fill the point with its respective color in ExpressionsStyleContext
                fill: (d: Point) => {
                    const style = expressionStyles.find(s => s.expressionId === d.id);
                    return style?.color || 'black';
                },
                // Larger radius for selected expression
                r: (d: Point) => d.id === clickedExpressionId ? 10 : 4,
                title: (d: Point) => d.id, // HACK to pass expression id 
            }),
        ].filter(x=>x),
        marginBottom: 0,
        marginRight: 0,
        width: '800',
        height: '300',
        x: { line: true, nice: true, tickFormat: (c : string) => c + "×" },
        y: { nice: true, line: true, domain: [0, 1], tickFormat: "%" },
    })
    out.querySelectorAll('[aria-label="dot"] circle').forEach((dot: any, i: number) => {
        // for each circle, set the data-id attribute to the id of the expression of that point
        const title = dot.querySelector('title');
        dot.setAttribute("data-id", title?.textContent);
        dot.removeChild(title);
    });
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

const SpeedVersusAccuracyPareto: React.FC<SpeedVersusAccuracyParetoProps> = (props) => {
    // Access ExpressionStylesContext
    const [expressionStyles, setExpressionStyles] = HerbieContext.useGlobal(HerbieContext.ExpressionStylesContext);
    const [color, setColor] = React.useState('red');
    // Access the global expressions field
    const [allExpressions, setExpressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext);
    // get the spec
    const [spec, setSpec] = HerbieContext.useGlobal(HerbieContext.SpecContext);
    // get the costs and errors for each expression
    const [costs, setCosts] = HerbieContext.useGlobal(HerbieContext.CostContext);
    const [analyses, setAnalyses] = HerbieContext.useGlobal(HerbieContext.AnalysesContext);
    // convert error to percent accuracy
    const errorToAccuracy = (error: number) => error// 1 - error / 64;
    //get archived expressions
    const [archivedExpressions, setArchivedExpressions] = HerbieContext.useGlobal(HerbieContext.ArchivedExpressionsContext);
    
    // get the spec's expression
    const naiveExpression = allExpressions.find(e => e.text === spec.expression);
    if (naiveExpression === undefined) {
        return <div></div>//Naive expression not found</div>
    }
    // get the cost and accuracy for the naiveExpression
    const naiveCost = costs.find(c => c.expressionId === naiveExpression.id)?.cost;
    const naiveError = analyses.find(a => a.expressionId === naiveExpression.id)?.data.meanBitsError;
    if (naiveCost === undefined || naiveError === undefined) {
        return <div></div>//Naive cost or error not found</div>
    }
    const naiveAccuracy = errorToAccuracy(naiveError);
    // get the ids of the selected expressions
    const [selectedExprIds, setSelectedExprIds] = HerbieContext.useGlobal(HerbieContext.CompareExprIdsContext);
    // get the selected expression id
    const naiveExpressionId = selectedExprIds.find(id => id === naiveExpression.id) || 0;

    // get the clicked on expression
    const [selectedExprId, setSelectedExprId] = HerbieContext.useGlobal(HerbieContext.SelectedExprIdContext);

    //filter selected expressions 
    const filteredExpressionIds = selectedExprIds.filter(e => !archivedExpressions.includes(e));

    // iterate through each expression to find its cost and accuracy and store them in an array as as [cost, accuracy] tuple
    const points = filteredExpressionIds.map(id => {
        const cost = costs.find(c => c.expressionId === id)?.cost;
        const error = analyses.find(a => a.expressionId === id)?.data.meanBitsError;
        if (cost === undefined || error === undefined) {
            return undefined;
        }
        const accuracy = errorToAccuracy(error);
        return { cost: cost, accuracy: accuracy, id: id } as Point;
    }).filter(p => p) as Point[];

    return (
        <div className="speedVersusAccuracyPareto">
            {/* Use a ref to update the svg*/}
            <svg viewBox="-10 -25 840 360" ref={async (svg) => {
                if (!svg) {
                    return
                  }
                  svg.innerHTML = ''
                const plot = await plotParetoPoints(64, { cost: naiveCost, accuracy: naiveAccuracy, id: naiveExpressionId }, points, selectedExprId, expressionStyles);
                
                plot.querySelectorAll('[aria-label="dot"] circle').forEach((t: any) => {
                    // if a point if clicked (onclick), set its clickedExpressionID
                    t.onclick = async() => {
                        setSelectedExprId(parseInt(t.getAttribute("data-id")));
                    }
                });    

                ([...plot.children]).map(c => svg.appendChild(c))
            }
        }></svg>
        </div>
    );
};

export default SpeedVersusAccuracyPareto;
