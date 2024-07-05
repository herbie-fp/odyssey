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

const port = process.argv[2];  // Port to listen on
const fptaylorPath = process.argv[3];  // Path to FPTaylor binary

if (!fptaylorPath) {
  console.error('Usage: node server.js PORT PATH_TO_BINARY');
  process.exit(1);
}

app.post('/exec', async (req, res) => {
  try {
    const input = req.body;
    const safe_input = input.fptaylorInput.replace(/'/g, "\\'");
    const { stdout, stderr } = await execPromise(
      `${fptaylorPath} --log-base-dir /dev/null --tmp-base-dir /tmp <(printf '${safe_input}')`,
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
