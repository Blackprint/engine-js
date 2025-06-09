const { register } = require('node:module');
const { pathToFileURL } = require('node:url');

register('./nodejs-bpi-loader.mjs', pathToFileURL(__filename));
register('./nodejs-http-loader.mjs', pathToFileURL(__filename));