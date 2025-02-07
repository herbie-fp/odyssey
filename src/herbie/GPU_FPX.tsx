// External imports (libraries, etc.) will go here
import React, { useState } from 'react';
import * as contexts from './HerbieContext';
import './GPU_FPX.css';
import './ExpressionExport';
import { ExpressionExportResponse } from './lib/herbiejs';
import { mathjs, mathjsToFPCore } from './lib/fpcore';

const GPU_FPX = ({ expressionId }: { expressionId: number }) => {
  //Get expressions
  const [expressions, ] = contexts.useGlobal(contexts.ExpressionsContext);
  const current_expression = expressions.find(expression => expression.id === expressionId);
  const [exportCode, setExportCode] = useState<ExpressionExportResponse | null>(null);
  const [gpuFpxSelected] = contexts.useGlobal(contexts.gpuFpxSelected);

  const [showReport, setShowReport] = useState(false);
  const [runAnalyzer, setRunAnalyzer] = useState(false);

  /* ---------------------------------------------------  */

  //State for results from Analyzer and Detector
  const [analyzerResult, setAnalyzerResult] = useState<string>("");
  const [detectorResult, setDetectorResult] = useState<string>("");

  // State for loading/error handling
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  

  /****************************************************************/ 

//   // Extract the expression from FPBench's CUDA (for now it's C) output
//   const extractExpression = (cudaExpression: string): string => {
//     // Look for the return statements
//     const returnMatch = cudaExpression.match(/return\s+(.*?);/);
//     if (returnMatch && returnMatch[1]) {
//         return returnMatch[1].trim();
//     }
//     throw new Error("Could not parse CUDA function body");
// };

  const handleRunAnalysis = async () => {
        try {
        //   // First get current FPCore expression
        //   const fpCoreExpr = mathjsToFPCore(current_expression as unknown as mathjs);
        //   console.log("Starting FPBench conversion for expression:", fpCoreExpr);
        //   // Convert to CUDA (for now it's c) using FPBench, also the URL is beast Network host
        //   const fpbenchResponse = await fetch('https://herbie.uwplse.org/fpbench/exec', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json', 
        //     },
        //     body: JSON.stringify({
        //         formulas: [fpCoreExpr],
        //         // Specify CUDA as target language
        //         language: 'c'
        //     })
        // });

        // const fpbenchResult = await fpbenchResponse.json();
        // console.log("Raw FPBench result:", fpbenchResult);
        // //Extract just the expression from the function body
        // const functionMatch = fpbenchResult.stdout.match(/return\s+(.*?);/);
        // const cudaExpr = functionMatch ? functionMatch[1].trim() : fpbenchResult.stdout;
        // console.log("Extracted CUDA expression:", cudaExpr);
        const cudaExpr = "pow(e, sin((pow((x + 1.0), 2.0) - 3.0))) / log(x)";
        
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
            setDetectorResult(detectorData.stdout);

        } catch (error) {
            console.error('Error running GPU-FPX:', error);
            // Handle error appropriately
        }
    };
    

  // Button to trigger analysis
  const handleRunAnalyzerClick = () => {
    setRunAnalyzer(!runAnalyzer);
    handleRunAnalysis();
};

  const handleReportClick = () => {
    setShowReport(!showReport);
  }

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

  const extractDetectorReport = (log: string): string => {
    const startMarker = "------------ GPU-FPX Report -----------";
    const endMarker = "The total number of exceptions are:";
    const start = log.indexOf(startMarker);
    const endLineStart = log.indexOf(endMarker);
    const endLine = log.slice(endLineStart).split('\n')[0];
    
    return log.slice(start, endLineStart + endLine.length);
};

const extractAnalyzerReport = (log: string): string => {
  const startMarker = "#GPU-FPX-ANA SHARED REGISTER:";
  const endMarker = "This completes the analyzer report.";
  const start = log.indexOf(startMarker);
  const endLineStart = log.indexOf(endMarker);  
  return log.slice(start, endLineStart);
};

const formattedDectectorReport = formatDetectorReport(extractDetectorReport(detectorResult));

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
      <p>The total number of exceptions are: 2</p>
      <button onClick={handleReportClick}>See Full Report</button>
      <button onClick={handleRunAnalyzerClick}>Run GPU-FPX</button>
      
      {/* <p>Should run cuda translate and send to GPU-FPX Server?</p>
      <p>
        {gpuFpxSelected ? "yes" : "no"}
      </p> */}    

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