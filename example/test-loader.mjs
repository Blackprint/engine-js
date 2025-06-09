// Run from your CLI
// bun run --env-file=.env --preload ./../bun-loader.mjs ./test-loader.mjs
// bun run --env-file=.env ./test-loader.mjs
// node --env-file=.env --enable-source-maps --import ../nodejs-loader.js ./test-loader.mjs

import { instance, ref } from './test.bpi';

console.log(Object.keys(instance.iface)); // [ "myLogger", "mul_outer", "myButton", "myInput" ]
ref.myButton.Output.Clicked();