import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const ExternalLoader: React.FC<{ componentString: string }> = ({ componentString }) => {
  const renderCode = () => {
    // Create a script element to execute the code
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';
    scriptElement.text = componentString;
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

// import React, { useEffect, useState } from 'react';

// const ExternalLoader = () => {
//   const [externalComponent, setExternalComponent] = useState('<div>Loading...</div>');

//   useEffect(() => {
//     //@ts-ignore
//     window.vscode.postMessage(JSON.stringify({
//       command: 'loadExternal',
//       file: 'external/ExternalComponent.tsx'
//     }));
//   })

//   window.addEventListener('message', event => {
//     //@ts-ignore
//     setExternalComponent(event.data.fileContents);
//     console.log(event.data.fileContents)
//   });

//   return (
//     <div dangerouslySetInnerHTML={{ __html: externalComponent }}>

//     </div>
//   );
// };

// export { ExternalLoader };