// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { join } from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('interactive-herbie.openTab', () => {
		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'herbieIndex', // Identifies the type of the webview. Used internally
			'Odyssey: Herbie', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				enableScripts: true,
				// Only allow the webview to access resources in these directories
				localResourceRoots: [vscode.Uri.file(join(context.extensionPath, 'dist'))],
				retainContextWhenHidden: true
			})
		panel.webview.html = getWebviewContent(panel.webview, context);
		const addMessageHandler = (panel: vscode.WebviewPanel) => {
			// TODO: old code, only use if we need to receive messages from the webview
			panel.webview.onDidReceiveMessage(
				async message => {
					console.log('got message', message)
					message = JSON.parse(message)
					switch (message.command) {
						case 'error':
							// Show a button for copying the error message to the clipboard
							const copy = 'Copy to clipboard'
							console.log('error', message.error)
							const action = await vscode.window.showErrorMessage(message.error, copy)
							if (action === copy) {
								await vscode.env.clipboard.writeText(message.error)
							}
							break
						// case 'openNewTab':
						// 	const { mathjs, ranges } = message
						// 	const title = 'Odyssey: Herbie'//mathjs.length > 12 ? mathjs.slice(0, 9) + '...' : mathjs
						// 	const panel2 = vscode.window.createWebviewPanel(
						// 		'herbieIndex', // Identifies the type of the webview. Used internally
						// 		title, // Title of the panel displayed to the user
						// 		vscode.ViewColumn.One, // Editor column to show the new webview panel in.
						// 		{
						// 			// Enable scripts in the webview
						// 			enableScripts: true,
						// 			// Only allow the webview to access resources in these directories
						// 			localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'out'))],
						// 			retainContextWhenHidden: true
						// 		})
						}
				})
		}
		addMessageHandler(panel)
	})
	
	context.subscriptions.push(disposable)
}

const getWebviewContent = (webView: vscode.Webview, context: vscode.ExtensionContext) => {
	const jsFile = "webview.bundle.js";
	// const cssFile = "webview.css";
	// this is the webpack dev server; in theory, this could be used for hot module reloading, but it doesn't work right now.
	const localServerUrl = "http://localhost:3000";  
	const isProduction = context.extensionMode === vscode.ExtensionMode.Production;

	let scriptUrl = isProduction
		? webView.asWebviewUri(vscode.Uri.file(join(context.extensionPath, 'dist', jsFile))).toString()
		: `${localServerUrl}/${jsFile}`
	
	// let cssUrl = isProduction
	// 	? webView.asWebviewUri(vscode.Uri.file(join(context.extensionPath, 'dist', cssFile))).toString()
	// 	: `${localServerUrl}/${cssFile}`
	
	// TODO we are forcing production here right now, need to set properly elsewhere
	scriptUrl = webView.asWebviewUri(vscode.Uri.file(join(context.extensionPath, 'dist', jsFile))).toString();

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<meta
			http-equiv="Content-Security-Policy"
			content="script-src http://localhost:* https://cdn.jsdelivr.net/* https://fonts.googleapis.com/* ${webView.cspSource} 'unsafe-eval'  'unsafe-inline';"
		/>
		<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.css" integrity="sha384-3UiQGuEI4TTMaFmGIZumfRPtfKQ3trwQE2JgosJxCnGmQpL/lJdjpcHkaaFwHlcI" crossorigin="anonymous">
		<link rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Ruda">
	</head>
	<body>
	  <script type="module">
		console.log('getting vscodeapi')
		const vscode = await window.acquireVsCodeApi();
		window.addEventListener("error", (event) => {
			console.log('caught error', event)
			vscode.postMessage(JSON.stringify({ command: 'error', error: event.error?.toString ? event.error.toString() : (JSON.stringify(event.error) + '\\n' + 'Message:' + event.message) }))
		})
		window.addEventListener("unhandledrejection", (event) => {
			console.log('caught unhandledrejection', event)
			console.log(vscode)
			vscode.postMessage(JSON.stringify({ command: 'error', error: event.reason.stack }))
		})
		</script>
		<div id="root"></div>

		<script src="${scriptUrl}" />
	</body>
	</html>`;
};

// This method is called when your extension is deactivated
export function deactivate() {}