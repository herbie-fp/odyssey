import React, { useState } from 'react';
import * as HerbieContext from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
import { analyzeExpressionExport, ExpressionExportResponse } from './lib/herbiejs';

interface ExpressionExportProps {
    expressionId: number;
}

const ExpressionExport: React.FC<ExpressionExportProps> = (expressionId) => {
    const supportedLanguages = ["fpcore", "python", "c", "fortran", "java", "julia", "matlab", "wls", "tex", "js", "cuda"];

    // Export the expression to a language of the user's choice
    const [expressions] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext);
    const [serverUrl] = HerbieContext.useGlobal(HerbieContext.ServerContext);

    // Get the expression text
    const expressionText = expressions.find(expr => expr.id === expressionId.expressionId);
    if (expressionText === undefined) {
        return <div>Expression not found</div>
    }
    // Get user choice
    const [language, setLanguage] = useState(supportedLanguages[0]);
    const [exportCode, setExportCode] = useState<ExpressionExportResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const gpuFpxSelected = Contexts.useGlobal(Contexts.gpuFpxSelected);

    // Make server call to get translation when user submits
    const translateExpression = async () => {
        try {
            const response = await analyzeExpressionExport(
                fpcorejs.mathjsToFPCore(expressionText?.text),
                language,
                serverUrl
            );
            if (language === "tex") {
                const numVars = fpcorejs.getVarnamesMathJS(expressionText.text).length;
                const pre = response.result.split('=')[0];
                setExportCode({language: response.language, 
                    result:  response.result.slice(pre.length + 1)});
            } else {
                setExportCode(response);
            }
            setError(null);
        } catch (err: any) {
            setError('Error: ' + (err.message || err));
            setExportCode(null);
        }
    };
    // Update the expressionText
    React.useEffect(() => {
        if (language !== "fpcore") {
            translateExpression();
        } else {
            // convert text to fpcore
            const fpcore = fpcorejs.mathjsToFPCore(expressionText?.text);
            setExportCode({ language: "fpcore", result: fpcore });
        }
    }, [expressionText, language]);

    return (
        <div>
            {/* Choose language */}
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                ))}
            </select>

            {/* Display the export code or error message */}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {exportCode ? (
                <pre>{`Language: ${exportCode.language}\n${exportCode.result}`}</pre>
            ) : (
                <p>No export code available.</p>
            )}
        </div>
    );
};

export default ExpressionExport;
