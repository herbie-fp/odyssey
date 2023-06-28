import React, { useState, useEffect } from 'react';

const timeBetweenChecks = 3000; // Time between checking for the status, in milliseconds

function ServerStatusComponent() {
    const [status, setStatus] = useState<number | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch('http://127.0.0.1:8000/up');
                setStatus(response.status);
            } catch (error) {
                setStatus(null);
            }
        };

        fetchStatus();
        const intervalId = setInterval(fetchStatus, timeBetweenChecks);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div>
            {status ? (
                <div>
                    <p>Connected</p>
                </div>
            ) : (
                <p>No Server</p>
            )}
        </div>
    );
}

export { ServerStatusComponent };