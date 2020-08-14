// For Deno
import 'https://cdn.jsdelivr.net/npm/blackprint-interpreter@0.0.3';
const Interpreter = Blackprint.Interpreter;

// For Node
// var Blackprint = require('blackprint-interpreter');
// var Blackprint = require('../dist/interpreter.js');

var instance = new Interpreter();
// These comment can be collapsed depend on your IDE

// === Register Node Interface ===
	Interpreter.registerInterface('button', function(self){
		self.clicked = function(ev){
			console.log("Interpreter: 'Trigger' button clicked, going to run the handler");
			self.handle.clicked && self.handle.clicked(ev);
		}
	});

	Interpreter.registerInterface('input', function(self, bind){
		var theValue = '';
		bind({
			options:{
				set value(val){
					theValue = val;

					if(self.handle.changed !== void 0)
						self.handle.changed(val);
				},
				get value(){
					return theValue;
				}
			}
		});
	});

	Interpreter.registerInterface('logger', function(self, bind){
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
	Interpreter.registerNode('math/multiply', function(handle, node){
		node.title = "Multiply";
		var inputs = handle.inputs = {
			Exec: function(){
				handle.outputs.Result = multiply();
				console.log("Result has been set:", handle.outputs.Result);
			},
			A: Number,
			B: Blackprint.PortValidator(Number, function(val){
				// Executed when inputs.B is being obtained
				// And the output from other node is being assigned
				// as current port value in this node
				console.log(node.title, '- Port B got input:', val);
				return Number(val);
			}),
		};

		// Your own processing mechanism
		function multiply(){
			console.log('Multiplying', inputs.A, 'with', inputs.B);
			return inputs.A * inputs.B;
		}

		handle.outputs = {
			Result:Number,
		};

		// Event listener can only be registered after init
		handle.init = function(){
			node.on('cable.connect', function(cable){
				console.log(`Cable connected from ${cable.owner.node.title} (${cable.owner.name}) to ${cable.target.node.title} (${cable.target.name})`);
			});
		}

		// When any output value from other node are updated
		// Let's immediately change current node result
		handle.update = function(cable){
			handle.outputs.Result = multiply();
		}
	});

	Interpreter.registerNode('math/random', function(handle, node){
		node.title = "Random";
		node.description = "Number (0-100)";

		handle.outputs = {
			Out:Number
		};

		var executed = false;
		handle.inputs = {
			'Re-seed':function(){
				executed = true;
				handle.outputs.Out = Math.round(Math.random()*100);
			}
		};

		// When the connected node is requesting for the output value
		handle.request = function(port, node){
			// Only run once this node never been executed
			// Return false if no value was changed
			if(executed === true)
				return false;

			console.warn('Value request for port:', port.name, "from node:", node.title);

			// Let's create the value for him
			handle.inputs['Re-seed']();
		}
	});

	Interpreter.registerNode('display/logger', function(handle, node){
		node.title = "Logger";
		node.type = 'logger';
		node.description = 'Print anything into text';
		node.trigger = false;

		handle.inputs = {
			Any: Blackprint.PortListener(function(port, val){
				console.log("I connected to", port.name, "port from", port.node.title, "that have new value:", val);

				// Let's take all data from all connected nodes
				// Instead showing new single data-> val
				refreshLogger(handle.inputs.Any);
			})
		};

		function refreshLogger(val){
			if(val === null)
				node.log = 'null';
			else if(val === void 0)
				node.log = 'undefined';
			else if(val.constructor === Function)
				node.log = val.toString();
			else if(val.constructor === String || val.constructor === Number)
				node.log = val;
			else
				node.log = JSON.stringify(val);
		}

		handle.init = function(){
			// Let's show data after new cable was connected or disconnected
			node.on('cable.connect cable.disconnect', function(){
				console.log("A cable was changed on Logger, now refresing the input element");
				refreshLogger(handle.inputs.Any);
			});
		}
	});

	Interpreter.registerNode('button/simple', function(handle, node){
		// node = under ScarletsFrame element control
		node.title = "Button";
		node.type = 'button';

		// handle = under Blackprint node flow control
		handle.outputs = {
			Clicked:Function
		};

		// Proxy event object from: node.clicked -> handle.clicked -> outputs.Clicked
		handle.clicked = function(ev){
			console.log('button/simple: got', ev, "time to trigger to the other node");
			handle.outputs.Clicked(ev);
		}
	});

	Interpreter.registerNode('input/simple', function(handle, node){
		// node = under ScarletsFrame element control
		node.title = "Input";
		node.type = 'input';

		// handle = under Blackprint node flow control
		handle.outputs = {
			Changed:Function,
			Value:'', // Default to empty string
		};

		// Bring value from imported node to handle output
		handle.imported = function(){
			if(node.options.value)
				console.log("Saved options as outputs:", node.options.value);

			handle.outputs.Value = node.options.value;
		}

		// Proxy string value from: node.changed -> handle.changed -> outputs.Value
		// And also call outputs.Changed() if connected to other node
		handle.changed = function(text, ev){
			// This node still being imported
			if(node.importing !== false)
				return;

			console.log('The input box have new value:', text);
			handle.outputs.Value = text;

			// This will call every connected node
			handle.outputs.Changed();
		}
	});

// === Import JSON after all nodes was registered ===
// You can import this to Blackprint Sketch if you want to view the nodes visually
instance.importJSON('{"math/random":[{"id":0,"x":298,"y":73,"outputs":{"Out":[{"id":2,"name":"A"}]}},{"id":1,"x":298,"y":239,"outputs":{"Out":[{"id":2,"name":"B"}]}}],"math/multiply":[{"id":2,"x":525,"y":155,"outputs":{"Result":[{"id":3,"name":"Any"}]}}],"display/logger":[{"id":3,"x":763,"y":169}],"button/simple":[{"id":4,"x":41,"y":59,"outputs":{"Clicked":[{"id":2,"name":"Exec"}]}}],"input/simple":[{"id":5,"x":38,"y":281,"options":{"value":"saved input"},"outputs":{"Changed":[{"id":1,"name":"Re-seed"}],"Value":[{"id":3,"name":"Any"}]}}]}');


// Time to run something :)
var button = instance.getNodes('button/simple')[0];

log("\n>> I'm clicking the button");
button.clicked();

var logger = instance.getNodes('display/logger')[0];
log("\n>> I got the output value:", logger.log);

log("\n>> I'm writing something to the input box");
var input = instance.getNodes('input/simple')[0];
input.options.value = 'hello wrold';

var logger = instance.getNodes('display/logger')[0];
log("\n>> I got the output value:", logger.log);