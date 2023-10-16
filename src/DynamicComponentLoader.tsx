import React, { useState, useEffect } from 'react';

interface DynamicComponentLoaderProps {
  componentString: string;
  data: any; // Replace 'any' with a more specific type if possible
}

function DynamicComponentLoader(props: DynamicComponentLoaderProps) {
  const { componentString, data } = props;
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    loadComponent(componentString);
  }, [componentString]);

  const loadComponent = (code: string) => {
    try {
      const dynamicModule: { exports: React.ComponentType<any> } = {
        exports: () => <div>Default Component</div> // Provide a default component or type
      };
      const evaluatedResult = eval(code + '\nmodule.exports = Component;');
      setComponent(() => dynamicModule.exports);
    } catch (error) {
      console.error("Failed to load the component:", error);
    }
  };

  if (!Component) {return null;}

  return <Component data={data} />;
}

export default DynamicComponentLoader;
