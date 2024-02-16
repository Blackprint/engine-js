// For Node.js and Bun
// import Blackprint from '@blackprint/engine';
import '../../dist/engine.min.js';

// Run from your CLI
// bun run --preload ./../bun-loader.mjs ./test-loader.mjs
// node --no-warnings --env-file=.env --enable-source-maps --loader ../nodejs-loader.mjs ./test-loader.mjs

import { instance, Ports } from './test.bpi';

console.log(Object.keys(instance.iface));
// instance.ref.myButton.Output.Clicked();
Ports.myButton.Output.Clicked();