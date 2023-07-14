import React, { useState } from 'react';

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
        <div className="spec-overlay-content">
          <div className="spec-textarea">
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