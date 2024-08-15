import React, { useEffect, useState } from 'react';
import * as Contexts from './HerbieContext';
import * as fpcorejs from './lib/fpcore';
import { suggestExpressions } from './lib/herbiejs';
interface LinkToReportsProps {
    expressionId: number;
}

const LinkToReports: React.FC<LinkToReportsProps> = ({ expressionId }) => {
    const [serverUrl] = Contexts.useGlobal(Contexts.ServerContext);
    const [samples,] = Contexts.useGlobal(Contexts.SamplesContext);
    const [selectedSampleId,] = Contexts.useGlobal(Contexts.SelectedSampleIdContext);
    const [expressions, setExpressions] = Contexts.useGlobal(Contexts.ExpressionsContext)
    // get AlternativesJobResponse
    const [alternativesJobResponse, setAlternativesJobResponse] = Contexts.useGlobal(Contexts.AlternativesJobResponseContext);
    // get the path from the alternativesJobResponse using find
    const path = alternativesJobResponse.path;
    console.log("LinkToReports PATH:", path);

    // Get the expression text
    const expressionText = expressions.find(expr => expr.id === expressionId);
    if (expressionText == null) {
        return <div>Expression not found</div>
    }

    // const [link, setLink] = useState<string | null>(null);

    // Get the sample
    const sample = samples.find(sample => sample.id === selectedSampleId);
    if (sample == null) {
        return <div>Sample not found</div>
    }
    // const getLink = async () => {
    //     try {
    //         const response = await suggestExpressions(
    //             fpcorejs.mathjsToFPCore(expressionText.text),
    //             sample,
    //             serverUrl
    //         );
    //         console.log("API response:", response);

    //         // TODO: How to get the path string from response?
    //         // Response is a HerbieAlternativesResponse object
    //         // with:

    //         //     alternatives: FPCore[];
    //         //     histories: HTMLHistory[];
    //         //     splitpoints: ordinal[][];

    //         // HARDCODED for now
    //         const path = '6a63df2da4dd3572ef761705de9f191f803627d9.2.2'
    //         const url = `${serverUrl}/${path}/timeline.html`;
    //         console.log("url:", url);
    //         setLink(url);
            

    //     } catch (err: any) {
    //         console.error('Error: ' + (err.message || err));
    //         setLink(null);
    //     }
    // }
    // useEffect(() => {
    //     getLink();
    // }, []);
    
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