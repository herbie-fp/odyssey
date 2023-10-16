import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const ExternalLoader: React.FC<{ componentString: string }> = ({ componentString }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const componentFunction = new Function('React', 'return ' + componentString)(React);

    if (componentFunction) {
      const Component = componentFunction;
      const element = React.createElement(Component);
      ReactDOM.render(element, containerRef.current);
    }
  }, [componentString]);

  return <div ref={containerRef} />;
};

export default ExternalLoader;
