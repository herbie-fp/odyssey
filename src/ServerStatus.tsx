import React, { useContext, useState, useEffect } from 'react';
import { ServerContext } from './HerbieContext';
import * as HerbieContext from './HerbieContext';
import Modal from 'react-modal';

import './ServerStatus.css';

const timeBetweenChecks = 3000; // Time between checking for the status, in milliseconds

function ServerStatusComponent() {
    // const { serverUrl, setServerUrl } = useContext(ServerContext);
    const [serverUrl, setServerUrl] = HerbieContext.useGlobal(HerbieContext.ServerContext)
    const [status, setStatus] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
    const [updatedServerUrl, setUpdatedServerUrl] = useState<string>(serverUrl || '');

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(`${serverUrl}/up`);
                // const response = await fetch(`${serverUrl}/api/analyze`);
                // HACK since /up isn't supported on main yet (CORS)
                // const response = (await fetch('http://127.0.0.1:8000/api/analyze', { method: 'POST', body: JSON.stringify({ formula: '(FPCore (x) (- (sqrt (+ x 1)) (sqrt x)))', sample: [[[
                //     14.97651307489794
                //   ], 0.12711304680349078]] }) }))
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
    const customStyles = {
        content: {
          top: '50%',
          left: '50%',
          right: 'auto',
          bottom: 'auto',
          marginRight: '-50%',
          transform: 'translate(-50%, -50%)',
        },
      };

    // const handleDropdownClick = () => {
    //     setIsDropdownOpen(!isDropdownOpen);
    // };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setServerUrl(updatedServerUrl);
        setIsDropdownOpen(false);
    };

    return (
        <div className="serverStatus">
            <div onClick={() => setIsDropdownOpen(true)}>
                <span className={'status ' + (status ? 'connected' : 'no-server')}>
                    {/* an SVG status indicator dot */}
                    <svg width="10" height="10" viewBox="0 0 20 20">
                        <circle cx="10" cy="10" r="5" fill={status ? '#78D965' : 'none'} stroke={status ? '#94E185' : 'red'} filter={
                            `drop-shadow(0px 0px 2px ${status ? '#94E185' : 'red'})`}
                        />
                    </svg>
                </span>
                &nbsp;
            
                {status ? 'Connected' : 'No Server'}

                {/* an SVG dropdown chevron */}
                {/* <svg className="dropdown-chevron" width="10" height="10" viewBox="0 0 20 20">
                    <path d="M 0,5 10,15 20,5" fill="none" stroke="black" />
                </svg> */}

                {/* <div className="arrow-container">
                    <div className="dropdown-arrow">
                        {isDropdownOpen ? '▲' : '▼'}
                    </div>
                </div> */}
            </div>
            
            <Modal 
                isOpen={isDropdownOpen}
                onRequestClose={() => setIsDropdownOpen(false)}
                contentLabel="Minimal Modal Example"
                style={customStyles}
            >
                
                <form onSubmit={handleSubmit}>
                    <label>Server URL (including port): </label>
                    <input type='text' value={updatedServerUrl} onChange={handleIPChange} />
                    <button type="submit">Submit</button>
                </form>
                {/* <button onClick={this.handleCloseModal}>Close Modal</button> */}
            </Modal>
            {/* {isDropdownOpen && (
                <div className="server-config">
                    <form onSubmit={handleSubmit}>
                        <input type='text' value={updatedServerUrl} onChange={handleIPChange} />
                        <button type="submit">Submit</button>
                    </form>
                </div>
            )} */}
        </div>
    );
}

export { ServerStatusComponent };