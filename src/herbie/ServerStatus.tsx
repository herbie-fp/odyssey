import React, { useContext, useState, useEffect } from 'react';
import { ServerContext } from './HerbieContext';
import * as HerbieContext from './HerbieContext';
import Modal from 'react-modal';

import './ServerStatus.css';

const timeBetweenChecks = 3000; // Time between checking for the status, in milliseconds

function ServerStatusComponent() {
  // const { serverUrl, setServerUrl } = useContext(ServerContext);
  const [serverUrl, setServerUrl] = HerbieContext.useGlobal(HerbieContext.ServerContext)
  const [fptaylorServerUrl, setFPTaylorServerUrl] = HerbieContext.useGlobal(HerbieContext.FPTaylorServerContext)
  const [fpbenchServerUrl, setFPBenchServerUrl] = HerbieContext.useGlobal(HerbieContext.FPBenchServerContext)
  const [status, setStatus] = useState<number | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [updatedServerUrl, setUpdatedServerUrl] = useState<string>(serverUrl || '');
  const [updatedFPTaylorServerUrl, setUpdatedFPTaylorServerUrl] = useState<string>(fptaylorServerUrl || '');
  const [updatedFPBenchServerUrl, setUpdatedFPBenchServerUrl] = useState<string>(fpbenchServerUrl || '');
  const [jobCount, ] = HerbieContext.useReducerGlobal(HerbieContext.JobCountContext)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${serverUrl}/up`);
        // const response = await fetch(`${serverUrl}/api/analyze`);
        // HACK since /up isn't supported on main yet (CORS)
        // const response = (await fetch('http://127.0.0.1:8000/api/analyze', { method: 'POST', body: JSON.stringify({ formula: '(FPCore (x) (- (sqrt (+ x 1)) (sqrt x)))', sample: [[[
        //   14.97651307489794
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

  const handleFPTaylorIPChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatedFPTaylorServerUrl(event.target.value);
  }

  const handleFPBenchIPChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUpdatedFPBenchServerUrl(event.target.value);
  }

  const customStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)'
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'var(--background-color)'
    },
    };

  // const handleDropdownClick = () => {
  //   setIsDropdownOpen(!isDropdownOpen);
  // };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setServerUrl(updatedServerUrl);
    setIsDropdownOpen(false);
  };

  const handleSubmitFPTaylor = (event: React.FormEvent) => {
    event.preventDefault();
    setFPTaylorServerUrl(updatedFPTaylorServerUrl);
    setIsDropdownOpen(false);
  }

  const handleSubmitFPBench = (event: React.FormEvent) => {
    event.preventDefault();
    setFPBenchServerUrl(updatedFPBenchServerUrl);
    setIsDropdownOpen(false);
  }

  const statusClass = !status ? 'no-server' : jobCount > 0 ? 'pending' : 'connected'
  
  // Show job count if there are jobs pending
  const statusText = jobCount > 0 ? `Jobs: ${jobCount}` : status ? 'Connected' : 'No Server'

  return (
    <div className="serverStatus">
      <div onClick={() => setIsDropdownOpen(true)}>
        <span className={'status ' + statusClass}>
          {/* an SVG status indicator dot */}
          <svg width="10" height="10" viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="5" fill={statusClass === 'pending' ? 'orange' : status ? '#78D965' : 'none'} stroke={status ? '#94E185' : 'red'} filter={
              `drop-shadow(0px 0px 2px ${statusClass === 'connected' ? '#94E185' : statusClass === 'pending' ? 'orange' : 'red'})`}
            />
          </svg>
        </span>
        &nbsp;
      
        {statusText}

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
        ariaHideApp={false}
      >
        
        <form onSubmit={handleSubmit}>
          <label>Herbie Server URL (including port): </label>
          <input type='text' value={updatedServerUrl} onChange={handleIPChange} />
          <button type="submit">Submit</button>
        </form>

        <form onSubmit={handleSubmitFPTaylor}>
          <label>FPTaylor Server URL (including port): </label>
          <input type='text' value={updatedFPTaylorServerUrl} onChange={handleFPTaylorIPChange} />
          <button type="submit">Submit</button>
        </form>

        <form onSubmit={handleSubmitFPBench}>
          <label>FPBench Server URL (including port): </label>
          <input type='text' value={updatedFPBenchServerUrl} onChange={handleFPBenchIPChange} />
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