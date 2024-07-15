const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const runServer = (port, execCallback, binaryPath) => {
  const app = express();
  app.use(cors());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.post('/exec', async (req, res) => {
    try {
      await execCallback(req, res, binaryPath);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.toString() });
    }
  });

  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  return server;
};

const fptaylorCallback = async (req, res, binaryPath) => {
  const input = req.body;
  const safe_input = input.fptaylorInput.replace(/'/g, "\\'");

  const { stdout, stderr } = await execPromise(
    `${binaryPath} --log-base-dir /dev/null --tmp-base-dir /tmp <(printf '${safe_input}')`,
    { shell: '/bin/bash' }
  );
  res.json({ stdout });
};

const fpbenchCallback = async (req, res, binaryPath) => {
  const input = req.body;
  const formulas = input.formulas.join("\n");
  const safe_formulas = formulas.replace(/'/g, "\\'");

  const { stdout, stderr } = await execPromise(
    `${binaryPath} export --lang fptaylor <(printf '${safe_formulas}') -`,
    { shell: '/bin/bash' }
  );
  res.json({ stdout });
};

// Export the server function and callbacks
module.exports = {
  runServer,
  fptaylor: fptaylorCallback,
  fpbench: fpbenchCallback
};

// Command-line interface
if (require.main === module) {
  const argv = require('minimist')(process.argv.slice(2));
  const port = argv.port || 8000;
  const toolName = argv.tool;
  const binaryPath = argv.path;

  if (!toolName || !binaryPath) {
    console.error('Usage: node server.js --port PORT --tool TOOL_NAME --path PATH_TO_BINARY');
    process.exit(1);
  }

  const callback = module.exports[toolName];

  if (!callback) {
    console.error(`Tool ${toolName} not found`);
    process.exit(1);
  }

  runServer(port, callback, binaryPath);
}
