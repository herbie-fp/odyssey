import React from 'react';
import * as HerbieContext from './HerbieContext';

interface LinkToReportsProps {
    expressionId: number;
}

const LinkToReports: React.FC<LinkToReportsProps> = ({ expressionId }) => {
    const [serverUrl] = HerbieContext.useGlobal(HerbieContext.ServerContext);
    const [samples,] = HerbieContext.useGlobal(HerbieContext.SamplesContext);
    const [selectedSampleId,] = HerbieContext.useGlobal(HerbieContext.SelectedSampleIdContext);
    const [expressions, ] = HerbieContext.useGlobal(HerbieContext.ExpressionsContext)
    const [alternativesJobResponse, ] = HerbieContext.useGlobal(HerbieContext.AlternativesJobResponseContext);
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