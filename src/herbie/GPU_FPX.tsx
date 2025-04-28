import * as contexts from './HerbieContext';
import React, { useState } from 'react';
import  './GPU_FPX.css';
import { FPCoreGetBody, getVarnamesFPCore, makeFPCore2, mathjs, mathjsToFPCore } from './lib/fpcore';
import { render } from 'katex';

let analyzerResultArrayVar : Array<string> = [];
let detectorResultArrayVar: Array<string> = [];
let objDumpArrayVar: Array<string> = [];

/**
 * The GPU-FPX integration component, makes fetch calls to FPBench to convert FPCore expressions to CUDA from the expression table,
 * then sends those CUDA expressions to GPU-FPX, runs GPU-FPX, and then outputs it's results in this component 
 * @param param0 the current expression ID to run the component with
 * @returns the GPU-FPX component
 */
const GPU_FPX = ({ expressionId }: {expressionId: number }) => {

    const [expressions, ] = contexts.useGlobal(contexts.ExpressionsContext);
    const [infoFlag, setInfoFlag] = React.useState(false);
    const [exceptionReportInfo, setexceptionReportInfo] = React.useState(false);
    const [exceptionStatusMessage, setExceptionStatusMessage] = useState<string>("Unchecked expression");
    const [exceptionStatusColor, setExceptionStatusColor] = useState<string>("orange");
    const [analyzerResult, setAnalyzerResult] = React.useState<string>("");
    const [detectorResult, setDetectorResult] = React.useState<string>("");
    const [runButtonState, setRunButtonState] = React.useState(true);
    const [gpuRegisterClick,setgpuRegisterClick] = React.useState(false);
    const [SASSInfo,setSASSInfo] = React.useState(false);

    const [analyzerResultArray,setanalyzerResultArray] = React.useState<string[]>([]);
    const [detectorResultArray,setdetectorResultArray]= React.useState<string[]>([]);
    const [objDumpArray,setobjDumpArray]= React.useState<string[]>([]);



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
        setRunButtonState(false);
        handleRunAnalysis();
    }

    function updateFromGPUFPX(detectorDataString : string){
        if (searchForExceptionsInDetectorOutput(detectorDataString)){
            exceptionStatusHandler(true);
            setInfoFlag(true);
            setRunButtonState(true);
        }
        else{
            exceptionStatusHandler(false);
        }
    }

    const exceptionInfoClick = () => {
        setexceptionReportInfo(!exceptionReportInfo);
    }

    const gpuRegisterClickHandler = () => {
        setgpuRegisterClick(!gpuRegisterClick);
    }

    const SASSClickHandler = () => {
        setSASSInfo(!SASSInfo);
    }

    
    function cleanOutputForDisplay(dataString : string) {
        let toClean : string = dataString;
        let cleanedResultArray = toClean.split("\\n");
        console.log(cleanedResultArray);
        return cleanedResultArray;
    }

    function cleanAnalyzerResultsAndRender(jsonData : string){
        let analyzerDataString = JSON.stringify(jsonData);    
        console.log(analyzerDataString);
        setAnalyzerResult(analyzerDataString);
        let cleanedResultArray = cleanOutputForDisplay(analyzerDataString);
        // analyzerResultArrayVar = cleanedResultArray.slice(1,cleanedResultArray.length-1);
        setanalyzerResultArray(cleanedResultArray.slice(1,cleanedResultArray.length-1))
    }

    function cleanDetectorResultsAndRender(jsonData : string){
        let detectorDataString = JSON.stringify(jsonData);    
        setDetectorResult(detectorDataString);
        updateFromGPUFPX(detectorDataString);
        let cleanedDetectorArray = cleanOutputForDisplay(detectorDataString);
        setdetectorResultArray(cleanedDetectorArray.slice(4,16));
        setobjDumpArray(cleanedDetectorArray.slice(17,cleanedDetectorArray.length-1));
        // detectorResultArrayVar = cleanedDetectorArray.slice(4,16);
        // objDumpArrayVar = cleanedDetectorArray.slice(17,cleanedDetectorArray.length-1);
    }

    /**
     * Searches for exception in the output from GPU-FPX for the detector
     * @returns true if there is an exception found in the detector report, false otherwise
     */
    const searchForExceptionsInDetectorOutput = (detectorData : string) => {
        let noExceptionString = "Zero Exceptions Detected";
        if (detectorData.search(noExceptionString) !== -1){
            return false
        }
        return true
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
            cleanAnalyzerResultsAndRender(analyzerDataJSON);

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
            let detectorDataJSON = await detectorResponse.json();

            cleanDetectorResultsAndRender(detectorDataJSON);
            
        } catch (error) {
            console.error('Error running GPU-FPX:', error);
            // Handle error appropriately
        }

        
    };
        return (
        <div className='gpu-fpx'>
            <p>This tool is in progress, do not use.</p>
            <p className='info-header'>Click "Run Check" to see if there are floating point exceptions with this expression when run on an Nvidia GPU.</p>
            
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
                    <button className="more-info-button" onClick={exceptionInfoClick}>Exception Report</button>
                    <button className="more-info-button" onClick={gpuRegisterClickHandler}>GPU Register Info</button>
                    <button className="more-info-button" onClick={SASSClickHandler}>SASS Instructions</button>
                </div>
                : ""}
                <button 
                   className={runButtonState ? "run-button" : "disabled-run-button"}  
                   onClick={runButtonState ? handleRunClick : undefined}>
                   Run Check
                </button>
             </div> 
             {(exceptionReportInfo || SASSInfo || gpuRegisterClick) ? 
             <div className='gpu-fpx-results'>
                <p>The expression <span className='expression-text-gpu-fpx'>{expressionText?.text}</span> is causing floating point exceptions on Nvidia GPU's.</p>
                <p>Our program reported the following results:</p>
                {/* Show the detecter report, that is the button clicked */}
                {exceptionReportInfo ?
                <div className="result-area">
                    <p style={{ fontWeight: 'bold'}}>Here is the exceptional values found:</p>
                    {detectorResultArray.map((item, index) => (
                        <p key={index}>{item}</p>
                    ))}
                </div>: ""}
                {gpuRegisterClick ?
                <div className="result-area">
                    <p style={{ fontWeight: 'bold'}}>Here is the flow of the exceptional values through the instructions:</p>
                    {analyzerResultArray.map((item, index) => (
                    <p key={index}>{item}</p>
                     ))}
                </div>: ""}
                {SASSInfo ? 
                <div className="result-area" >
                    <p style={{ fontWeight: 'bold'}}>Here are the SASS instructions:</p>
                    {objDumpArray.map((item, index) => (
                    <p key={index}>{item}</p>
                     ))}
                </div>: ""}
                
             </div>: ""}
            
        </div>
        );    
    };

export { GPU_FPX };

