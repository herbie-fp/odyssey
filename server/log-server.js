const express = require('express');
const bodyParser = require('body-parser');
const { log: logCallback } = require('./tool-server'); // Import the callback
const cors = require('cors'); // Import cors
const argv = require('minimist')(process.argv.slice(2)); // Parse command-line arguments

const app = express();
const PORT = process.env.PORT || argv.port || 8003; // Use --port argument, environment variable, or default

app.use(cors()); // Enable CORS
app.use(bodyParser.json()); // Parse incoming JSON requests

// Use logCallback for the /log endpoint
app.post('/log', logCallback);

app.listen(PORT, () => {
  console.log(`Logging server running on port ${PORT}`);
});