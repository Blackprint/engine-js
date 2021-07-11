// For Deno
import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.1.0';
// import Blackprint from '../dist/engine.es6.js';

// For Node
// var Blackprint = require('@blackprint/engine');
// var Blackprint = require('../dist/engine.js');

let Engine = Blackprint.Engine;
let instance = new Engine();
// These comment can be collapsed depend on your IDE

// === Register Node Interface ===
	Engine.registerInterface('nodes/button', function(iface){
		iface.clicked = function(ev){
			console.log("Engine: 'Trigger' button clicked, going to run the handler");
			iface.node.clicked && iface.node.clicked(ev);
		}
	});

	Engine.registerInterface('nodes/input', function(iface, bind){
		var theValue = '';
		bind({
			options:{
				set value(val){
					theValue = val;

					if(iface.node.changed !== void 0)
						iface.node.changed(val);
				},
				get value(){
					return theValue;
				}
			}
		});
	});

	Engine.registerInterface('nodes/logger', function(iface, bind){
		var log = '...';
		bind({
			get log(){
				return log;
			},
			set log(val){
				log = val;
				console.log("Logger:", val);
			}
		});
	});

// Mask the console color, to separate the console.log call from Register Node Handler
	var log = console.log;
	console.log = console.warn = function(){
		log('\x1b[33m%s\x1b[0m', Array.from(arguments).join(' ')); // Turn it into green
	}

// === Register Node Handler ===
// Exact copy of register-handler.js from the browser version
// We just need to replace Blackprint.registerNode with Engine.registerNode
// https://github.com/Blackprint/blackprint.github.io/blob/master/src/js/register-handler.js
	Engine.registerNode('example/math/multiply', function(node, iface){
		iface.title = "Multiply";
		// Let's use default node interface

		// Handle all output port here
		node.outputs = {
			Result:Number,
		};

		// Handle all input port here
		var inputs = node.inputs = {
			Exec: Blackprint.PortTrigger(function(){
				node.outputs.Result = multiply();
				console.log("Result has been set:", node.outputs.Result);
			}),
			A: Number,
			B: Blackprint.PortValidator(Number, function(val){
				// Executed when inputs.B is being obtained
				// And the output from other node is being assigned
				// as current port value in this node
				console.log(iface.title, '- Port B got input:', val);
				return Number(val);
			}),
		};

		// Your own processing mechanism
		function multiply(){
			console.log('Multiplying', inputs.A, 'with', inputs.B);
			return inputs.A * inputs.B;
		}

		// When any output value from other node are updated
		// Let's immediately change current node result
		node.update = function(cable){
			node.outputs.Result = multiply();
		}

		// Event listener can only be registered after handle init
		node.init = function(){
			iface.on('cable.connect', function(port1, port2){
				console.log(`Cable connected from ${port1.iface.title} (${port1.name}) to ${port2.iface.title} (${port2.name})`);
			});
		}
	});

	Engine.registerNode('example/math/random', function(node, iface){
		iface.title = "Random";
		iface.description = "Number (0-100)";

		// Let's use default node interface

		node.outputs = {
			Out:Number
		};

		var executed = false;
		node.inputs = {
			'Re-seed':Blackprint.PortTrigger(function(){
				executed = true;
				node.outputs.Out = Math.round(Math.random()*100);
			})
		};

		// When the connected node is requesting for the output value
		node.request = function(port, iface2){
			// Only run once this node never been executed
			// Return false if no value was changed
			if(executed === true)
				return false;

			console.warn('Value request for port:', port.name, "from node:", iface2.title);

			// Let's create the value for him
			node.inputs['Re-seed']();
		}
	});

	Engine.registerNode('example/display/logger', function(node, iface){
		iface.title = "Logger";
		iface.description = 'Print anything into text';

		// Let's use ../nodes/logger.js
		iface.interface = 'nodes/logger';

		node.inputs = {
			Any: Blackprint.PortArrayOf(null) // Any data type, and can be used for many cable
		};

		function refreshLogger(val){
			if(val === null)
				iface.log = 'null';
			else if(val === void 0)
				iface.log = 'undefined';
			else if(val.constructor === Function)
				iface.log = val.toString();
			else if(val.constructor === String || val.constructor === Number)
				iface.log = val;
			else
				iface.log = JSON.stringify(val);
		}

		node.init = function(){
			// Let's show data after new cable was connected or disconnected
			iface.on('cable.connect cable.disconnect', function(){
				console.log("A cable was changed on Logger, now refresing the input element");
				refreshLogger(node.inputs.Any);
			});

			iface.inputs.Any.on('value', function(port){
				console.log("I connected to", port.name, "port from", port.iface.title, "that have new value:", port.value);

				// Let's take all data from all connected nodes
				// Instead showing new single data-> val
				refreshLogger(node.inputs.Any);
			});
		}
	});

	Engine.registerNode('example/button/simple', function(node, iface){
		// node = under ScarletsFrame element control
		iface.title = "Button";

		// Let's use ../nodes/button.js
		iface.interface = 'nodes/button';

		// node = under Blackprint node flow control
		node.outputs = {
			Clicked:Function
		};

		// Proxy event object from: node.clicked -> node.clicked -> outputs.Clicked
		node.clicked = function(ev){
			console.log('button/simple: got', ev, "time to trigger to the other node");
			node.outputs.Clicked(ev);
		}
	});

	Engine.registerNode('example/input/simple', function(node, iface){
		// iface = under ScarletsFrame element control
		iface.title = "Input";

		// Let's use ../nodes/input.js
		iface.interface = 'nodes/input';

		// node = under Blackprint node flow control
		node.outputs = {
			Changed:Function,
			Value:String, // Default to empty string
		};

		iface.options = {
			value:'...'
		};

		// Bring value from imported node to handle output
		node.imported = function(options){
			console.warn("Old options:", JSON.stringify(iface.options));
			console.warn("Imported options:", JSON.stringify(options));

			iface.options = options;
			node.outputs.Value = options.value;
		}

		// Proxy string value from: node.changed -> node.changed -> outputs.Value
		// And also call outputs.Changed() if connected to other node
		node.changed = function(text, ev){
			// This node still being imported
			if(iface.importing !== false)
				return;

			console.log('The input box have new value:', text);

			// node.options.value === text;
			node.outputs.Value = iface.options.value;

			// This will call every connected node
			node.outputs.Changed();
		}
	});

	// Does nothing :3
	Engine.registerNode('example/dummy/test', function(node, iface){
		iface.title = "Do nothing";

		// PortName must different any port
		node.inputs = {
			"Input 1":Boolean,
			"Input 2":String
		};

		node.outputs = {
			"Output 1":Object,
			"Output 2":Number
		};

		node.properties = {
			"Property 1":Boolean,
			"Property 2":Number
		};
	});

// === Import JSON after all nodes was registered ===
// You can import this to Blackprint Sketch if you want to view the nodes visually
instance.importJSON('{"example/math/random":[{"id":0,"x":298,"y":73,"outputs":{"Out":[{"id":2,"name":"A"}]}},{"id":1,"x":298,"y":239,"outputs":{"Out":[{"id":2,"name":"B"}]}}],"example/math/multiply":[{"id":2,"x":525,"y":155,"outputs":{"Result":[{"id":3,"name":"Any"}]}}],"example/display/logger":[{"id":3,"x":763,"y":169}],"example/button/simple":[{"id":4,"x":41,"y":59,"outputs":{"Clicked":[{"id":2,"name":"Exec"}]}}],"example/input/simple":[{"id":5,"x":38,"y":281,"options":{"value":"saved input"},"outputs":{"Changed":[{"id":1,"name":"Re-seed"}],"Value":[{"id":3,"name":"Any"}]}}]}');


// Time to run something :)
var button = instance.getNodes('example/button/simple')[0];

log("\n>> I'm clicking the button");
button.clicked("'An event'");

var logger = instance.getNodes('example/display/logger')[0];
log("\n>> I got the output value:", logger.log);

log("\n>> I'm writing something to the input box");
var input = instance.getNodes('example/input/simple')[0];
input.options.value = 'hello wrold';

var logger = instance.getNodes('example/display/logger')[0];
log("\n>> I got the output value:", logger.log);