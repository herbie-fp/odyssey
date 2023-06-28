import React, { useState, useEffect } from 'react';

const timeBetweenChecks = 3000; // Time between checking for the status, in milliseconds

function ServerStatusComponent() {
    const [status, setStatus] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [inputIP, setInputIP] = useState<string>('127.0.0.1:8000');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(`http://${inputIP}/up`);
                setStatus(response.status);
            } catch (error) {
                setStatus(null);
            }
        };

        fetchStatus();
        const intervalId = setInterval(fetchStatus, timeBetweenChecks);
        return () => clearInterval(intervalId);
    }, [inputIP]);

    const handleIPChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setInputIP(event.target.value);
    };

    const handleDropdownClick = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    return (
        <div>
            {status ? <p>Connected</p> : <p>No Server</p>}
            <button onClick={handleDropdownClick}>
                {isDropdownOpen ? '▲' : '▼'}
            </button>
            {isDropdownOpen && (
                <div>
                    <input type="text" value={inputIP} onChange={handleIPChange} />
                </div>
            )}
        </div>
    );
}

export { ServerStatusComponent };