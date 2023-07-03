import React, { useContext, useState, useEffect } from 'react';
import { InputRange, InputRangesEditor } from './InputRangesEditor';
import { ExpressionsContext, ServerContext, SpecContext } from './HerbieContext';

import './ServerStatus.css';

const timeBetweenChecks = 3000; // Time between checking for the status, in milliseconds

function ServerStatusComponent() {
    const { serverUrl: value, setServerUrl: setValue } = useContext(ServerContext);
    const [serverUrl, setServerUrl] = useState<string>('http://127.0.0.1:8000');

    const [status, setStatus] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // const response = await fetch(`${serverUrl}/api/analyze`);
                // HACK since /up isn't supported on main yet (CORS)
                const response = (await fetch('http://127.0.0.1:8000/api/analyze', { method: 'POST', body: JSON.stringify({ formula: '(FPCore (x) (- (sqrt (+ x 1)) (sqrt x)))', sample: [[[
                    14.97651307489794
                  ], 0.12711304680349078]] }) }))
                setStatus(response.status);
            } catch (error) {
                setStatus(null);
            }
        };

        fetchStatus();
        const intervalId = setInterval(fetchStatus, timeBetweenChecks);
        return () => clearInterval(intervalId);
    }, [serverUrl]);

    const handleIPChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setServerUrl(event.target.value);
    };

    const handleDropdownClick = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    return (
        <div className="serverStatus">
            <div className={status ? 'connected' : 'no-server'}>
                {status ? 'Connected' : 'No Server'}
            </div>
            <div>
                <button onClick={handleDropdownClick}>
                    {isDropdownOpen ? '▲' : '▼'}
                </button>
            </div>
            
            {isDropdownOpen && (
                <div>
                    <input type='text' value={serverUrl} onChange={handleIPChange} />
                </div>
            )}
        </div>
    );
}

export { ServerStatusComponent };