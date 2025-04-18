import * as contexts from './HerbieContext';
import React, { useState } from 'react';
import  './GPU_FPX.css';
import { FPCoreGetBody, getVarnamesFPCore, makeFPCore2, mathjs, mathjsToFPCore } from './lib/fpcore';
/**
 * The GPU-FPX integration component, makes fetch calls to FPBench to convert FPCore expressions to CUDA from the expression table,
 * then sends those CUDA expressions to GPU-FPX, runs GPU-FPX, and then outputs it's results in this component 
 * @param param0 the current expression ID to run the component with
 * @returns the GPU-FPX component
 */
const GPU_FPX = ({ expressionId }: {expressionId: number }) => {

    const [expressions, ] = contexts.useGlobal(contexts.ExpressionsContext);
    const [infoFlag, setInfoFlag] = React.useState(false);
    const [exceptionFlag, setExceptionFlag] = React.useState(false);
    const [displayInfo, setDisplayInfo] = React.useState(false);
    const [exceptionStatusMessage, setExceptionStatusMessage] = useState<string>("Unchecked expression");
    const [exceptionStatusColor, setExceptionStatusColor] = useState<string>("orange");
    const [analyzerResult, setAnalyzerResult] = useState<string>("");
    const [detectorResult, setDetectorResult] = useState<string>("");
    // const [runButtonState, setRunButtonState] = React.useState(true);
    // let exceptionFlag = false
    let runButtonState = true


    // Get the expression text to send to GPU-FPX
    const expressionText = expressions.find(expr => expr.id === expressionId);

    //TODO : will need to change this to be asyc based on GPU-FPX results using useEffect 
    function exceptionStatusHandler(flag : boolean){
        if(flag){
            setExceptionStatusMessage("Exception found")
            setExceptionStatusColor('red')
        }
        else{
        setExceptionStatusMessage("No exception found")
        setExceptionStatusColor('#8ff51b')
        }
    }

    function handleRunClick(){
        runButtonState = !runButtonState
        runGPUFPX();
    }

    function updateFromGPUFPX(detectorDataString : string){
        // if (searchForExceptionsInDetectorOutput(detectorDataString)){
        //     setExceptionFlag(!exceptionFlag)
        // }
        // if(exceptionFlag){
        //     setInfoFlag(!infoFlag)
        // }
        // exceptionStatusHandler();
        if (searchForExceptionsInDetectorOutput(detectorDataString)){
            exceptionStatusHandler(true)
        }
        else{
            exceptionStatusHandler(false);
        }
    }
    
    function runGPUFPX(){
        handleRunAnalysis();

    }

    const viewMoreInfoClick = () => {
        setDisplayInfo(!displayInfo);
    }

    /**
     * Searches for exception in the output from GPU-FPX for the detector
     * @returns true if there is an exception found in the detector report, false otherwise
     */
    const searchForExceptionsInDetectorOutput = (detectorData : string) => {
        console.log("Detector Result:" + detectorResult)
        console.log("Analyzer Result:" + analyzerResult)
        

        let noExceptionString = "Zero Exceptions Detected";
        if (detectorData.search(noExceptionString) !== -1){
            return false
        }
        return true
        
        
        // let exceptionString : string = "The total number of exceptions are:"
        // let index : number = detectorResult.search(exceptionString) + 35;
        // let exceptionCountSubstring : string = detectorResult.substring(index,index + 4)
        
        // if(!exceptionCountSubstring.includes("0")){
        //     console.log("In search for exceptions, there was an exception found, this is the number:" + exceptionCountSubstring)
        //     return true
        // }
    }

    //----------------- G P U - F P X  C A L L S ------------------//

    const handleRunAnalysis = async () => {
        try {
        // convert mathjs to fpcore
        const fpCoreExpr = mathjsToFPCore(expressionText?.text as unknown as mathjs);
        const fpBenchExpr = makeFPCore2({
            vars: getVarnamesFPCore(fpCoreExpr),
            pre: "(<= 0 x 10)",
            body: FPCoreGetBody(fpCoreExpr) 
        });
        // console.log("Current Expression format before FpBench:", current_expression);
        console.log("Starting FPBench conversion for expression:", fpBenchExpr);
        const fpbenchResponse = await fetch('https://herbie.uwplse.org/fpbench/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                formulas: [fpBenchExpr],
                lang: 'cu'
            })
        });

        const fpbenchResult = await fpbenchResponse.json();
        console.log("Raw FPBench result:", fpbenchResult);
        //Extract just the expression from the function body
        const functionMatch = fpbenchResult.stdout.match(/return\s+(.*?);/);
        const cudaExpr = functionMatch ? functionMatch[1].trim() : fpbenchResult.stdout;
        console.log("Extracted CUDA expression:", cudaExpr);
        
        // Now we can run GPU-FPX with the extracted expression
            const analyzerResponse = await fetch('http://155.98.68.136:8001/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formulas: [cudaExpr]
                })
            });
            let analyzerDataJSON = await analyzerResponse.json();
            let analyzerDataString = JSON.stringify(analyzerDataJSON);    
            console.log(analyzerDataString);
            // setAnalyzerResult(analyzerDataString);

            // Then run detector
            const detectorResponse = await fetch('http://155.98.68.136:8003/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formulas: [cudaExpr]
                })
            });
            // let detectorData = await detectorResponse.json();
            // console.log(detectorData);
            // setDetectorResult(detectorData);
            let detectorDataJSON = await detectorResponse.json();
            let detectorDataString = JSON.stringify(detectorDataJSON);    
            console.log(detectorDataString);
            updateFromGPUFPX(detectorDataString)
            // setDetectorResult(detectorDataString);
            console.log("Printing detector result in handleRunAnalysis:" + detectorResult)
        } catch (error) {
            console.error('Error running GPU-FPX:', error);
            // Handle error appropriately
        }

        
    };



    

        return (
        <div className='gpu-fpx'>
            <p>This tool is in progress, do not use.</p>
            <p>Click "Run Check" to see if there are floating point exceptions with this expression when run on an Nvidia GPU.</p>
            
             <div className="status">
                <svg width="10" height="10" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="7" fill={exceptionStatusColor}/>
                </svg>
                {exceptionStatusMessage === "Unchecked expression"?
                <p className='p-item'>{exceptionStatusMessage}</p>
                : ""}
                {exceptionStatusMessage === "Exception found"?
                <p className='p-item-exception-found'>{exceptionStatusMessage}</p>
                : ""}
                {exceptionStatusMessage === "No exception found"?
                <p className='p-item-exception-not-found'>{exceptionStatusMessage}</p>
                : ""}

                {infoFlag ?
                <div>
                    <button className="more-info-button" onClick={viewMoreInfoClick}>More Info</button>
                </div>
                : ""}
                <button className={runButtonState ?
                   "run-button" : "disabled-run-button"}  onClick={handleRunClick}>Run Check</button>
             </div> 
             {displayInfo ? 
             <div>
                <p className='info-header'>The expression {expressionText?.text} is causing floating point exceptions on Nvidia GPU's.</p>
             </div>: ""}
            
        </div>
        );    
    };

export { GPU_FPX };