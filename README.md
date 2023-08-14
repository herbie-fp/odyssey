# ⚠️ In development! v1.0 will release in August. ⚠️

# Development is happening on `main`! To run the most recent pre-rewrite version, use `latest-post-study`. For the study version, use `uist23-eval`.

# Odyssey: An Interactive Numerics Workbench
<!-- TODO Not direct enough -- we need to make sure the user can decide if they need the tool within the first sentence, show a picture of adding an expression and seeing error. 

Followed by getting expression with Herbie. -->

<!-- Odyssey is a VSCode extension developed to enhance the interactivity of floating-point error investigation and improvement systems like the [Herbie](https://herbie.uwplse.org/demo/) tool.

Odyssey is designed to help users identify sources of error in floating-point expressions and then rewrite the expressions to improve their accuracy. It includes analyses of local error for particular inputs as well as a plot of error across a uniform sample of possible inputs for a floating-point expresssion, and uses Herbie to generate rewrite suggestions. -->

## Running Odyssey

### Herbie server
A running instance of Herbie must be present before analyzing an expression with Odyssey. After following the [Herbie installation instructions](https://herbie.uwplse.org/doc/latest/installing.html), you can run a Herbie server with
```
herbie web --port 8000 --quiet
```
<!-- TODO picture of good Herbie output -->

You can adjust the server address where Odyssey looks for Herbie in the Odyssey interface.
<!-- TODO talk about using the server status component -->
<!-- TODO picture of server status component -->


### Starting Odyssey

After starting the Herbie server, run Odyssey from the VSCode command palette using Ctrl/Command-Shift-P > "Odyssey: Herbie".

## Tutorial
<!-- TODO link to a separate markdown page in this repo -->
<!-- Tutorial should work through a full example--
 let's use sqrt(x + 1) - sqrt(x) for now.
 Show setting spec, looking at the error plot + local error, then adding an expression, getting more expressions with Herbie, looking at derivations, and resampling to zoom in.
 -->

## Features

<!-- TODO Full list of features here, with images -->
<!-- ![The Odyssey interface](images/odyssey-interface.png) -->

# Setting up a development environment
```bash
$ npm install
# Then use command/control+shift+B to start the auto-compile task
# Each time compilation finishes, you should see a message like "webpack 5.82.1 compiled with 1 warning in 31769 ms"
```

### Testing the extension
Use the "Run and Debug" tab to start an instance of VSCode with the most recent code.

You can see changes to the frontend (`webview/index.ts`) by simply refreshing the webview, but **changes to the host (`extension.ts`) will only show if the debugger is restarted.**

### How to publish:

Get publication key from @elmisback, then:

```bash
# update "version" in package.json, then
$ npm run publish
```

<!-- ## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something -->

## Citing Odyssey

<!-- Point to UIST citation/DOI -->

## Known Issues

See the issues tab on Github.

## Release Notes

### 1.0.0
* First public release

<!-- TODO add more release notes -->

### 0.4.0

* Rename repo + extension
* Still unofficial; expecting to release 1.0 at the beginning of August

### 0.1.0

First major post-study 1 version

-----------------------------------------------------------------------------------------------------------
<!-- ## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)