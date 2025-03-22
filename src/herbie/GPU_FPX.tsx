import * as contexts from './HerbieContext';
import React, { useState } from 'react';
import  './GPU_FPX.css';

/**
 * The GPU-FPX integration component, makes fetch calls to FPBench to convert FPCore expressions to CUDA from the expression table,
 * then sends those CUDA expressions to GPU-FPX, runs GPU-FPX, and then outputs it's results in this component 
 * @param param0 the current expression ID to run the component with
 * @returns the GPU-FPX component
 */
const GPU_FPX = ({ expressionId }: {expressionId: number }) => {

    const [expressions, ] = contexts.useGlobal(contexts.ExpressionsContext);
    const [exceptionFlag, setExeptionFlag] = React.useState(false);
    
    // Get the expression text to send to GPU-FPX
    const expressionText = expressions.find(expr => expr.id === expressionId);


        return (
        <div className='gpu-fpx'>
            <p className='p-item'>Click "Run Check" to see if there are floating point exceptions with this expression when run on an Nvidia GPU.</p>

            <button>Run Check</button>
            
            {!exceptionFlag ?
             <div className="status">
                <svg width="10" height="10" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="7" fill={'#8ff51b'}/>
                </svg>
                <p>No exceptions found</p>
             </div>   
            : ""}
            
        </div>
        );    
    };

export { GPU_FPX };