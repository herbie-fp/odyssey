// External imports (libraries, etc.) will go here
import React, { useState } from 'react';
import * as contexts from './HerbieContext';
import './GPU_FPX.css';
import './ExpressionExport';
import { ExpressionExportResponse } from './lib/herbiejs';
import { FPCoreGetBody, FPCorePreconditionFromRanges, getVarnamesFPCore, getVarnamesMathJS, makeFPCore2, mathjs, mathjsToFPCore } from './lib/fpcore';
import { FPTaylorComponent } from './FPTaylorComponent';

/**
 * The GPU-FPX integration component, makes fetch calls to FPBench to convert FPCore expressions to CUDA from the expression table,
 * then sends those CUDA expressions to GPU-FPX, runs GPU-FPX, and then outputs it's results in this component 
 * @param param0 the current expression ID to run the component with
 * @returns the GPU-FPX component
 */
const GPU_FPX = ({ expressionId }: { expressionId: number }) => {
  //Get expressions
  const [expressions, ] = contexts.useGlobal(contexts.ExpressionsContext);
  const current_expression = expressions.find(expression => expression.id === expressionId);
  const [exportCode, setExportCode] = useState<ExpressionExportResponse | null>(null);
  const [gpuFpxSelected] = contexts.useGlobal(contexts.gpuFpxSelected);

  const [showReport, setShowReport] = useState(false);
  const [runAnalyzer, setRunAnalyzer] = useState(false);

  //State for results from Analyzer and Detector
  const [analyzerResult, setAnalyzerResult] = useState<string>("");
  const [detectorResult, setDetectorResult] = useState<string>("");

  // State for loading/error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * FPBench and GPU-FPX Fetch Calls
   */
  const handleRunAnalysis = async () => {
        try {
          //convert mathjs to fpcore
          const fpCoreExpr = mathjsToFPCore(current_expression?.text as unknown as mathjs);
          const fpBenchExpr = makeFPCore2({
            vars: getVarnamesFPCore(fpCoreExpr),
            pre: "(<= 0 x 10)",
            body: FPCoreGetBody(fpCoreExpr) 
          });
          // console.log("Current Expression format before FpBench:", current_expression);
          console.log("Starting FPBench conversion for expression:", fpBenchExpr);
          // Convert to CUDA (for now it's c) using FPBench, also the URL is beast Network host
          const fpbenchResponse = await fetch('http://155.98.69.61:8002/exec', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({
                formulas: [fpBenchExpr],
                // Specify CUDA as target language
                language: 'c'
            })
        });

        const fpbenchResult = await fpbenchResponse.json();
        console.log("Raw FPBench result:", fpbenchResult);
        //Extract just the expression from the function body
        const functionMatch = fpbenchResult.stdout.match(/return\s+(.*?);/);
        const cudaExpr = functionMatch ? functionMatch[1].trim() : fpbenchResult.stdout;
        console.log("Extracted CUDA expression:", cudaExpr);
        // const cudaExpr = "pow(e, sin((pow((x + 1.0), 2.0) - 3.0))) / log(x)";
        
        // Now we can run GPU-FPX with the extracted expression
            const analyzerResponse = await fetch('http://155.98.69.61:8001/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formulas: [cudaExpr]
                })
            });
            const analyzerData = await analyzerResponse.json();
            console.log(analyzerData);
            setAnalyzerResult(analyzerData.stdout);

            // Then run detector
            const detectorResponse = await fetch('http://155.98.69.61:8003/exec', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    formulas: [cudaExpr]
                })
            });
            const detectorData = await detectorResponse.json();
            console.log(detectorData);

            setDetectorResult(detectorData.stdout);

        } catch (error) {
            console.error('Error running GPU-FPX:', error);
            // Handle error appropriately
        }
    };
  
  /**
   * Resets the results for the analyzer and detector so that it can be populated with a new expressions results
   */
  const resetResults = () =>{
    setAnalyzerResult("")
    setDetectorResult("")
  }
  
  /**
   * Button handler for "Run GPU-FPX"
   */
  const handleRunGPUFPXClick = () => {
    resetResults();
    setRunAnalyzer(!runAnalyzer);
    handleRunAnalysis();
};
  /**
   * Report click handler
   */
  const handleReportClick = () => {
    setShowReport(!showReport);
  }
  /**
   * Helper to format the raw detector results from GPU-FPX raw output
   * @param report the output of the extract detector report function call
   * @returns a formatted expression detector results
   */
  const formatDetectorReport = (report: string) => {
    // Split on newlines and filter out empty lines and headers
    return report.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => 
        line && 
        !line.includes('GPU-FPX Report') &&
        !line.startsWith('---')
      )
  }

  /**
   * Helper which extracts the detector report from the rest of the GPU-FPX raw output
   * @param log the original raw output from GPU-FPX
   * @returns just the raw detector output
   */
  const extractDetectorReport = (log: string): string => {
    const startMarker = "------------ GPU-FPX Report -----------";
    const endMarker = "The total number of exceptions are:";
    const start = log.indexOf(startMarker);
    const endLineStart = log.indexOf(endMarker);
    const endLine = log.slice(endLineStart).split('\n')[0];
    
    return log.slice(start, endLineStart + endLine.length);
};

/**
 * Helper which extracts the analyzer report from the rest of the GPU-FPX output
 * @param log the original raw output from GPU-FPX
 * @returns just the raw analyzer output
 */
const extractAnalyzerReport = (log: string): string => {
  const startMarker = "#GPU-FPX-ANA SHARED REGISTER:";
  const endMarker = "This completes the analyzer report.";
  const start = log.indexOf(startMarker);
  const endLineStart = log.indexOf(endMarker);  
  return log.slice(start, endLineStart);
};

//final formatted report to be displayed in the DetectorReport component
const formattedDectectorReport = formatDetectorReport(extractDetectorReport(detectorResult));

/**
 *  Creates the JSX element to display results from runnning GPU-FPX on the selected expression
 * @param param0 the formatted detector report to be displayed in the main component
 * @returns the detector report JSX element
 */
const DetectorReport = ({ formattedDectectorReport }: { formattedDectectorReport: string[] }) => (
  <div>
    <h3>Detector Results</h3>
    <h4>FP64 Operations</h4>
    <p>
      {formattedDectectorReport[0]}<br />
      {formattedDectectorReport[1]}<br />
      {formattedDectectorReport[2]}<br />
      {formattedDectectorReport[3]}<br />
    </p>
    <h4>FP32 Operations</h4>
    <p>
      {formattedDectectorReport[4]}<br />
      {formattedDectectorReport[5]}<br />
      {formattedDectectorReport[6]}<br />
      {formattedDectectorReport[7]}<br />
    </p>
    <h4>Other Stats</h4>
    <p>
      {formattedDectectorReport[8]}<br />
      {formattedDectectorReport[9]}<br />
    </p>
  </div>
);

const AnalyzerReport = extractAnalyzerReport(analyzerResult);

  return (
    <div>
      <p>Current expression:</p>
      <p>{current_expression?.text}</p> 
      {/* <p>The total number of exceptions are: 2</p> */}
      <button onClick={handleReportClick}>See Full Report</button>
      <button onClick={handleRunGPUFPXClick}>Run GPU-FPX</button>

      {showReport ? 
      <div>
         <DetectorReport formattedDectectorReport={formattedDectectorReport} />
         <h3>Analyzer Results:</h3>
         <p>{AnalyzerReport}</p>
      </div> : ""}
    </div>
  );
};

export { GPU_FPX };