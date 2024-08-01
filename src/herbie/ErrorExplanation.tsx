import React, { useEffect} from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
import { Sample } from './HerbieTypes';
import { analyzeErrorExpression, ErrorExpressionResponse } from './lib/herbiejs';

interface ErrorExplanationProps {
    expressionId: number;
}

const ErrorExplanation: React.FC<ErrorExplanationProps> = (props) => {
    // Export the expression to a language of the user's choice
    const [expressions] = Contexts.useGlobal(Contexts.ExpressionsContext);
    const [selectedPoint] = Contexts.useGlobal(Contexts.SelectedPointContext);
    const [serverUrl] = Contexts.useGlobal(Contexts.ServerContext);
    const [spec] = Contexts.useGlobal(Contexts.SpecContext);
    
    // Get the expression text
    const expressionText = expressions[props.expressionId].text;

    const [errorResponse, setErrorResponse] = React.useState<ErrorExpressionResponse | null>(null);

    const translateExpression = async () => {
        
        if (selectedPoint) {
            
            const vars = fpcorejs.getVarnamesMathJS(expressionText);
            const specVars = fpcorejs.getVarnamesMathJS(spec.expression);
            const modSelectedPoint = selectedPoint.filter((xi, i) => vars.includes(specVars[i]));
            
            // Make server call to get translation when user submits
            try {
                const host = "http://localhost:8000";
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

    </div>
    );
};

export default ErrorExplanation;
