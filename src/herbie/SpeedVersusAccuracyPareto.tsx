import React from 'react';
const Plot = require('@observablehq/plot')  // have to do this for ES modules for now
import * as ordinals from './lib/ordinals'
import { ordinal } from './HerbieTypes'
import './SpeedVersusAccuracyPareto.css';

interface SpeedVersusAccuracyParetoProps {
    // Define your component props here
}
// type Point = [number, number]
type Point = {
    cost: number
    accuracy: number
    id: number
}

async function plotParetoPoints (bits: number, initial_pt: Point, rest_pts: Point[], clickedExpressionId: number, expressionStyles: ExpressionStyle[]) {
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
                // fill: "#00a",
                // fill the point with its respective color in ExpressionsStyleContext
                fill: (d: Point) => {
                    const style = expressionStyles.find(s => s.expressionId === d.id);
                    return style?.color || 'black';
                },
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
    out.querySelectorAll('[aria-label="dot"] circle').forEach((dot: any, i: number) => {
        // for each circle, set the data-id attribute to the id of the expression of that point
        dot.setAttribute("data-id", rest_pts[i].id);
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

import * as Contexts from './HerbieContext';
import { debug } from 'console';
import { ExpressionStyle } from './HerbieTypes';

const SpeedVersusAccuracyPareto: React.FC<SpeedVersusAccuracyParetoProps> = (props) => {
    // Access ExpressionStylesContext
    const [expressionStyles, setExpressionStyles] = Contexts.useGlobal(Contexts.ExpressionStylesContext);
    const [color, setColor] = React.useState('red');
    // Access the global expressions field
    const [allExpressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
    // get the spec
    const [spec, setSpec] = Contexts.useGlobal(Contexts.SpecContext);
    // get the costs and errors for each expression
    const [costs, setCosts] = Contexts.useGlobal(Contexts.CostContext);
    const [analyses, setAnalyses] = Contexts.useGlobal(Contexts.AnalysesContext);
    // convert error to percent accuracy
    const errorToAccuracy = (error: number) => error// 1 - error / 64;
    // get the spec's expression

    
    //get archived expressions
    const [archivedExpressions, setArchivedExpressions] = Contexts.useGlobal(Contexts.ArchivedExpressionsContext);
    //filter expressions such that we only have the ones that are not archived

    // const expressions = allExpressions.filter(e => !archivedExpressions.includes(e.id));
    
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
    const [selectedExprIds, setSelectedExprIds] = Contexts.useGlobal(Contexts.CompareExprIdsContext);
    // get the selected expression id
    // const naiveExpressionId = naiveExpression?.id || 0;
    const naiveExpressionId = selectedExprIds.find(id => id === naiveExpression.id) || 0;

    // get the clicked on expression
    const [selectedExprId, setSelectedExprId] = Contexts.useGlobal(Contexts.SelectedExprIdContext);

    //filter selected expressions 
    // const expressions = allExpressions.filter(e => !archivedExpressions.includes(e.id));
    const filteredExpressionIds = selectedExprIds.filter(e => !archivedExpressions.includes(e));

    // iterate through each expression to find its cost and accuracy and store them in an array as as [cost, accuracy] tuple
    const points = filteredExpressionIds.map(id => {
        const cost = costs.find(c => c.expressionId === id)?.cost;
        const error = analyses.find(a => a.expressionId === id)?.data.meanBitsError;
        if (cost === undefined || error === undefined) {
            throw new Error(`Cost or error not found for expression ${id}`);
        }
        const accuracy = errorToAccuracy(error);
        return { cost: cost, accuracy: accuracy, id: id } as Point;
    });

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
                        console.log('Setting selected point')
                        setSelectedExprId(parseInt(t.getAttribute("data-id")));
                    }
                });


    // // Add event listener to update clickedExpressionId when a point is clicked
    // out.querySelectorAll('[aria-label="dot"] circle').forEach((circle: any) => {
    //     circle.addEventListener('click', (event: MouseEvent) => {
    //         const title = circle.querySelector('title');
    //         if (title) {
    //             const data = JSON.parse(title.textContent);
    //             setClickedExpressionId(data.id);
    //         }
    //     });
    // });

                // plot.querySelectorAll('[aria-label="dot"] circle title').forEach((t: any) => {
                //     const { o, id }: {o :  ordinal[], id: number} = JSON.parse(t.textContent)
        
                //     t.textContent = o.map((v : ordinal, i :number) => `${vars[i]}: ${herbiejs.displayNumber(ordinals.ordinalToFloat(v))}`).join('\n')
        
                //     const c = t.parentNode
                //     const point = o.map((v: ordinal) => ordinals.ordinalToFloat(v))
                //     t.parentNode.onclick = async () => {
                //       console.log('Setting selected point to', o)
                //       setSelectedPoint(point)
                //       setSelectedExprId(id)
                //     }
                

                ([...plot.children]).map(c => svg.appendChild(c))
            }
        }></svg>
        </div>
    );
};

export default SpeedVersusAccuracyPareto;
