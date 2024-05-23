import React from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';

interface ExpressionExportProps {
    expressionId: number;
}

const ExpressionExport: React.FC<ExpressionExportProps> = (props) => {
    // Export the expression to a language of the user's choice
    // (e.g. Python, C, etc.)
    const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);

    // Get the expression text
    const expressionText = expressions[props.expressionId].text;

    // Get user choice
    const [language, setLanguage] = React.useState("python");

    const [exportCode, setExportCode] = React.useState("");

    // Make server call to get translation when user submits

    /*Example call:
    
    let translatedExpression = (await (await fetch('http://127.0.0.1:8000/api/translate', { method: 'POST', body: JSON.stringify({ formula: '(FPCore (x) (- (sqrt (+ x 1)) (sqrt x)))', lang: "asdf" }) })).json())
    */
    console.log(expressionText, language)
    console.log(fpcorejs.mathjsToFPCore(expressionText))
    console.log("Before fetch")
    const callTranslate = () => {
        fetch('http://127.0.0.1:8000/api/translate', {
            method: 'POST',
            body: JSON.stringify({
                formula: fpcorejs.mathjsToFPCore(expressionText),
                lang: language
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
    setTimeout(callTranslate, 300)
    // React.useEffect(() => {
    //     // Make server call to get translation
    //     fetch("http://127.0.0.1:8000/api/translate", {
    //         method: "POST",
    //         headers: {
    //             "Content-Type": "application/json",
    //         },
    //         body: JSON.stringify({
    //             expression: expressionText,
    //             language: language,
    //         }),
    //     })
    //         .then((response) => response.json())
    //         .then((data) => {
    //             setExportCode(data.code);
    //         })
    //         .catch((error) => {
    //             console.error("Error:", error);
    //         });
    // }, [expressionText, language]);
    

    return (
        <div>
            {/* Choose language */}
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="python">Python</option>
                <option value="c">C</option>
                <option value="java">Java</option>
            </select>

            {/* Display the export code */}
            <pre>{exportCode}</pre>

            {/* Export button */}
            

        </div>
    );
};

export default ExpressionExport;