import React, { useEffect } from 'react';

const ExternalLoader = ({}) => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'http://localhost:8001/app.es.js';
    script.async = true;

    const head = document.head || document.getElementsByTagName('head')[0];
    head.appendChild(script);

    return () => {
      head.removeChild(script);
    };
  }, []);

  return <div>Loading external component...</div>;
};

export default ExternalLoader;
