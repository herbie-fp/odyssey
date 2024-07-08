import React from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
import { analyzeExpressionExport } from './lib/herbiejs';


interface ExpressionExportProps {
    expressionId: number;
}

const ExpressionExport: React.FC<ExpressionExportProps> = (props) => {

    const supportedLanguages = ["python", "c", "fortran", "java", "julia", "matlab", "wls", "tex", "js"];
    
    // Export the expression to a language of the user's choice
    // (e.g. Python, C, etc.)
    const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
    const [serverUrl, ] = Contexts.useGlobal(Contexts.ServerContext)
    // Get the expression text
    const expressionText = expressions[props.expressionId].text;

    // Get user choice
    const [language, setLanguage] = React.useState(supportedLanguages[0]);

    const [exportCode, setExportCode] = React.useState("");

     // Make server call to get translation when user submits
     const translateExpression = async () => {
        try {
            const host = serverUrl;
            const response = await analyzeExpressionExport(fpcorejs.mathjsToFPCore(expressionText), language, host);
            
            setExportCode(response);
        } catch (error) {
            console.error('Error:', error);
        }
    };


    return (
        <div>
            {/* Choose language */}
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                ))}
            </select>

            {/* Display the export code */}
            <pre>Hi {exportCode}</pre>

            {/* Export button */}
            <button onClick={translateExpression}>Submit</button>
        </div>
    );
};

export default ExpressionExport;