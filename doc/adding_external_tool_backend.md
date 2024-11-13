# Adding an external tool server to Odyssey's backend
The purpose of this documentation is to explain how to add a new tool as a binary to Odyssey's backend, and ensure it can be set up when users run Odyssey.

This documentation assumes that you have the repo set up locally, that you have installed all necessary dependencies, and that you can compile, build, and then run Odyssey on your local machine. This documentation also assumes you have binaries or executables for your particular tool.

The codebase makes heavy use of [React](https://react.dev/), which you should be familiar with before constructing a component. There exist tutorials [for more modern React](https://react.dev/learn) as well as [this older React tutorial](https://legacy.reactjs.org/tutorial/tutorial.html).

This particular section of the codebase makes heavy use of Node's [file system library calls](https://nodejs.org/api/fs.html), and the documentation for that might be useful to review for the various fs calls.

TypeScript is the language of choice for this codebase. It features a fairly powerful [type system](https://www.typescriptlang.org/docs/handbook/intro.html) that you should be familiar with.


## Basic Setup

All external tool backend integration will be in ``extension.ts``, found in the top-level directory of the Odyssey repository.

The rest of this tutorial will assume you are looking at the ``extension.ts`` file unless otherwise stated.


## Hosting and linking an address for your binary download

The first step is to identify some location to store your external tool's binary, and include a download address.

Near the very top of ``extension.ts``, you should see a sequence of server address constants:

```
const HERBIE_SERVER_ADDRESS = "https://github.com/herbie-fp/odyssey/releases/download/v1.1.0-bin/herbie-dist.zip"
const FPTAYLOR_SERVER_ADDRESS = "https://github.com/herbie-fp/odyssey/releases/download/fptaylor-component/fptaylor-dist.zip"
const FPBENCH_SERVER_ADDRESS = "https://github.com/herbie-fp/odyssey/releases/download/fptaylor-component/fpbench-dist.zip"
```

that should look like the above as of November 2024.

You should construct a similar constant for your external binary, and provide some link to which your binary can be downloaded.

Your external binary should be hosted as a zip file with an internal folder structure similar to one of the existing Herbie, FPTaylor, or FPBench binary zipfile structures (it will generally look something like having a dist folder, with individual folders for each OS - downloading one of the existing binary zipfiles and following that structure will be useful).


## Separating different binaries for different distributions
At the beginning of the ``activate`` function,


```
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
// The activate function continues from here...
```

In this portion, define a new path variable for your binary, and add paths for the various platformed binaries your tool has. You should follow the existing structure, which to place the various paths for your tool's binaries under the corresponding OS subfolder under ``dist``, and then under a folder named ``<YOUR_TOOL>-compiled/<YOUR_TOOL>``

Note that ``darwin`` refers to the core operating system behind most distributions of macOS.


## Running the tool with an Express server
Later on in the activate function, you should see the following setup for express:

```
	const app = express();
	app.use(cors());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(bodyParser.json());
```

You should add one [endpoint](https://www.smashingmagazine.com/2018/01/understanding-using-rest-api/) for each functionality in your backend tool here. These are [Express](https://expressjs.com/en/guide/routing.html) endpoints and will use that routing. Note the use of the [exec](https://nodejs.org/api/child_process.html#child_processexeccommand-options-callback) function to execute your tool executable from the command line. Each endpoint will look something like this:

```
// Name your endpoint something logical, as you will be calling it from the frontend
	app.post('/<YOUR_TOOL>/<YOUR_ENDPOINT_NAME>', async (req: any, res: any) => {
		const input = req.body;

		// Sanitize the req.body input to prevent security issues
		const safe_input = input.<YOUR_TOOL_INPUT>.replace(/'/g, "\\'");

		try {
			// The most important line is this next one. Include anything you need to run your executable or binary from the command line, and exec will run it from the command line as a command.
			// Note that if your tool needs multiple commands to run, you will need multiple exec statements here
			const { stdout, stderr } = await exec(
				`cd ${odysseyDir} && .${<YOUR_TOOL_PATH>.replace(odysseyDir, '')} <(printf '${safe_input}')`,
				{ shell: '/bin/bash' }
			);

			// Define some string to be the returned result of your tool to send as a response from your endpoint.

			res.json({ stdout: `<(printf "${stdout}")` });
		} catch (e) {
			console.error(e);
		}
	})
```

The existing FPTaylor and FPBench endpoints serve as good examples to guide your implementation.


## Writing a function to download and install your tool
Next, we need to write a function to download, unpack, and then install your tool, or otherwise setup the binary.

This will look something like the following:


```
	const download_YOUR_TOOL = async () => {
		// show information message
		vscode.window.showInformationMessage('Downloading <YOUR_TOOL>...')
		// spawn the download process
		// get zip file from site
		const url = <YOUR_TOOL_SERVER_ADDRESS>
		// download with curl to home local share odyssey
		const home = require('os').homedir()
		// TODO path.join instead of string concat
		const odysseyDir = home + '/.local/share/odyssey'

		// If the directories don't exist, make them
		if (!fs.existsSync(odysseyDir)) {
			fs.mkdirSync(odysseyDir, { recursive: true })
		}
		if (!fs.existsSync(odysseyDir + '/bin')) {
			fs.mkdirSync(odysseyDir + '/bin')
		}
		if (!fs.existsSync(odysseyDir + '/dist')) {
			fs.mkdirSync(odysseyDir + '/dist')
		}


		const dest = home + '/.local/share/odyssey/<YOUR_TOOL>-compiled.zip'
		downloadFile(url, dest, (err: any) => {
			if (err) {
				vscode.window.showErrorMessage('Error downloading FPTaylor: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			} else {
				vscode.window.showInformationMessage('<YOUR_TOOL> downloaded successfully. Please wait while it is installed...')
			}
			// unzip to home local share odyssey
			const AdmZip = require("adm-zip");

			try {
				const zip = new AdmZip(dest);
				zip.extractAllTo(/*target path*/ odysseyDir + '/dist', /*overwrite*/ true);
			} catch (e) {
				vscode.window.showErrorMessage('Error installing <YOUR_TOOL> (extraction): ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}

			try {
				// Clean up the zip by using the unlink system call
				fs.unlinkSync(dest)

				// make binary executable
				fs.chmodSync(<YOUR_TOOL_PATH>, 0o755)
			} catch (err: any) {
				vscode.window.showErrorMessage('Error installing <YOUR_TOOL>: ' + err, 'Copy to clipboard').then((action) => {
					if (action === 'Copy to clipboard') {
						vscode.env.clipboard.writeText(err)
					}
				})
			}
		})
	}
```

As with the previous section, the existing FPTaylor and FPBench endpoints serve as good examples to guide your implementation.


## Prompting the user to download and install your tool
Next, we need to link a button prompt to the function from the previous part.

Following the running of the openTab command itself, you should see the line of code
```
	let disposable = vscode.commands.registerCommand(`${extensionName}.openTab`, async () => {
```

with a section for prompting the user to download specific tools if they don't have them already. Here, add an error prompt for your tool with a call to the function from the previous part. It should generally look something like the following.

```
		if (!fs.existsSync(<YOUR_TOOL_PATH>)) {
			// wait for user to download <YOUR_TOOL>
			vscode.window.showErrorMessage("<YOUR_TOOL> doesn't seem to be installed yet. Click the button to download it.", 'Download').then((action) => {
				if (action === 'Download') {
					download_YOUR_TOOL()
				}
			})
		}
```

As always, the existing FPTaylor and FPBench endpoints serve as good examples to guide your implementation.

## If your tool is only supported on some OSes or has other requirements (like hardware)
In some cases, your tool may only be supported on certain operating systems. Here, you can follow similar steps to the logic for the FPBench and FPTaylor cases.

In particular, define a new constant for supported platforms like so:

```
		const systemSupportsFPTaylor = process.platform === 'linux'
		const systemSupportsFPBench = process.platform === 'linux'
		const systemSupportsYOUR_TOOL = process.platform === YOUR_SUPPORTED_PLATFORMS_HERE
```

which may need advanced logic if you're checking if the user has specific hardware.

and then when prompting the user to install your tool, add a check to make sure they're on an OS that supports your tool:

```
		if (!fs.existsSync(YOUR_TOOL_PATH) && systemSupportsYOUR_TOOL) {
			// Rest of the logic from before goes here
			// ...
		}
```

## Connecting your external tool to the main server
You should also include an instance of your tool in the main server, where current instnaces of Herbie, Odyssey, and other tools are run for the web demo. 

Documentation for this can be found under the ``/server`` directory.
