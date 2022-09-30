// This is just an example, using self registration without URL module
// Please use init.mjs instead of init.js

// For Deno
// import Blackprint from './../dist/engine.es6.js';
// import Blackprint from 'https://cdn.skypack.dev/@blackprint/engine@0.6';

// For Node
require('source-map-support').install();
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
					iface.node.routes.routeOut();
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
			node.syncOut('data', {value: this.data.value});

			// This will call every connected node
			node.output.Changed();
		}
	});

	// You can use class and use getter/setter to improve performance and memory efficiency
	Blackprint.registerInterface('BPIC/Example/Logger', class extends Blackprint.Interface {
		get log(){ return this._log }
		set log(val){
			this._log = val;
			console.log("Logger ("+(this.id || '')+") Data:", val);
			this.node.syncOut('log', val);
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
			Exec: Blackprint.Port.Trigger(function({ iface }){
				let node = iface.node;
				node.output.Result = node.multiply();
				console.log("Math/Multiply: Result has been set:", node.output.Result);

				if(iface._inactive_ !== false)
					iface._inactive_ = false;
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

			iface._inactive_ = true;
		}

		// When any output value from other node are updated
		// Let's immediately change current node result
		update(cable){
			if(this.iface._inactive_) return;
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
			'Re-seed':Blackprint.Port.Trigger(function({ iface: { node } }){
				node.executed = true;
				node.output.Out = Math.round(Math.random()*100);
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
			if(this.executed === true) return false;

			console.warn('Math/Random: Value request for port:', cable.output.name, "from node:", cable.input.iface.title);

			// Let's create the value for him
			this.input['Re-seed']();
		}
	});

	Blackprint.registerNode('Example/Dummy/UpdateTest', class extends Blackprint.Node {
		static input = {
			A1: String,
			A2: String,
		};
	
		static output = {
			B1: String,
			B2: String,
		};
	
		constructor(instance){
			super(instance);
	
			let iface = this.setInterface(); // Let's use default node interface
			iface.title = "Pass data only";
	
			// iface.on('port.value', ({ port, target }) => {
			// 	console.log(port, target);
			// 	if(port.source !== 'input') return;
			// 	this[port.name] = target.value;
			// });
		}
	
		update(){
			let index = this.iface.id || this.instance.ifaceList.indexOf(this.iface);
			// console.error("UpdateTest "+index+"> Updating ports");
	
			// if(this.input.A1 !== this.A1) console.error("A1 from event listener value was mismatched");
			// if(this.input.A2 !== this.A2) console.error("A2 from event listener value was mismatched");
	
			this.output.B1 = this.input.A1;
			this.output.B2 = this.input.A2;
			// console.log("UpdateTest "+index+"> Updated");
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

		_refreshLogger(val){
			if(this.ref.IInput.Any.cables.length > 1)
				this.iface.log = JSON.stringify(val);
			else {
				let val = this.ref.Input.Any?.[0];

				if(val === null)
					this.iface.log = "null";
				else if(val === undefined)
					this.iface.log = "undefined";
				else if(typeof val === 'object')
					this.iface.log = JSON.stringify(val);
				else this.iface.log = val;
			}
		}

		init(){
			// Let's show data after new cable was connected or disconnected
			this.iface.on('cable.disconnect', ()=>{
				console.log("Logger ("+(this.iface.id||'')+"): A cable was changed on Logger, now refresing the input element");
				this.update();
			});

			this.iface.input.Any.on('value', ({ target })=>{
				console.log("Logger ("+(this.iface.id||'')+"): I connected to", target.name, "target from", target.iface.title, "that have new value:", target.value);
			});
		}

		update(){
			let { Input } = this.ref;

			// Let's take all data from all connected nodes
			// Instead showing new single data-> val
			this._refreshLogger(Input.Any);
		}

		// Remote sync in
		syncIn(id, data){
			if(id === 'log') this.iface.log = data;
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
		}

		// Bring value from imported node to handle output
		imported(data){
			let iface = this.iface;

			console.warn("Input/Simple: Old data:", JSON.stringify(iface.data));
			console.warn("Input/Simple: Imported data:", JSON.stringify(data));

			if(data === undefined) return;
	
			// Use object assign to avoid replacing the object reference
			Object.assign(iface.data, data);
			this.output.Value = data.value;
		}

		// Remote sync in
		syncIn(id, data){
			if(id === 'data'){
				Object.assign(this.iface.data, data);
				this.changed();
			}
		}
	});

// === Import JSON after all nodes was registered ===
// You can import this to Blackprint Sketch if you want to view the nodes visually
!async function(){
	let instance = new Blackprint.Engine();

	await instance.importJSON('{"_":{"moduleJS":[],"functions":{"Test":{"id":"Test","title":"Test","description":"No description","vars":["shared"],"privateVars":["private"],"structure":{"BP/Fn/Input":[{"i":0,"x":389,"y":100,"z":3,"output":{"A":[{"i":2,"name":"A"},{"i":15,"name":"Any"}],"Exec":[{"i":2,"name":"Exec"}],"B":[{"i":15,"name":"Any"}]}}],"BP/Fn/Output":[{"i":1,"x":973,"y":228,"z":13,"input_d":{"Result":0}}],"Example/Math/Multiply":[{"i":2,"x":656,"y":99,"z":8,"output":{"Result":[{"i":3,"name":"Val"},{"i":9,"name":"Val"}]}},{"i":10,"x":661,"y":289,"z":4,"output":{"Result":[{"i":5,"name":"Val"},{"i":1,"name":"Result1"}]}}],"BP/Var/Set":[{"i":3,"x":958,"y":142,"z":9,"data":{"name":"shared","scope":2}},{"i":5,"x":971,"y":333,"z":2,"data":{"name":"private","scope":1},"route":{"i":1}}],"BP/Var/Get":[{"i":4,"x":387,"y":461,"z":5,"data":{"name":"shared","scope":2},"output":{"Val":[{"i":8,"name":"Any"}]}},{"i":6,"x":389,"y":524,"z":0,"data":{"name":"private","scope":1},"output":{"Val":[{"i":8,"name":"Any"}]}}],"BP/FnVar/Input":[{"i":7,"x":387,"y":218,"z":7,"data":{"name":"B"},"output":{"Val":[{"i":2,"name":"B"},{"i":16,"name":"Any"}]}},{"i":11,"x":386,"y":301,"z":6,"data":{"name":"Exec"},"output":{"Val":[{"i":10,"name":"Exec"}]}},{"i":12,"x":386,"y":370,"z":10,"data":{"name":"A"},"output":{"Val":[{"i":10,"name":"A"},{"i":10,"name":"B"},{"i":16,"name":"Any"}]}}],"Example/Display/Logger":[{"i":8,"x":661,"y":474,"z":14,"id":"innerFunc","input":{"Any":[{"i":4,"name":"Val"},{"i":6,"name":"Val"}]}},{"i":15,"x":661,"y":196,"z":15,"id":"mul_inner1","input":{"Any":[{"i":0,"name":"A"},{"i":0,"name":"B"}]}},{"i":16,"x":662,"y":385,"z":16,"id":"mul_inner2","input":{"Any":[{"i":12,"name":"Val"},{"i":7,"name":"Val"}]}}],"BP/FnVar/Output":[{"i":9,"x":956,"y":69,"z":1,"data":{"name":"Result"}},{"i":14,"x":969,"y":629,"z":12,"data":{"name":"Clicked"}}],"Example/Button/Simple":[{"i":13,"x":634,"y":616,"z":11,"output":{"Clicked":[{"i":14,"name":"Val"}]}}]}}}},"Example/Math/Random":[{"i":0,"x":512,"y":76,"z":0,"output":{"Out":[{"i":5,"name":"A"},{"i":7,"name":"Any"}]},"route":{"i":7}},{"i":1,"x":512,"y":242,"z":1,"output":{"Out":[{"i":5,"name":"B"},{"i":7,"name":"Any"}]}}],"Example/Display/Logger":[{"i":2,"x":1089,"y":278,"z":5,"id":"myLogger","input":{"Any":[{"i":4,"name":"Value"},{"i":5,"name":"Result1"},{"i":5,"name":"Result"}]}},{"i":7,"x":780,"y":75,"z":3,"id":"mul_outer","route":{"i":5},"input":{"Any":[{"i":0,"name":"Out"},{"i":1,"name":"Out"}]}}],"Example/Button/Simple":[{"i":3,"x":216,"y":134,"z":4,"id":"myButton","output":{"Clicked":[{"i":5,"name":"Exec","parentId":0},{"i":0,"name":"Re-seed"}]},"_cable":{"Clicked":[{"x":670,"y":169,"branch":[{"id":0}]}]}}],"Example/Input/Simple":[{"i":4,"x":238,"y":279,"z":2,"id":"myInput","data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":2,"name":"Any"}]}}],"BPI/F/Test":[{"i":5,"x":777,"y":199,"z":7,"output":{"Result1":[{"i":2,"name":"Any"}],"Result":[{"i":2,"name":"Any"}],"Clicked":[{"i":6,"name":"Exec"}]}}],"Example/Math/Multiply":[{"i":6,"x":1094,"y":157,"z":6,"input_d":{"A":0}}]}');
	// await instance.importJSON('{"Example/Math/Random":[{"i":0,"x":298,"y":73,"z":0,"output":{"Out":[{"i":2,"name":"A"}]}},{"i":1,"x":298,"y":239,"z":1,"output":{"Out":[{"i":2,"name":"B"}]}}],"Example/Math/Multiply":[{"i":2,"x":525,"y":155,"z":2,"output":{"Result":[{"i":3,"name":"Any"}]}}],"Example/Display/Logger":[{"i":3,"x":763,"y":169,"z":3,"id":"myLogger","input":{"Any":[{"i":5,"name":"Value"},{"i":2,"name":"Result"}]}}],"Example/Button/Simple":[{"i":4,"x":41,"y":59,"z":4,"id":"myButton","output":{"Clicked":[{"i":2,"name":"Exec"}]}}],"Example/Input/Simple":[{"i":5,"x":38,"y":281,"z":5,"id":"myInput","data":{"value":"saved input"},"output":{"Changed":[{"i":1,"name":"Re-seed"}],"Value":[{"i":3,"name":"Any"}]}}]}');

	// Time to run something :)
	var button = instance.iface.myButton;

	log("\n>> I'm clicking the button");
	button.clicked("'An event'");

	await instance.executionOrder.onceComplete();

	var logger = instance.iface.myLogger;
	log("\n>> I got the output value:", logger.log);

	log("\n>> I'm writing something to the input box");
	var input = instance.iface.myInput;
	input.data.value = 'hello wrold';

	await instance.executionOrder.onceComplete();

	// you can also use getNodes if you haven't set the ID
	logger = instance.getNodes('Example/Display/Logger')[0].iface;
	log("\n>> I got the output value:", logger.log);
}();