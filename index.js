require('dotenv').config();
const express = require('express');
const cors = require("cors");
const path = require('path');

const app = express();

app.use(cors({ origin: '*' }));

app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));

app.get('/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

// create test route
app.get('/test', (req, res) => {
    res.send('test');
});

const port = process.env.PORT || 1204;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});