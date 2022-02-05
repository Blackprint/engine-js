// This is just an example, using self registration without URL module
// Please use init.mjs instead of init.js

// For Deno
// import Blackprint from './../dist/engine.es6.js';
// import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.6';

// For Node
var Blackprint = require('./../dist/engine.min.js');
// var Blackprint = require('@blackprint/engine');

// Run from your CLI
// deno run init.js
// node init.js

// These comment can be collapsed depend on your IDE

// === Register Node Interface ===
	// When creating your own interface please use specific interface naming if possible
	// 'BPIC/LibraryName/FeatureName/NodeName'

	// Example below is using 'i-' to make it easier to understand
	Blackprint.registerInterface('BPIC/i-button', class extends Blackprint.Interface {
		// Will be used for 'Example/Button/Simple' node
		clicked(ev){
			console.log("Engine: 'Trigger' button clicked, going to run the handler");
			this.node.clicked && this.node.clicked(ev);
		}
	});

	Blackprint.registerInterface('BPIC/i-input', class extends Blackprint.Interface {
		constructor(node){
			super(node);

			let iface = this;

			let theValue = '...';
			this.data = {
				get value(){ return theValue },
				set value(val){
					theValue = val;

					if(iface.node.changed !== void 0)
						iface.node.changed(val);
				},
			};
		}
	});

	// You can use class and use getter/setter to improve performance and memory efficiency
	Blackprint.registerInterface('BPIC/i-logger', class extends Blackprint.Interface {
		get log(){ return this._log }
		set log(val){
			this._log = val;
			console.log("Logger:", val);
		}
	});

// Mask the console color, to separate the console.log call from Register Node Handler
	var log = console.log;
	console.log = console.warn = function(){
		log('\x1b[33m%s\x1b[0m', Array.from(arguments).join(' ')); // Turn it into green
	}

// === Register Node Handler ===
	Blackprint.registerNode('Example/Math/Multiply', class extends Blackprint.Node {
		// Handle all output port here
		static output = {
			Result:Number,
		};

		// Handle all input port here
		static input = {
			Exec: Blackprint.Port.Trigger(function(){
				this.output.Result = this.multiply();
				console.log("Result has been set:", this.output.Result);
			}),
			A: Number,
			B: null,
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface(); // Let's use default node interface
			iface.title = "Multiply";
		}

		// Event listener can only be registered after/when init
		init(){
			let iface = this.iface;

			iface.on('cable.connect', function({port, target}){
				console.log(`Cable connected from ${port.iface.title} (${port.name}) to ${target.iface.title} (${target.name})`);
			});
		}

		// When any output value from other node are updated
		// Let's immediately change current node result
		update(cable){
			this.output.Result = this.multiply();
		}

		// Your own processing mechanism
		multiply(){
			let input = this.input;
			console.log('Multiplying', input.A, 'with', input.B);

			return input.A * input.B;
		}
	});

	Blackprint.registerNode('Example/Math/Random', class extends Blackprint.Node {
		executed = false;

		static output = { Out:Number };
		static input = {
			'Re-seed':Blackprint.Port.Trigger(function(){
				this.executed = true;
				this.output.Out = Math.round(Math.random()*100);
			})
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface(); // Let's use default node interface
			iface.title = "Random";
			iface.description = "Number (0-100)";
		}

		// When the connected node is requesting for the output value
		request(port, iface2){
			// Only run once this node never been executed
			// Return false if no value was changed
			if(this.executed === true)
				return false;

			console.warn('Value request for port:', port.name, "from node:", iface2.title);

			// Let's create the value for him
			this.input['Re-seed']();
		}
	});

	Blackprint.registerNode('Example/Display/Logger', class extends Blackprint.Node {
		static input = {
			Any: Blackprint.Port.ArrayOf(null) // Any data type, and can be used for many cable
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/i-logger');
			iface.title = "Logger";
			iface.description = 'Print anything into text';
		}

		init(){
			let node = this;
			let iface = this.iface;

			function refreshLogger(val){
				iface.log = JSON.stringify(val);
			}

			// Let's show data after new cable was connected or disconnected
			iface.on('cable.connect cable.disconnect', function(){
				console.log("A cable was changed on Logger, now refresing the input element");
				refreshLogger(node.input.Any);
			});

			iface.input.Any.on('value', function({ target }){
				console.log("I connected to", target.name, "target from", target.iface.title, "that have new value:", target.value);

				// Let's take all data from all connected nodes
				// Instead showing new single data-> val
				refreshLogger(node.input.Any);
			});
		}
	});

	Blackprint.registerNode('Example/Button/Simple', class extends Blackprint.Node {
		static output = { Clicked: Function };

		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/i-button');
			iface.title = "Button";
		}

		// Proxy event object from: node.clicked -> node.clicked -> output.Clicked
		clicked(ev){
			console.log('button/Simple: got', ev, "time to trigger to the other node");
			this.output.Clicked(ev);
		}
	});

	Blackprint.registerNode('Example/Input/Simple', class extends Blackprint.Node {
		static output = {
			Changed: Function,
			Value: String, // Default to empty string
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/i-input');
			iface.title = "Input";

			iface.data = { value: '...' };
		}

		// Bring value from imported node to handle output
		imported(data){
			let iface = this.iface;

			console.warn("Old data:", JSON.stringify(iface.data));
			console.warn("Imported data:", JSON.stringify(data));

			iface.data = data;
			this.output.Value = data.value;
		}

		// Proxy string value from: node.changed -> node.changed -> output.Value
		// And also call output.Changed() if connected to other node
		changed(text, ev){
			let iface = this.iface;

			// This node still being imported
			if(iface.importing !== false)
				return;

			console.log('The input box have new value:', text);

			// node.data.value === text;
			this.output.Value = iface.data.value;

			// This will call every connected node
			this.output.Changed();
		}
	});

// === Import JSON after all nodes was registered ===
// You can import this to Blackprint Sketch if you want to view the nodes visually
!async function(){
	let instance = new Blackprint.Engine();

	await instance.importJSON('{"Example/Math/Random":[{"i":0,"x":298,"y":73,"output":{"Out":[{"i":2,"name":"A"}]}},{"i":1,"x":298,"y":239,"output":{"Out":[{"i":2,"name":"B"}]}}],"Example/Math/Multiply":[{"i":2,"x":525,"y":155,"output":{"Result":[{"i":3,"name":"Any"}]}}],"Example/Display/Logger":[{"i":3,"id":"myLogger","x":763,"y":169}],"Example/Button/Simple":[{"i":4,"id":"myButton","x":41,"y":59,"output":{"Clicked":[{"i":2,"name":"Exec"}]}}],"Example/Input/Simple":[{"i":5,"id":"myInput","x":38,"y":281,"data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":3,"name":"Any"}]}}]}');

	// Time to run something :)
	var button = instance.iface.myButton;

	log("\n>> I'm clicking the button");
	button.clicked("'An event'");

	var logger = instance.iface.myLogger;
	log("\n>> I got the output value:", logger.log);

	log("\n>> I'm writing something to the input box");
	var input = instance.iface.myInput;
	input.data.value = 'hello wrold';

	// you can also use getNodes if you haven't set the ID
	logger = instance.getNodes('Example/Display/Logger')[0].iface;
	log("\n>> I got the output value:", logger.log);
}();