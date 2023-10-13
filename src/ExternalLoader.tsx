import React, { useState, useEffect } from 'react';
import DynamicComponentLoader from "./DynamicComponentLoader"

const componentString = `
import React from 'react';

function Component(props) {
    return <div>{props.data.message}</div>;
}

export default Component;
`;

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
  });

  const data = {
    message: "Hello from the existing program!"
  };

  return (
    <div>
      <DynamicComponentLoader componentString={componentString} data={data} />
    </div>
  );
};
