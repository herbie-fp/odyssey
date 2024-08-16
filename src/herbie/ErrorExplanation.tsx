import React from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
<<<<<<< Updated upstream
=======
import { Sample } from './HerbieTypes';
import * as HerbieContext from './HerbieContext';
import * as types from './HerbieTypes';
import { analyzeErrorExpression, ErrorExpressionResponse } from './lib/herbiejs';
import Mermaid from './LocalError/Mermaid';
import { localErrorTreeAsMermaidGraph } from './LocalError/LocalError';
>>>>>>> Stashed changes

interface ErrorExplanationProps {
    expressionId: number;
}

<<<<<<< Updated upstream
const ErrorExplanation: React.FC<ErrorExplanationProps> = (props) => {

    const supportedLanguages = ["python", "c", "fortran", "java", "julia", "matlab", "wls", "tex", "js"];
=======
function ErrorExplanation({ expressionId }: { expressionId: number }) {
    // Export the expression to a language of the user's choice
    const [expressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
    const [selectedPoint] = Contexts.useGlobal(Contexts.SelectedPointContext);
    const [serverUrl] = Contexts.useGlobal(Contexts.ServerContext);
    const [spec] = Contexts.useGlobal(Contexts.SpecContext);
>>>>>>> Stashed changes
    
    // Export the expression to a language of the user's choice
    // (e.g. Python, C, etc.)
    const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext);

    // Get the expression text
    const expressionText = expressions[expressionId].text;

<<<<<<< Updated upstream
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
=======
    const [errorResponse, setErrorResponse] = React.useState<ErrorExpressionResponse | null>(null);
    const [selectedPointsLocalError, ] = HerbieContext.useGlobal(HerbieContext.SelectedPointsLocalErrorContext);
    const [averageLocalErrors,] = HerbieContext.useGlobal(HerbieContext.AverageLocalErrorsContext);
    const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext);
    
    const pointLocalError = selectedPointsLocalError.find(a => a.expressionId === expressionId)?.error
    // get the local error
    const localError =
    selectedPoint && pointLocalError
    ? pointLocalError
    : averageLocalErrors.find((localError) => localError.sampleId === selectedSampleId && localError.expressionId === expressionId)?.errorTree

    if (!localError) {
        return (
          <div className="local-error not-computed">
            <div>Please select a point on the error plot to compute local error.</div>
          </div>
        )
      }
    const translateExpression = async () => {
        
        if (selectedPoint) {
            
            const vars = fpcorejs.getVarnamesMathJS(expressionText);
            const specVars = fpcorejs.getVarnamesMathJS(spec.expression);
            const modSelectedPoint = selectedPoint.filter((xi, i) => vars.includes(specVars[i]));
            
            // Make server call to get translation when user submits
            try {
                const host = serverUrl;
                const response = await analyzeErrorExpression(
                    fpcorejs.mathjsToFPCore(expressionText),
                    { points: [[modSelectedPoint, 1e308]] } as Sample,
                    host
                );
                setErrorResponse(response);
                
            } catch (error) {
                console.error('Error:', error);
            }
        }
    };

    useEffect(() => {
        translateExpression();
    }, [expressionText, selectedPoint]);

    return (<div>
        {/* Display the export code */}
        {errorResponse && errorResponse.explanation.length >0 ? (
            <div>
                <p>Operator: {errorResponse.explanation[0][0]}</p>
                <p>Expression: {errorResponse.explanation[0][1]}</p>
                <p>Type: {errorResponse.explanation[0][2]}</p>
                <p>Occurrences: {errorResponse.explanation[0][3]}</p>
                <p>Errors: {errorResponse.explanation[0][4]}</p>
                <pre>Details: {JSON.stringify(errorResponse.explanation[0][5], null, 2)}</pre>
            </div>
        ) : (
            <p>No explanation available.</p>
        )}
        <div className="local-error-graph">
        <Mermaid chart={localErrorTreeAsMermaidGraph(localError, 64)}  />
      </div>
    </div>
>>>>>>> Stashed changes
    );
};

export default ErrorExplanation;