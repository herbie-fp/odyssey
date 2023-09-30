import React, { useEffect, useState } from 'react';

const ExternalLoader = () => {
  const filePath = 'ExternalComponent.tsx';
  const [componentCode, setComponentCode] = useState(null);

  useEffect(() => {
    // Fetch the component code from the file
    fetch(filePath)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Error fetching file: ${filePath}`);
        }
        return response.text();
      })
      .then((data) => {
        // Use eval to execute the code as JavaScript
        try {
          const code = eval(data);

          // Check if the result is a valid React component
          if (typeof code === 'function') {
            setComponentCode(code);
          } else {
            console.error('Invalid React component code in file:', filePath);
          }
        } catch (e) {
          console.error('Error evaluating component code:', e);
        }
      })
      .catch((error) => {
        console.error('Error reading file:', error);
      });
  }, [filePath]);

  if (componentCode) {
    const ExternalComponentLoader = componentCode as React.ComponentType;
    return <ExternalComponentLoader />;
  } else {
    return <div>Loading...</div>;
  }
}

export { ExternalLoader };
