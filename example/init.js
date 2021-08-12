// For Deno
// import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.1.0';
// import Blackprint from '../dist/engine.es6.js';

// For Node
// var Blackprint = require('@blackprint/engine');
var Blackprint = require('../dist/engine.js');

// These comment can be collapsed depend on your IDE

// === Register Node Interface ===
	// When creating your own interface please use specific interface naming
	// 'LibraryName/FeatureName/NodeName'
	// Example below is using 'i-' to make it easier to understand
	Blackprint.registerInterface('i-button', function(iface){
		// Will be used for 'Example/Button/Simple' node
		iface.clicked = function(ev){
			console.log("Engine: 'Trigger' button clicked, going to run the handler");
			iface.node.clicked && iface.node.clicked(ev);
		}
	});

	Blackprint.registerInterface('i-input', function(iface, bind){
		var theValue = '';
		bind({
			data:{
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

	Blackprint.registerInterface('i-logger', function(iface, bind){
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
// https://github.com/Blackprint/blackprint.github.io/blob/master/src/js/register-handler.js
	Blackprint.registerNode('Example/Math/Multiply', function(node, iface){
		iface.title = "Multiply";
		// iface.interface = undefined; // Let's use default node interface

		// Handle all output port here
		node.output = {
			Result:Number,
		};

		// Handle all input port here
		var input = node.input = {
			Exec: Blackprint.PortTrigger(function(){
				node.output.Result = multiply();
				console.log("Result has been set:", node.output.Result);
			}),
			A: Number,
			B: Blackprint.PortValidator(Number, function(val){
				// Executed when input.B is being obtained
				// And the output from other node is being assigned
				// as current port value in this node
				console.log(iface.title, '- Port B got input:', val);
				return Number(val);
			}),
		};

		// Your own processing mechanism
		function multiply(){
			console.log('Multiplying', input.A, 'with', input.B);
			return input.A * input.B;
		}

		// When any output value from other node are updated
		// Let's immediately change current node result
		node.update = function(cable){
			node.output.Result = multiply();
		}

		// Event listener can only be registered after handle init
		node.init = function(){
			iface.on('cable.connect', function(port1, port2){
				console.log(`Cable connected from ${port1.iface.title} (${port1.name}) to ${port2.iface.title} (${port2.name})`);
			});
		}
	});

	Blackprint.registerNode('Example/Math/Random', function(node, iface){
		iface.title = "Random";
		iface.description = "Number (0-100)";

		// iface.interface = undefined; // Let's use default node interface

		node.output = {
			Out:Number
		};

		var executed = false;
		node.input = {
			'Re-seed':Blackprint.PortTrigger(function(){
				executed = true;
				node.output.Out = Math.round(Math.random()*100);
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
			node.input['Re-seed']();
		}
	});

	Blackprint.registerNode('Example/Display/Logger', function(node, iface){
		iface.title = "Logger";
		iface.description = 'Print anything into text';

		// Let's use ../nodes/Logger.js
		iface.interface = 'i-logger';

		node.input = {
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
				refreshLogger(node.input.Any);
			});

			iface.input.Any.on('value', function(port){
				console.log("I connected to", port.name, "port from", port.iface.title, "that have new value:", port.value);

				// Let's take all data from all connected nodes
				// Instead showing new single data-> val
				refreshLogger(node.input.Any);
			});
		}
	});

	Blackprint.registerNode('Example/Button/Simple', function(node, iface){
		// node = under ScarletsFrame element control
		iface.title = "Button";

		// Let's use ../Nodes/Button.js
		iface.interface = 'i-button';

		// node = under Blackprint node flow control
		node.output = {
			Clicked:Function
		};

		// Proxy event object from: node.clicked -> node.clicked -> output.Clicked
		node.clicked = function(ev){
			console.log('button/Simple: got', ev, "time to trigger to the other node");
			node.output.Clicked(ev);
		}
	});

	Blackprint.registerNode('Example/Input/Simple', function(node, iface){
		// iface = under ScarletsFrame element control
		iface.title = "Input";

		// Let's use ../nodes/input.js
		iface.interface = 'i-input';

		// node = under Blackprint node flow control
		node.output = {
			Changed:Function,
			Value:String, // Default to empty string
		};

		iface.data = {
			value:'...'
		};

		// Bring value from imported node to handle output
		node.imported = function(data){
			console.warn("Old data:", JSON.stringify(iface.data));
			console.warn("Imported data:", JSON.stringify(data));

			iface.data = data;
			node.output.Value = data.value;
		}

		// Proxy string value from: node.changed -> node.changed -> output.Value
		// And also call output.Changed() if connected to other node
		node.changed = function(text, ev){
			// This node still being imported
			if(iface.importing !== false)
				return;

			console.log('The input box have new value:', text);

			// node.data.value === text;
			node.output.Value = iface.data.value;

			// This will call every connected node
			node.output.Changed();
		}
	});

// === Import JSON after all nodes was registered ===
// You can import this to Blackprint Sketch if you want to view the nodes visually
!async function(){
	let instance = new Blackprint.Engine();

	await instance.importJSON('{"Example/Math/Random":[{"i":0,"x":298,"y":73,"output":{"Out":[{"i":2,"name":"A"}]}},{"i":1,"x":298,"y":239,"output":{"Out":[{"i":2,"name":"B"}]}}],"Example/Math/Multiply":[{"i":2,"x":525,"y":155,"output":{"Result":[{"i":3,"name":"Any"}]}}],"Example/Display/Logger":[{"i":3,"x":763,"y":169}],"Example/Button/Simple":[{"i":4,"x":41,"y":59,"output":{"Clicked":[{"i":2,"name":"Exec"}]}}],"Example/Input/Simple":[{"i":5,"x":38,"y":281,"data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":3,"name":"Any"}]}}]}');

	// Time to run something :)
	var button = instance.getNodes('Example/Button/Simple')[0].iface;

	log("\n>> I'm clicking the button");
	button.clicked("'An event'");

	var logger = instance.getNodes('Example/Display/Logger')[0].iface;
	log("\n>> I got the output value:", logger.log);

	log("\n>> I'm writing something to the input box");
	var input = instance.getNodes('Example/Input/Simple')[0].iface;
	input.data.value = 'hello wrold';

	var logger = instance.getNodes('Example/Display/Logger')[0].iface;
	log("\n>> I got the output value:", logger.log);
}();