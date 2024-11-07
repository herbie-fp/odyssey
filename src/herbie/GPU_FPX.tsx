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

  const handleReportClick = () => {
    setShowReport(!showReport);
  }

  const handleRunAnalyzerClick = () => {
    setRunAnalyzer(!runAnalyzer);
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

  const report = `------------ GPU-FPX Report -----------

--- FP64 Operations ---
Total NaN found:              0
Total INF found:              0
Total underflow (subnormal):  0
Total Division by 0:          0
--- FP32 Operations ---
Total NaN found:              1
Total INF found:              0
Total underflow (subnormal):  0
Total Division by 0:          1
--- Other Stats ---
Kernels:      1
The total number of exceptions are: 2`;

const formattedReport = formatReport(report);

  return (
    <div>
      {/* <p>Current expression:</p>
      <p>{current_expression?.text}</p> */}
      <p>The total number of exceptions are: 2</p>
      <button onClick={handleReportClick}>See Full Report</button>
      <button onClick={handleRunAnalyzerClick}>Run Analyzer</button>
      {/* <p>Should run cuda translate and send to GPU-FPX Server?</p>
      <p>
        {gpuFpxSelected ? "yes" : "no"}
      </p> */}
      {showReport ? 
          /* Should actually retrieve the stored GPU-FPX report and display it */
        <div>
          <h2> Full Report </h2>
          <h3>--- FP64 Operations ---</h3>
          <p>{formattedReport[0]}<br />
             {formattedReport[1]}<br />
             {formattedReport[2]}<br />
             {formattedReport[3]}<br />
          </p>
          <h3>--- FP32 Operations ---</h3>
          <p>{formattedReport[4]}<br />
             {formattedReport[5]}<br />
             {formattedReport[6]}<br />
             {formattedReport[7]}<br />
          </p>
          <h3>--- Other Stats ---</h3>
          <p>{formattedReport[8]}<br />
             {formattedReport[9]}<br />
          </p>
        </div> : ""}

        {runAnalyzer ? /* Should also actually run the expression through the GPU-FPX Analyzer */<p>"Running analyzer on expression...</p> : ""}
    </div>
  );
};

export { GPU_FPX };