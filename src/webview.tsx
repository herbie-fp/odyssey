// import * as ReactDOM from 'react-dom';
import { HerbieUI } from './herbie/HerbieUI';

// const vscode = acquireVsCodeApi();
interface vscode {
  postMessage(message: any): void;
}
// declare function acquireVsCodeApi(): vscode;
declare const vscode: vscode;

// ReactDOM.render(<HerbieUI />, document.getElementById('root'));


import { createRoot } from 'react-dom/client';
const container = document.getElementById('root');
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(<HerbieUI />);