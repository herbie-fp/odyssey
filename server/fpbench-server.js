const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const port = process.argv[2] || 3000;  // Default to 3000 if no port is specified
const fpbenchPath = process.argv[3];  // Path to FPBench binary

if (!fpbenchPath) {
  console.error('Usage: node server.js PORT PATH_TO_BINARY');
  process.exit(1);
}

app.post('/exec', async (req, res) => {
  try {
    const input = req.body;
    const formulas = input.formulas.join("\n");
    const safe_formulas = formulas.replace(/'/g, "\\'");
    const { stdout, stderr } = await execPromise(
      `${fpbenchPath} export --lang fptaylor <(printf '${safe_formulas}') -`,
      { shell: '/bin/bash' }
    );
    res.json({ stdout });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
