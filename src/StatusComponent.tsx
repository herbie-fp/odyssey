import React, { useContext, useState, useEffect } from 'react';

function ServerStatusComponent() {
    const [status, setStatus] = useState<number | null>(null);

    useEffect(() => {
        // Fetch the status
        const fetchStatus = async () => {
            const response = await fetch('http://127.0.0.1:8000/up');
            setStatus(response.status);
        };

        fetchStatus();
    }, []);

    return (
        <div>
            {status ? (
                <div>
                    <h2>Server Response:</h2>
                    <p>{JSON.stringify(status)}</p>
                </div>
            ) : (
                <p>Loading server status...</p>
            )}
        </div>
    );
};

export { ServerStatusComponent };