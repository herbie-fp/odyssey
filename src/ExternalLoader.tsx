import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

const ExternalLoader: React.FC<{ componentString: string }> = ({ componentString }) => {
  const [externalComponent, setExternalComponent] = useState('<div>Loading...</div>');

  useEffect(() => {
    //@ts-ignore
    window.vscode.postMessage(JSON.stringify({
      command: 'loadExternal',
      file: 'external/app.es.js'
    }));
  })

  window.addEventListener('message', event => {
    //@ts-ignore
    setExternalComponent(event.data.fileContents);
    console.log(event.data.fileContents)
  });

  const renderCode = () => {
    // Create a script element to execute the code
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.text = externalComponent;
    document.head.appendChild(scriptElement);
  };

  return (
    <div>
      <button onClick={renderCode}>Render Code</button>
      <div id="root"></div>
    </div>
  );
  // return new Function('React', 'return ' + componentString)(React)()
};

export default ExternalLoader;