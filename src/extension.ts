// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { join } from 'path';
import { spawn } from 'child_process';

import * as fs from 'fs';
const lnk = require('lnk');
const http = require('http');
const https = require('https');
const url = require('url');
const express = require('express');
const bodyParser = require('body-parser')
const cors = require('cors');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// TODO Remove this:
const LOCAL_TEST_PORT = 7777;
const SERVER_ADDRESS = "http://104.200.24.142:8000";

// Port for plugins
const pluginPort = 8888;

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
	const request = protocol.get(downloadUrl, function (response: any) {
		response.pipe(file);
		file.on('finish', function () {
			file.close(callback); // Call the callback once the file is written to disk.
		});
	}).on('error', function (err: any) {
		fs.unlink(dest, () => { }); // Delete the file if there's an error.
		if (callback) { callback(err.message); }
	});
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const odysseyDir = require('os').homedir() + '/.local/share/odyssey'
	let herbiePath = ''
	let fpbenchPath = ''
	let fptaylorPath = ''

	switch (process.platform) {
		case 'win32':
			herbiePath = odysseyDir + '/dist/windows/herbie-compiled/herbie.exe'
			fpbenchPath = odysseyDir + '/dist/windows/fpbench-compiled/fpbench.exe'
			fptaylorPath = odysseyDir + '/dist/windows/fptaylor-compiled/fptaylor.exe'
			break
		case 'linux':
			herbiePath = odysseyDir + '/dist/linux/herbie-compiled/bin/herbie'
			fpbenchPath = odysseyDir + '/dist/linux/fpbench-compiled/bin/fpbench'
			fptaylorPath = odysseyDir + '/dist/linux/fptaylor-compiled/fptaylor'
			break
		case 'darwin':
			herbiePath = odysseyDir + '/dist/macos/herbie-compiled/bin/herbie'
			fpbenchPath = odysseyDir + '/dist/macos/fpbench-compiled/bin/fpbench'
			fptaylorPath = odysseyDir + '/dist/macos/fptaylor-compiled/fptaylor'
			break
	}

	const showError = (message: string) => {
		vscode.window.showErrorMessage(message, 'Copy to clipboard').then((action) => {
			if (action === 'Copy to clipboard') {
				vscode.env.clipboard.writeText(message)
			}
		})
	}
	const showInfo = (message: string) => {
		vscode.window.showInformationMessage(message)
	}

	let herbieTerminal: vscode.Terminal | null = null
	const getTerminal = () => {
		if (herbieTerminal === null) {
			herbieTerminal = vscode.window.createTerminal('Herbie')
			vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
				// Handle the closed terminal event here
				if (herbieTerminal === closedTerminal) {
					herbieTerminal = null
				}
			});
		}
		return herbieTerminal
	}
	const getHerbieTerminal = () => {
		if (herbieTerminal === null) {
			herbieTerminal = vscode.window.createTerminal('Herbie')
			vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
				// Handle the closed terminal event here
				if (herbieTerminal === closedTerminal) {
					herbieTerminal = null
				}
			});
		}
		return herbieTerminal
	}
	let fpbenchTerminal: vscode.Terminal | null = null
	const getFPBenchTerminal = () => {
		if (fpbenchTerminal === null) {
			fpbenchTerminal = vscode.window.createTerminal('FPBench')
			vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
				// Handle the closed terminal event here
				if (fpbenchTerminal === closedTerminal) {
					fpbenchTerminal = null
				}
			});
		}
		return fpbenchTerminal
	}
	let fptaylorTerminal: vscode.Terminal | null = null
	const getFPTaylorTerminal = () => {
		if (fptaylorTerminal === null) {
			fptaylorTerminal = vscode.window.createTerminal('FPTaylor')
			vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
				// Handle the closed terminal event here
				if (fptaylorTerminal === closedTerminal) {
					fptaylorTerminal = null
				}
			});
		}
		return fptaylorTerminal
	}

	const downloadAndRunHerbie = async () => {
		console.log('downloading herbie')
		// show information message
		vscode.window.showInformationMessage('Downloading Herbie...')
		// spawn the download process
		// get zip file from site
		const url = SERVER_ADDRESS + "/herbie-dist.zip"
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
		if (!fs.existsSync(odysseyDir + '/dist')) {
			fs.mkdirSync(odysseyDir + '/dist')
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
			const AdmZip = require("adm-zip");

			try {
				const zip = new AdmZip(dest);
				zip.extractAllTo(/*target path*/ odysseyDir + '/dist', /*overwrite*/ true);
			} catch (e) {
				vscode.window.showErrorMessage('Error installing Herbie (extraction): ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}

			try {
				fs.unlinkSync(dest)

				// make binary executable
				fs.chmodSync(herbiePath, '755')
			} catch (err: any) {
				vscode.window.showErrorMessage('Error installing Herbie: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}

			// show information message
			vscode.window.showInformationMessage('Herbie installed successfully. Starting server...')
			try {
				// run the command in the VSCode terminal
				// show the terminal
				herbieTerminal = getHerbieTerminal()
				herbieTerminal.show()

				herbieTerminal.sendText(herbiePath + ' web --quiet')
				console.log('started herbie server')
			} catch (err: any) {
				vscode.window.showErrorMessage('Error starting Herbie server: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}
		})
	}

	const app = express();
	app.use(cors());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());

	app.post('/fpbench', async (req: any, res: any) => {
		const input = req.body;
		const formulas = input.formulas.join("\n");
		const safe_formulas = formulas.replace(/'/g, "\\'");
		try {
			const { stdout, stderr } = await exec(
				`cd ${odysseyDir} && .${fpbenchPath.replace(odysseyDir, '')} export --lang fptaylor <(printf '${safe_formulas}') -`,
				{ shell: '/bin/bash' }
			);
			res.json({ stdout });
		} catch (e) {
			vscode.window.showErrorMessage('Error running FPBench: ' + e, 'Copy to clipboard').then((action) => {
				if (action === 'Copy to clipboard') {
					vscode.env.clipboard.writeText(e as string)
				}
			}
			);
			console.error(e);
		}
	})

	app.post('/fptaylor', async (req: any, res: any) => {
		const input = req.body;
		const safe_input = input.fptaylorInput.replace(/'/g, "\\'");
		try {
			const { stdout, stderr } = await exec(
				`cd ${odysseyDir} && .${fptaylorPath.replace(odysseyDir, '')} <(printf '${safe_input}')`,
				{ shell: '/bin/bash' }
			);

			res.json({ output: `<(printf "${stdout}")` });
		} catch (e) {
			console.error(e);
		}
	})

	app.listen(pluginPort, () => {
		console.log(`Example app listening on port ${pluginPort}`)
	})

	const downloadFPTaylor = async () => {
		// show information message
		vscode.window.showInformationMessage('Downloading FPTaylor...')
		// spawn the download process
		// get zip file from site
		const url = SERVER_ADDRESS + "/fptaylor-dist.zip"
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
		if (!fs.existsSync(odysseyDir + '/dist')) {
			fs.mkdirSync(odysseyDir + '/dist')
		}
		const dest = home + '/.local/share/odyssey/fptaylor-compiled.zip'
		downloadFile(url, dest, (err: any) => {
			if (err) {
				vscode.window.showErrorMessage('Error downloading FPTaylor: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			} else {
				vscode.window.showInformationMessage('FPTaylor downloaded successfully. Please wait while it is installed...')
			}
			// unzip to home local share odyssey
			const AdmZip = require("adm-zip");

			try {
				const zip = new AdmZip(dest);
				zip.extractAllTo(/*target path*/ odysseyDir + '/dist', /*overwrite*/ true);
			} catch (e) {
				vscode.window.showErrorMessage('Error installing FPTaylor (extraction): ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}

			try {
				fs.unlinkSync(dest)

				// make binary executable
				fs.chmodSync(fptaylorPath, 0o755)
			} catch (err: any) {
				vscode.window.showErrorMessage('Error installing FPTaylor: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}

			// TODO We don't need this code, why is it here?
			// // show information message
			// vscode.window.showInformationMessage('FPTaylor installed successfully. Starting server...')
			// try {
			// 	// run the command in the VSCode terminal
			// 	// show the terminal
			// 	herbieTerminal = getTerminal()
			// 	herbieTerminal.show()

			// 	herbieTerminal.sendText(fptaylorPath + ' web --quiet')
			// } catch (err: any) {
			// 	vscode.window.showErrorMessage('Error starting FPTaylor server: ' + err, 'Copy to clipboard').then((action) => {
			// 		if (action === 'Copy to clipboard') {
			// 			vscode.env.clipboard.writeText(err)
			// 		}
			// 	})
			// }
		})
	}

	const downloadFPBench = async () => {
		// show information message
		vscode.window.showInformationMessage('Downloading FPBench...')
		// spawn the download process
		// get zip file from site
		const url = SERVER_ADDRESS + "/fpbench-dist.zip"
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
		if (!fs.existsSync(odysseyDir + '/dist')) {
			fs.mkdirSync(odysseyDir + '/dist')
		}
		const dest = home + '/.local/share/odyssey/fpbench-compiled.zip'
		downloadFile(url, dest, (err: any) => {
			if (err) {
				vscode.window.showErrorMessage('Error downloading FPBench: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			} else {
				vscode.window.showInformationMessage('FPBench downloaded successfully. Please wait while it is installed...')
			}
			// unzip to home local share odyssey
			const AdmZip = require("adm-zip");

			try {
				const zip = new AdmZip(dest);
				zip.extractAllTo(/*target path*/ odysseyDir + '/dist', /*overwrite*/ true);
			} catch (e) {
				vscode.window.showErrorMessage('Error installing FPBench (extraction): ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}

			try {
				fs.unlinkSync(dest)

				// make binary executable
				fs.chmodSync(fpbenchPath, 0o755)
			} catch (err: any) {
				vscode.window.showErrorMessage('Error installing FPBench: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}

			// TODO We don't need this code, why is it here?
			// // show information message
			// vscode.window.showInformationMessage('FPBench installed successfully. Starting server...')
			// try {
			// 	// run the command in the VSCode terminal
			// 	// show the terminal
			// 	herbieTerminal = getTerminal()
			// 	herbieTerminal.show()

			// 	herbieTerminal.sendText(fpbenchPath + ' web --quiet')
			// } catch (err: any) {
			// 	vscode.window.showErrorMessage('Error starting FPBench server: ' + err, 'Copy to clipboard').then((action) => {
			// 		if (action === 'Copy to clipboard') {
			// 			vscode.env.clipboard.writeText(err)
			// 		}
			// 	})
			// }
		})
	}

	const runHerbieServer = async () => {
		try {
			const port = 8000

			const isPortFree = (port: number) =>
				new Promise(resolve => {
					const server = require('http')
						.createServer()
						.listen(port, () => {
							server.close()
							resolve(true)
						})
						.on('error', () => {
							resolve(false)
							return false
						})
				})
			// check if port is in use
			let somethingOnPort = !(await isPortFree(port))

			if (somethingOnPort) { // yes
				// is it herbie?
				try {
					const response = await fetch('http://127.0.0.1:' + port + '/up')
				} catch (err: any) {
					showError(`A process is running on port ${port} but it isn't a working Herbie server. Full error:\n` + err)
					return
				}
			}

			// check if symlink exists
			if (!fs.existsSync(herbiePath)) {
				// wait for user to download herbie
				vscode.window.showErrorMessage("Herbie doesn't seem to be installed yet. Click the button to download it.", 'Download').then((action) => {
					if (action === 'Download') {
						downloadAndRunHerbie()
					}
				})
			} else if (somethingOnPort) {
				showInfo("Using existing Herbie server on port " + port + ".")
				return
			} else {
				herbieTerminal = getTerminal()
				herbieTerminal.show()
				herbieTerminal.sendText(herbiePath + ' web --quiet')
				console.log('started herbie server')
			}
		} catch (err: any) {
			vscode.window.showErrorMessage('Error starting Herbie server: ' + err, 'Copy to clipboard').then((action) => {
				if (action === 'Copy to clipboard') {
					vscode.env.clipboard.writeText(err)
				}
			})
		}
	}

	// TODO maybe get rid of this?
	const runFPTaylorServer = async () => {
		try {
			const port = 8001

			const isPortFree = (port: number) =>
				new Promise(resolve => {
					const server = require('http')
						.createServer()
						.listen(port, () => {
							server.close()
							resolve(true)
						})
						.on('error', () => {
							resolve(false)
							return false
						})
				})
			// check if port is in use
			let somethingOnPort = !(await isPortFree(port))

			if (somethingOnPort) { // yes
				// is it FPTaylor?
				// TODO: Figure out how to check if it's FPTaylor
			}

			// check if symlink exists
			if (!fs.existsSync(fptaylorPath)) {
				// wait for user to download herbie
				vscode.window.showErrorMessage("FPTaylor doesn't seem to be installed yet. Click the button to download it.", 'Download').then((action) => {
					if (action === 'Download') {
						downloadFPTaylor()
					}
				})
			} else if (somethingOnPort) {
				showInfo("Using existing FPTaylor server on port " + port + ".")
				return
			} else {
				herbieTerminal = getTerminal()
				herbieTerminal.show()

				// Set up FPTaylor server here
				// TODO (rc2002)
			}
		} catch (err: any) {
			vscode.window.showErrorMessage('Error starting FPTaylor server: ' + err, 'Copy to clipboard').then((action) => {
				if (action === 'Copy to clipboard') {
					vscode.env.clipboard.writeText(err)
				}
			})
		}
	}

	// TODO maybe get rid of this?
	const runFPBenchServer = async () => {
		try {
			const port = 8002

			const isPortFree = (port: number) =>
				new Promise(resolve => {
					const server = require('http')
						.createServer()
						.listen(port, () => {
							server.close()
							resolve(true)
						})
						.on('error', () => {
							resolve(false)
							return false
						})
				})
			// check if port is in use
			let somethingOnPort = !(await isPortFree(port))

			if (somethingOnPort) { // yes
				// is it FPBench?
				// TODO: Figure out how to check if it's FPBench
			}

			// check if symlink exists
			if (!fs.existsSync(fpbenchPath)) {
				// wait for user to download herbie
				vscode.window.showErrorMessage("FPBench doesn't seem to be installed yet. Click the button to download it.", 'Download').then((action) => {
					if (action === 'Download') {
						downloadFPBench()
					}
				})
			} else if (somethingOnPort) {
				showInfo("Using existing FPBench server on port " + port + ".")
				return
			} else {
				herbieTerminal = getTerminal()
				herbieTerminal.show()
			}
		} catch (err: any) {
			vscode.window.showErrorMessage('Error starting FPBench server: ' + err, 'Copy to clipboard').then((action) => {
				if (action === 'Copy to clipboard') {
					vscode.env.clipboard.writeText(err)
				}
			})
		}
	}

	// read name from package.json
	const packageJson = require('../package.json')
	const extensionName = packageJson.name

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand(`${extensionName}.openTab`, async () => {

		await runHerbieServer()
		// await runFPBenchServer()
		if (!fs.existsSync(fpbenchPath)) {
			// wait for user to download herbie
			vscode.window.showErrorMessage("FPBench doesn't seem to be installed yet. Click the button to download it.", 'Download').then((action) => {
				if (action === 'Download') {
					downloadFPBench()
				}
			})
		}
		// await runFPTaylorServer()
		if (!fs.existsSync(fptaylorPath)) {
			// wait for user to download herbie
			vscode.window.showErrorMessage("FPTaylor doesn't seem to be installed yet. Click the button to download it.", 'Download').then((action) => {
				if (action === 'Download') {
					downloadFPTaylor()
				}
			})
		}

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
							downloadAndRunHerbie()
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
					}
				})
		}
		addMessageHandler(panel)
	})

	context.subscriptions.push(disposable)
}

const getWebviewContent = (webView: vscode.Webview, context: vscode.ExtensionContext) => {
	const jsFile = "webview.bundle.js";

	// this is the webpack dev server; in theory, this could be used for hot module reloading, but it doesn't work right now.
	const localServerUrl = "http://localhost:3000";
	const isProduction = context.extensionMode === vscode.ExtensionMode.Production;

	let scriptUrl = isProduction
		? webView.asWebviewUri(vscode.Uri.file(join(context.extensionPath, 'dist', jsFile))).toString()
		: `${localServerUrl}/${jsFile}`

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
