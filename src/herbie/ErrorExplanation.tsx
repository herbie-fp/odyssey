import React from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';

interface ErrorExplanationProps {
    expressionId: number;
}

const ErrorExplanation: React.FC<ErrorExplanationProps> = (props) => {

    const supportedLanguages = ["python", "c", "fortran", "java", "julia", "matlab", "wls", "tex", "js"];
    
    // Export the expression to a language of the user's choice
    // (e.g. Python, C, etc.)
    const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);

    // Get the expression text
    const expressionText = expressions[props.expressionId].text;

    // Get user choice
    const [language, setLanguage] = React.useState(supportedLanguages[0]);

    const [exportCode, setExportCode] = React.useState("");

    // Make server call to get translation when user submits
    const callTranslate = () => {
        fetch('http://127.0.0.1:8000/api/translate', {
            method: 'POST',
            body: JSON.stringify({
                formula: fpcorejs.mathjsToFPCore(expressionText),
                language: language
            })
        })
        .then(response => response.json())
        .then(data => {
            setExportCode(data.result);
        })
        .catch(error => {
            console.error('Error:', error);
        });
    }
    React.useEffect(callTranslate, [expressionText, language])

    return (
        <div>
            {/* Choose language */}
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {supportedLanguages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                ))}
            </select>

            {/* Display the export code */}
            <pre>{exportCode}</pre>

            {/* Export button */}
        
        </div>
    );
};

export default ErrorExplanation;