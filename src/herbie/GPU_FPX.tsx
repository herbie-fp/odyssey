import * as contexts from './HerbieContext';
import React, { useState } from 'react';
import  './GPU_FPX.css';
import { time } from 'console';

/**
 * The GPU-FPX integration component, makes fetch calls to FPBench to convert FPCore expressions to CUDA from the expression table,
 * then sends those CUDA expressions to GPU-FPX, runs GPU-FPX, and then outputs it's results in this component 
 * @param param0 the current expression ID to run the component with
 * @returns the GPU-FPX component
 */
const GPU_FPX = ({ expressionId }: {expressionId: number }) => {

    const [expressions, ] = contexts.useGlobal(contexts.ExpressionsContext);
    const [infoFlag, setInfoFlag] = React.useState(false);
    const [exceptionFlag, setExceptionFlag] = React.useState(false);

    const [exceptionStatusMessage, setExceptionStatusMessage] = useState<string>("Unchecked expression");
    const [exceptionStatusColor, setExceptionStatusColor] = useState<string>("orange");
    // const [runButtonState, setRunButtonState] = React.useState(true);
    // let exceptionFlag = false
    let runButtonState = true

    // Get the expression text to send to GPU-FPX
    const expressionText = expressions.find(expr => expr.id === expressionId);


    //TODO : will need to change this to be asyc based on GPU-FPX results using useEffect 
    function exceptionStatusHandler(){
        if(exceptionFlag){
            setExceptionStatusMessage("Exception found")
            setExceptionStatusColor('red')
        }
        else{
        setExceptionStatusMessage("No exception found")
        setExceptionStatusColor('#8ff51b')
        }
    }

    function handleRunClick(){
        runButtonState = !runButtonState
        runGPUFPX();
    }
    
    function runGPUFPX(){
        setExceptionFlag(!exceptionFlag)
        if(exceptionFlag){
            setInfoFlag(!infoFlag)
        }
        exceptionStatusHandler();
    }

    const viewMoreInfoClick = () => {
        
    }
    

        return (
        <div className='gpu-fpx'>
            {/* <p className='p-item'>Click "Run Check" to see if there are floating point exceptions with this expression when run on an Nvidia GPU.</p> */}

            
             <div className="status">
                <svg width="10" height="10" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="7" fill={exceptionStatusColor}/>
                </svg>
                {exceptionStatusMessage === "Unchecked expression"?
                <p className='p-item'>{exceptionStatusMessage}</p>
                : ""}
                {exceptionStatusMessage === "Exception found"?
                <p className='p-item-exception-found'>{exceptionStatusMessage}</p>
                : ""}
                {exceptionStatusMessage === "No exception found"?
                <p className='p-item-exception-not-found'>{exceptionStatusMessage}</p>
                : ""}
                {infoFlag ?
                <div>
                    <button className="more-info-button" onClick={viewMoreInfoClick}>More Info</button>
                </div>
                : ""}
                <button className={runButtonState ?
                   "run-button" : "disabled-run-button"}  onClick={handleRunClick}>Run Check</button>
             </div> 
            
        </div>
        );    
    };

export { GPU_FPX };