const express = require('express');
const serveIndex = require('serve-index');
const path = require('path');

const app = express();
const port = 6500;

const directoryPath = path.join(__dirname, '../../');

app.use('/', express.static(directoryPath), serveIndex(directoryPath, { icons: true }));

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
