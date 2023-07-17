import React, { useState } from 'react';

import './ResampleComponent.css';


import './SpecComponent.css';

const ResampleComponent = () => {
  const [isResampleOpen, setIsResampleOpen] = useState(false);

  const openResample = () => {
    setIsResampleOpen(true);
  };

  const closeResample = () => {
    setIsResampleOpen(false);
  };

  return (
    <div>
      <button onClick={openResample}>Resample</button>

      {isResampleOpen && (
        <div className=".resample-overlay">
          <div className=".resample-content">
            <button className="close" onClick={closeResample}>Close Resample</button>
            <h2>Resample Component</h2>
            <p>Resample stuff here.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export { ResampleComponent };