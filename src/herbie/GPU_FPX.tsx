// External imports (libraries, etc.) will go here
import React, { useState } from 'react';
import * as contexts from './HerbieContext';
import './GPU_FPX.css';
import './ExpressionExport';
import { ExpressionExportResponse } from './lib/herbiejs';
import { FPCoreGetBody, FPCorePreconditionFromRanges, getVarnamesFPCore, getVarnamesMathJS, makeFPCore2, mathjs, mathjsToFPCore } from './lib/fpcore';
import '@coreui/coreui/dist/css/coreui.min.css';
import { CTable } from '@coreui/react'

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
  const [gpuFpxSelected] = contexts.useGlobal(contexts.gpuFpxSelected);
  const [showDetectorReport, setShowDetectorReport] = useState(false);
  const [showAnalyzerReport, setShowAnalyzerReport] = useState(false);
  const [runAnalyzer, setRunAnalyzer] = useState(false);
  //State for results from Analyzer and Detector
  const [analyzerResult, setAnalyzerResult] = useState<string>("");
  const [detectorResult, setDetectorResult] = useState<string>("");

  interface DetectorReportTableProps {
    formattedDetectorReport: string[];
    startResultToDisplay: number;
    endResultToDisplay: number;
  }

  interface analyzerReportTableProps{
    formattedAnalyzerReport: string[];
  }


  /**
   * FPBench and GPU-FPX Fetch Calls
   */
  const handleRunAnalysis = async () => {
        try {
          //convert mathjs to fpcore
        //   const fpCoreExpr = mathjsToFPCore(current_expression?.text as unknown as mathjs);
        //   const fpBenchExpr = makeFPCore2({
        //     vars: getVarnamesFPCore(fpCoreExpr),
        //     pre: "(<= 0 x 10)",
        //     body: FPCoreGetBody(fpCoreExpr) 
        //   });
        //   // console.log("Current Expression format before FpBench:", current_expression);
        //   console.log("Starting FPBench conversion for expression:", fpBenchExpr);
        //   // Convert to CUDA (for now it's c) using FPBench, also the URL is beast Network host
        //   const fpbenchResponse = await fetch('http://155.98.69.61:8002/exec', {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json', 
        //     },
        //     body: JSON.stringify({
        //         formulas: [fpBenchExpr],
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
    setShowAnalyzerReport(!showAnalyzerReport);
    setShowDetectorReport(!showDetectorReport);
    handleRunAnalysis();
};


  /**
   * Report click handler for detector
   */
  const handleShowDetectorReportClick = () => {
    setShowDetectorReport(!showDetectorReport);
  }

  /**
   * Report click handler for analyzer
   */
  const handleShowAnalyzerReportClick = () => {
    setShowAnalyzerReport(!showAnalyzerReport);
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
   * Begin the parsing of the entire analyzer output into individual instruction results
   * @param report 
   * @returns 
   */
  const formatAnalyzerReport = (report: string) => {

    //split on the :0 to isolate the different function results
    let instructionSplit = report.split(":0")
    for (var result of instructionSplit){
      result = result.split(/\r?\n/)[0]
    }
    //delete the header index - text that is removed: 
    // \n\n#GPU-FPX-ANA SHARED REGISTER: After executing the instruction  @ /unknown_path in [kernel_function]
    let parsedInstructionSplit = []
    for (let i = 1; i < instructionSplit.length ;i++){
      parsedInstructionSplit.push(instructionSplit[i])
    }

    //isolate just the instruction info from the report
    let cleanedReport = []
    for(let i = 0; i < parsedInstructionSplit.length;i++){
      cleanedReport.push(parsedInstructionSplit[i].split('#GPU')[0])

    }
    return cleanedReport
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
const formattedDetectorReport = formatDetectorReport(extractDetectorReport(detectorResult));

/**
 *  Creates the JSX element to display results from runnning GPU-FPX on the selected expression
 * @param param0 the formatted detector report to be displayed in the main component
 * @returns the detector report JSX element
 */
const DetectorReport = ({ formattedDetectorReport }: { formattedDetectorReport: string[] }) => (
  <div>
    <h6>Detector Results</h6>
    <p>FP64 Operations</p>
    <div>
      {/* Populate a table with FP64 Operations */}
      <DetectorResultTable formattedDetectorReport={formattedDetectorReport} startResultToDisplay={0} endResultToDisplay={4}></DetectorResultTable>

    </div>
    <p>FP32 Operations</p>
      {/* Populate a table with FP32 Operations */}
      <DetectorResultTable formattedDetectorReport={formattedDetectorReport} startResultToDisplay={4} endResultToDisplay={8}></DetectorResultTable>
    
    <p>Other Stats</p>
    <div> 
      {/* Populate with other stats */}
      <DetectorResultTable formattedDetectorReport={formattedDetectorReport} startResultToDisplay={8} endResultToDisplay={10}></DetectorResultTable>

    </div>
  </div>
);

const DetectorResultTable = ({formattedDetectorReport, startResultToDisplay, endResultToDisplay}:DetectorReportTableProps) => {
  const items = []
  for (let i = startResultToDisplay; i < endResultToDisplay; i++){
    items.push({class: formattedDetectorReport[i],_cellProps: { id: { scope: 'row' }, class: { colSpan: 2 } },})
  }
  return <CTable hover bordered small items={items} />
}
const TableExample = () => {
  const columns = [
    {
      key: 'id',
      label: '#',
      _props: { scope: 'col' },
    },
    {
      key: 'class',
      _props: { scope: 'col' },
    },
    {
      key: 'heading_1',
      label: 'Heading',
      _props: { scope: 'col' },
    },
    {
      key: 'heading_2',
      label: 'Heading',
      _props: { scope: 'col' },
    },
  ]
  const items = [
    {
      id: 1,
      class: 'Mark',
      heading_1: 'Otto',
      heading_2: '@mdo',
      _cellProps: { id: { scope: 'row' } },
    },
    {
      id: 2,
      class: 'Jacob',
      heading_1: 'Thornton',
      heading_2: '@fat',
      _cellProps: { id: { scope: 'row' } },
    },
    {
      id: 3,
      class: 'Larry the Bird',
      heading_2: '@twitter',
      _cellProps: { id: { scope: 'row' }, class: { colSpan: 2 } },
    },
  ]

  return <CTable hover bordered small columns={columns} items={items} />
}

const cleanedAnalyzerReport = formatAnalyzerReport(extractAnalyzerReport(analyzerResult));

const AnalyzerResultTable = ({formattedAnalyzerReport}:analyzerReportTableProps) => {
  const items = []
  for (let i = 0; i < formattedAnalyzerReport.length; i++){
    items.push({class: formattedAnalyzerReport[i],_cellProps: { id: { scope: 'row' }, class: { colSpan: 2 } },})
  }
  return <CTable hover bordered small items={items} />
}
const AnalyzerReport = ({ formattedAnalyzerReport }: analyzerReportTableProps) => (
  <div>
    <h6>Analyzer Results</h6>
    <div>
      {/* Populate a table with FP64 Operations */}
      <AnalyzerResultTable formattedAnalyzerReport={formattedAnalyzerReport}></AnalyzerResultTable>
    </div>
  </div>
);

  return (
    <div>
      {/* <p>Current expression:</p>
      <p>{current_expression?.text}</p>  */}
      {/* <p>The total number of exceptions are: 2</p> */}
      <button onClick={handleRunGPUFPXClick}>Detect & Analyze Expression on GPU's</button>
      <div>
        <button onClick={handleShowDetectorReportClick}>Show/Hide Detector Results</button>
        {showDetectorReport ? <DetectorReport formattedDetectorReport={formattedDetectorReport} /> : ""}
        <button onClick={handleShowAnalyzerReportClick}>Show/Hide Analyzer Results</button>
        {showAnalyzerReport ? <AnalyzerReport formattedAnalyzerReport={cleanedAnalyzerReport} /> : ""}
      </div> 
    </div>
  );
};

export { GPU_FPX };