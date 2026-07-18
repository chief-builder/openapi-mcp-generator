const fs = require('node:fs');
const path = require('node:path');

const source = path.resolve(__dirname, '..', 'src', 'core', 'templates');
const destination = path.resolve(__dirname, '..', 'dist', 'core', 'templates');

fs.rmSync(destination, { recursive: true, force: true });
fs.cpSync(source, destination, { recursive: true });
