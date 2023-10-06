import React, { useEffect, useState } from 'react';

export const ExternalLoader = () => {
  const [externalComponent, setExternalComponent] = useState('<div>Loading...</div>');

  useEffect(() => {
    //@ts-ignore
    window.vscode.postMessage(JSON.stringify({
      command: 'loadExternal',
      file: 'external/ExternalComponent.tsx'
    }));
  })

  window.addEventListener('message', event => {
    //@ts-ignore
    setExternalComponent(event.data.fileContents);
    console.log(event.data.fileContents)
  });

  return (
    <div dangerouslySetInnerHTML={{ __html: externalComponent }}>
      
    </div>
  );
};
