import React, { useContext, useState, useEffect } from 'react';
import { ServerContext } from './HerbieContext';

import './ServerStatus.css';

const timeBetweenChecks = 3000; // Time between checking for the status, in milliseconds

function ServerStatusComponent() {
    const { serverUrl, setServerUrl } = useContext(ServerContext);
    const [status, setStatus] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [updatedServerUrl, setUpdatedServerUrl] = useState<string>(serverUrl || '');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // const response = await fetch(`${serverUrl}/up`);
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
        setUpdatedServerUrl(event.target.value);
    };

    const handleDropdownClick = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setServerUrl(updatedServerUrl);
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
                    <form onSubmit={handleSubmit}>
                        <input type='text' value={updatedServerUrl} onChange={handleIPChange} />
                        <button type="submit">Submit</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export { ServerStatusComponent };