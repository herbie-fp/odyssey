// External imports (libraries, etc.) will go here
import React, { useState } from 'react';
import * as contexts from './HerbieContext';
import './GPU_FPX.css';
import './ExpressionExport';
import { ExpressionExportResponse } from './lib/herbiejs';

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

  // Extract the expression from FPBench's CUDA (for now it's C) output
  const extractExpression = (cudaExpression: string): string => {
    // Look for the return statements
    const returnMatch = cudaExpression.match(/return\s+(.*?);/);
    if (returnMatch && returnMatch[1]) {
        return returnMatch[1].trim();
    }
    throw new Error("Could not parse CUDA function body");
};

  const handleRunAnalysis = async () => {
        try {
        //   // First get current FPCore expression
        //   const fpCoreExpr = current_expression;

        //   // Convert to CUDA (for now it's c) using FPBench, also the URL is beast Network host
        //   const fpbenchResponse = await fetch('http://155.98.69.61:8888/exec', {
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
        // // Extract just the expression from the function body
        // const cudaExpr = extractExpression(fpbenchResult.stdout);

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
  
        
  /****************************************************************/ 


  const handleReportClick = () => {
    setShowReport(!showReport);
  }

  const formatReport = (report: string) => {
    // Split on newlines and filter out empty lines and headers
    return report.split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => 
        line && 
        !line.includes('GPU-FPX Report') &&
        !line.startsWith('---')
      )
  }

//   const report = `------------ GPU-FPX Report -----------

// --- FP64 Operations ---
// Total NaN found:              0
// Total INF found:              0
// Total underflow (subnormal):  0
// Total Division by 0:          0
// --- FP32 Operations ---
// Total NaN found:              1
// Total INF found:              0
// Total underflow (subnormal):  0
// Total Division by 0:          1
// --- Other Stats ---
// Kernels:      1
// The total number of exceptions are: 2`;


const formattedReport = formatReport(analyzerResult);

const FullReport = ({ formattedReport }: { formattedReport: string[] }) => (
  <div>
    <h3>Full Report</h3>
    <h4>FP64 Operations</h4>
    <p>
      {formattedReport[0]}<br />
      {formattedReport[1]}<br />
      {formattedReport[2]}<br />
      {formattedReport[3]}<br />
    </p>
    <h4>FP32 Operations</h4>
    <p>
      {formattedReport[4]}<br />
      {formattedReport[5]}<br />
      {formattedReport[6]}<br />
      {formattedReport[7]}<br />
    </p>
    <h4>Other Stats</h4>
    <p>
      {formattedReport[8]}<br />
      {formattedReport[9]}<br />
    </p>
  </div>
);


  return (
    <div>
      <p>Current expression:</p>
      <p>{current_expression?.text}</p> 
      <p>The total number of exceptions are: 2</p>
      <button onClick={handleReportClick}>See Full Report</button>
      <button onClick={handleRunAnalyzerClick}>Run Analyzer</button>
      
      {/* <p>Should run cuda translate and send to GPU-FPX Server?</p>
      <p>
        {gpuFpxSelected ? "yes" : "no"}
      </p> */}    

      {showReport ? <FullReport formattedReport={formattedReport} /> : ""}
      {runAnalyzer ? /* Should also actually run the expression through the GPU-FPX Analyzer */<p>"Running analyzer on expression...</p> : ""}
    </div>
  );
};

export { GPU_FPX };