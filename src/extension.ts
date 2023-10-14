// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { join } from 'path';
import { spawn } from 'child_process';

const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

/**
 * Downloads a file from a URL to a specified directory.
 * 
 * @param {string} downloadUrl - The URL of the file to download.
 * @param {string} dest - The path to the directory where the file should be saved.
 * @param {function} callback - A callback function to execute once download is complete.
 */
function downloadFile(downloadUrl: string, dest: string, callback: (err: any) => void) {
	const parsedUrl = url.parse(downloadUrl);
	const protocol = parsedUrl.protocol === 'https:' ? https : http;

	const file = fs.createWriteStream(dest);
	const request = protocol.get(downloadUrl, function(response: any) {
			response.pipe(file);
			file.on('finish', function() {
					file.close(callback); // Call the callback once the file is written to disk.
			});
	}).on('error', function(err: any) {
			fs.unlink(dest); // Delete the file if there's an error.
			if (callback) { callback(err.message); }
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('odyssey-fp.openTab', () => {
		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'herbieIndex', // Identifies the type of the webview. Used internally
			'Odyssey: Herbie', // Title of the panel displayed to the user
			vscode.ViewColumn.One, // Editor column to show the new webview panel in.
			{
				enableScripts: true,
				// Only allow the webview to access resources in these directories
				localResourceRoots: [vscode.Uri.file(join(context.extensionPath, 'dist'))],
				retainContextWhenHidden: true,
			})
		panel.iconPath = vscode.Uri.file(join(context.extensionPath, 'images/odyssey-icon.png'))
		panel.webview.html = getWebviewContent(panel.webview, context);
		const addMessageHandler = (panel: vscode.WebviewPanel) => {
			// old code, only use if we need to receive messages from the webview
			panel.webview.onDidReceiveMessage(
				async message => {
					console.log('got message', message)
					message = JSON.parse(message)
					switch (message.command) {
						case 'downloadHerbie':
							console.log('downloading herbie')
							// show information message
							vscode.window.showInformationMessage('Downloading Herbie...')
							// spawn the download process
							// get zip file from site
							const url = "http://104.200.24.142:8000/herbie-compiled.zip"
							// download with curl to home local share odyssey
							const home = require('os').homedir()
							// TODO path.join instead of string concat
							const odysseyDir = home + '/.local/share/odyssey'
							if (!fs.existsSync(odysseyDir)) {
								fs.mkdirSync(odysseyDir, { recursive: true })
							}
							if (!fs.existsSync(odysseyDir + '/bin')) {
								fs.mkdirSync(odysseyDir + '/bin')
							}
							const dest = home + '/.local/share/odyssey/herbie-compiled.zip'
							downloadFile(url, dest, (err: any) => {
								if (err) {
									vscode.window.showErrorMessage('Error downloading Herbie: ' + err, 'Copy to clipboard').then((action) => {
										if (action === 'Copy to clipboard') {
											vscode.env.clipboard.writeText(err)
										}
									})
								} else {
									vscode.window.showInformationMessage('Herbie downloaded successfully. Please wait while it is installed...')
								}
								// unzip to home local share odyssey
								const unzip = require('unzipper')
								const extract = unzip.Extract({ path: home + '/.local/share/odyssey' })
								fs.createReadStream(dest).pipe(extract)
								// wait for close event
								extract.on('close', () => {
									// delete zip file
									fs.unlinkSync(dest)
									// make bin executable
									fs.chmodSync(odysseyDir + '/herbie-compiled/bin', '755')
									// create symlink from home local share odyssey herbie-compiled bin to home local share odyssey bin
									const symlink = home + '/.local/share/odyssey/bin/herbie'
									fs.symlinkSync(bin, symlink)
									// show information message
									vscode.window.showInformationMessage('Herbie installed successfully. Starting server...')
									spawn(symlink, ['web', '--quiet']);
								})
							})

							break
						case 'openLink':
							vscode.env.openExternal(vscode.Uri.parse(message.link))
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

	spawn(require('os').homedir() + '/.local/share/odyssey/bin/herbie', ['web', '--quiet']);
	
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
		<style>
		
		</style>
	</head>
	<body>
	  <script type="module">
		console.log('getting vscodeapi')
		window.vscode = await window.acquireVsCodeApi();
		window.addEventListener("error", (event) => {
			console.log('caught error', event)
			vscode.postMessage(JSON.stringify({ command: 'error', error: event.error?.toString ? event.error.toString() : (JSON.stringify(event.error) + '\\n' + 'Message:' + event.message) }))
		})
		window.addEventListener("unhandledrejection", (event) => {
			console.log('caught unhandledrejection', event)
			console.log(vscode)
			vscode.postMessage(JSON.stringify({ command: 'error', error: event.reason.stack }))
		})
		window.addEventListener("openLink", (event) => {
			console.log('caught openLink', event)
			vscode.postMessage(JSON.stringify({ command: 'openLink', link: event.detail }))
		})
		</script>
		<div id="root"></div>

		<script src="${scriptUrl}" />
	</body>
	</html>`;
};

// This method is called when your extension is deactivated
export function deactivate() {

	// TODO clean up servers
}