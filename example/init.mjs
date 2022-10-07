// For Deno
// import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.8';
// import Blackprint from '../../dist/engine.es6.js';

// For Node.js
import Blackprint from '@blackprint/engine';
// import Blackprint from '../../dist/engine.min.js';

// Run from your CLI
// deno run --allow-net init.mjs

// For Node.js you can also run this script like below
// node --no-warnings --loader ../es6-https-loader.mjs ./init.mjs
// node --no-warnings --loader ./node_modules/@blackprint/engine/es6-https-loader.mjs ./example/init.mjs

// === Import JSON after all nodes was registered ===
// You can import this to Blackprint Sketch if you want to view the nodes visually
!async function(){
	let instance = new Blackprint.Engine();
	Blackprint.allowModuleOrigin('*'); // Allow load from any URL (localhost/https only)

	await instance.importJSON('{"_":{"moduleJS":["https://cdn.jsdelivr.net/npm/@blackprint/nodes@0.5/dist/nodes-example.mjs"]},"Example/Math/Random":[{"i":0,"x":298,"y":73,"output":{"Out":[{"i":2,"name":"A"}]}},{"i":1,"x":298,"y":239,"output":{"Out":[{"i":2,"name":"B"}]}}],"Example/Math/Multiply":[{"i":2,"x":525,"y":155,"output":{"Result":[{"i":3,"name":"Any"}]}}],"Example/Display/Logger":[{"i":3,"id":"myLogger","x":763,"y":169}],"Example/Button/Simple":[{"i":4,"id":"myButton","x":41,"y":59,"output":{"Clicked":[{"i":2,"name":"Exec"}]}}],"Example/Input/Simple":[{"i":5,"id":"myInput","x":38,"y":281,"data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":3,"name":"Any"}]}}]}');

	// Time to run something :)
	var button = instance.iface.myButton;

	console.log("\n>> I'm clicking the button");
	button.clicked("'An event'");

	var logger = instance.iface.myLogger;
	console.log("\n>> I got the output value:", logger.log);

	console.log("\n>> I'm writing something to the input box");
	var input = instance.iface.myInput;
	input.data.value = 'hello wrold';

	// you can also use getNodes if you haven't set the ID
	logger = instance.getNodes('Example/Display/Logger')[0].iface;
	console.log("\n>> I got the output value:", logger.log);
}();