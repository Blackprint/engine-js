// This is just an example, using self registration without URL module
// Please use init.mjs instead of init.js

// For Deno
// import Blackprint from './../dist/engine.es6.js';
// import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.6';

// For Node
var Blackprint = require('./../../dist/engine.min.js');
// var Blackprint = require('@blackprint/engine');

// Run from your CLI
// deno run init.js
// node init.js

// These comment can be collapsed depend on your IDE

// === Register Node Interface ===
	// When creating your own interface please use specific interface naming if possible
	// 'BPIC/LibraryName/FeatureName/NodeName'

	Blackprint.registerInterface('BPIC/Example/Button', class extends Blackprint.Interface {
		// Will be used for 'Example/Button/Simple' node
		clicked(ev){
			console.log("Button/Simple: 'Trigger' button clicked");
			this.node.output.Clicked();
		}
	});

	Blackprint.registerInterface('BPIC/Example/Input', class extends Blackprint.Interface {
		constructor(node){
			super(node);

			let iface = this;

			let theValue = '...';
			this.data = {
				get value(){ return theValue },
				set value(val){
					theValue = val;
					iface.changed(val);
				},
			};
		}

		// Proxy string value from: data.value(setter) -> iface.changed -> output.Value
		// And also call output.Changed() if connected to other node
		changed(text, ev){
			let node = this.node;

			// This node still being imported
			if(this.importing !== false)
				return;

			console.log('Input/Simple: The input box have new value:', text);

			// node.data.value === text;
			node.output.Value = this.data.value;
			// node.syncOut('data', {value: this.data.value});

			// This will call every connected node
			node.output.Changed();
		}
	});

	// You can use class and use getter/setter to improve performance and memory efficiency
	Blackprint.registerInterface('BPIC/Example/Logger', class extends Blackprint.Interface {
		get log(){ return this._log }
		set log(val){
			this._log = val;
			console.log("Example/Logger log:", val);
		}
	});

// Mask the console color, to separate the console.log call from Register Node Handler
	var log = console.log;
	console.log = console.warn = function(){
		log('\x1b[33m%s\x1b[0m', Array.from(arguments).join(' ')); // Turn it into green
	}

// === Register Node Handler ===
	Blackprint.registerNode('Example/Math/Multiply', class extends Blackprint.Node {
		// Define output port here
		static output = {
			Result:Number,
		};

		// Define input port here
		static input = {
			Exec: Blackprint.Port.Trigger(function(){
				this.output.Result = this.multiply();
				console.log("Math/Multiply: Result has been set:", this.output.Result);
			}),
			A: Number,
			B: Blackprint.Types.Any,
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
				console.log(`Math/Multiply: Cable connected from ${port.iface.title} (${port.name}) to ${target.iface.title} (${target.name})`);
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

			console.log('Math/Multiply: Multiplying', input.A, 'with', input.B);
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
		request(cable){
			// Only run once this node never been executed
			// Return false if no value was changed
			if(this.executed === true)
				return false;

			console.warn('Math/Random: Value request for port:', cable.output.name, "from node:", cable.input.iface.title);

			// Let's create the value for him
			this.input['Re-seed']();
		}
	});

	Blackprint.registerNode('Example/Display/Logger', class extends Blackprint.Node {
		static input = {
			Any: Blackprint.Port.ArrayOf(Blackprint.Types.Any) // Can be used for many cable
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/Example/Logger');
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
				console.log("Display/Logger: A cable was changed on Logger, now refresing the input element");
				refreshLogger(node.input.Any);
			});

			iface.input.Any.on('value', function({ target }){
				console.log("Display/Logger: I connected to", target.name, "target from", target.iface.title, "that have new value:", target.value);

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

			let iface = this.setInterface('BPIC/Example/Button');
			iface.title = "Button";
		}
	});

	Blackprint.registerNode('Example/Input/Simple', class extends Blackprint.Node {
		static output = {
			Changed: Function,
			Value: String, // Default to empty string
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/Example/Input');
			iface.title = "Input";

			iface.data = { value: '...' };
		}

		// Bring value from imported node to handle output
		imported(data){
			let iface = this.iface;

			console.warn("Input/Simple: Old data:", JSON.stringify(iface.data));
			console.warn("Input/Simple: Imported data:", JSON.stringify(data));

			iface.data = data;
			this.output.Value = data.value;
		}
	});

// === Import JSON after all nodes was registered ===
// You can import this to Blackprint Sketch if you want to view the nodes visually
!async function(){
	let instance = new Blackprint.Engine();

	// await instance.importJSON('{"_":{"moduleJS":[],"functions":{"Test":{"id":"Test","title":"Test","description":"No description","vars":["shared"],"privateVars":["private"],"structure":{"BP/Fn/Input":[{"i":0,"x":389,"y":100,"z":3,"output":{"A":[{"i":2,"name":"A"}],"Exec":[{"i":2,"name":"Exec"}]}}],"BP/Fn/Output":[{"i":1,"x":973,"y":228,"z":14}],"Example/Math/Multiply":[{"i":2,"x":656,"y":99,"z":8,"output":{"Result":[{"i":3,"name":"Val"},{"i":9,"name":"Val"}]}},{"i":10,"x":661,"y":289,"z":4,"output":{"Result":[{"i":5,"name":"Val"},{"i":1,"name":"Result1"}]}}],"BP/Var/Set":[{"i":3,"x":958,"y":142,"z":9,"data":{"name":"shared","scope":2}},{"i":5,"x":971,"y":333,"z":2,"data":{"name":"private","scope":1},"route":{"i":1}}],"BP/Var/Get":[{"i":4,"x":387,"y":461,"z":5,"data":{"name":"shared","scope":2},"output":{"Val":[{"i":8,"name":"Any"}]}},{"i":6,"x":389,"y":524,"z":0,"data":{"name":"private","scope":1},"output":{"Val":[{"i":8,"name":"Any"}]}}],"BP/FnVar/Input":[{"i":7,"x":387,"y":218,"z":7,"data":{"name":"B"},"output":{"Val":[{"i":2,"name":"B"}]}},{"i":11,"x":386,"y":301,"z":6,"data":{"name":"Exec"},"output":{"Val":[{"i":10,"name":"Exec"}]}},{"i":12,"x":386,"y":370,"z":10,"data":{"name":"A"},"output":{"Val":[{"i":10,"name":"A"},{"i":10,"name":"B"}]}}],"Example/Display/Logger":[{"i":8,"x":661,"y":474,"z":11}],"BP/FnVar/Output":[{"i":9,"x":956,"y":69,"z":1,"data":{"name":"Result"}},{"i":14,"x":969,"y":629,"z":13,"data":{"name":"Clicked"}}],"Example/Button/Simple":[{"i":13,"x":634,"y":616,"z":12,"output":{"Clicked":[{"i":14,"name":"Val"}]}}]}}}},"Example/Math/Random":[{"i":0,"x":512,"y":76,"z":0,"output":{"Out":[{"i":5,"name":"A"}]},"route":{"i":5}},{"i":1,"x":512,"y":242,"z":1,"output":{"Out":[{"i":5,"name":"B"}]}}],"Example/Display/Logger":[{"i":2,"x":986,"y":282,"z":2,"id":"myLogger"}],"Example/Button/Simple":[{"i":3,"x":244,"y":64,"z":6,"id":"myButton","output":{"Clicked":[{"i":5,"name":"Exec"}]}}],"Example/Input/Simple":[{"i":4,"x":238,"y":279,"z":4,"id":"myInput","data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":2,"name":"Any"}]}}],"BPI/F/Test":[{"i":5,"x":738,"y":138,"z":5,"output":{"Result1":[{"i":2,"name":"Any"}],"Result":[{"i":2,"name":"Any"}],"Clicked":[{"i":6,"name":"Exec"}]},"route":{"i":6}}],"Example/Math/Multiply":[{"i":6,"x":1032,"y":143,"z":3}]}');
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