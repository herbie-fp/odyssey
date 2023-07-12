import * as ReactDOM from 'react-dom';
import { HerbieUI } from './HerbieUI';

// const vscode = acquireVsCodeApi();
interface vscode {
  postMessage(message: any): void;
}
// declare function acquireVsCodeApi(): vscode;
declare const vscode: vscode;

ReactDOM.render(<HerbieUI />, document.getElementById('root'));