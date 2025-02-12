import React from 'react';
import * as Contexts from './HerbieContext';

interface LinkToReportsProps {
    expressionId: number;
}

const LinkToReports: React.FC<LinkToReportsProps> = ({ expressionId }) => {
    const [serverUrl] = Contexts.useGlobal(Contexts.ServerContext);
    const [samples,] = Contexts.useGlobal(Contexts.SamplesContext);
    const [selectedSampleId,] = Contexts.useGlobal(Contexts.SelectedSampleIdContext);
    const [expressions, ] = Contexts.useGlobal(Contexts.ExpressionsContext)
    const [alternativesJobResponse, ] = Contexts.useGlobal(Contexts.AlternativesJobResponseContext);
    // get the path from the alternativesJobResponse using find
    const path = alternativesJobResponse.path;

    // Get the expression text
    const expressionText = expressions.find(expr => expr.id === expressionId);
    if (expressionText === null) {
        return <div>Expression not found</div>
    }

    // Get the sample
    const sample = samples.find(sample => sample.id === selectedSampleId);
    if (sample === null) {
        return <div>Sample not found</div>
    }
    
    // Get link
    const url = `${serverUrl}/${path}/timeline.html`;

    // Display the url 
    return (
        <div>
            {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer">
                    View Reports
                </a>
            ) : (
                <div>Loading...</div>
            )}
        </div>
    );
};

export default LinkToReports;