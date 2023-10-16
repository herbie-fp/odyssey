import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

const ExternalLoader: React.FC<{ componentString: string }> = ({ componentString }) => {
  return new Function('React', 'return ' + componentString)(React)()
};

export default ExternalLoader;
