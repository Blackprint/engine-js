Blackprint.nodes.BP.Fn = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);
			this.setInterface('BPIC/BP/Fn/Input');
		}
	},
	Output: class extends Blackprint.Node {
		static input = {};
		constructor(instance){
			super(instance);
			this.setInterface('BPIC/BP/Fn/Output');
		}

		update(port, source, cable){
			this.iface._funcMain.node.output[port.name] = cable.value;
		}
	},
};

// used for instance.createFunction
class BPFunction extends CustomEvent {
	constructor(id, options, instance){
		super();

		this.instance = instance;
		this.id = this.title = id;
		this.description = options?.description ?? '';
		this.variables = {}; // shared function variables

		let input = this._input = {};
		let output = this._output = {};
		this.used = [];

		// This will be updated if the function sketch was modified
		this.structure = {
			'BP/Fn/Input':[{x: 400, y: 100}],
			'BP/Fn/Output':[{x: 600, y: 100}],
		};

		let temp = this;
		let uniqId = 0;
		this.node = class extends BPFunctionNode {
			static input = input;
			static output = output;
			static namespace = id;

			constructor(instance){
				super(instance);
				this._funcInstance = temp;

				let iface = this.setInterface("BPIC/BP/Fn/Main");
				iface.description = temp.description;
				iface.title = temp.title;
				iface.type = 'function';
				iface.uniqId = uniqId++;
			}
		};
	}

	createNode(instance, options){
		return instance.createNode(this.node, options);
	}

	get input(){return this._input}
	get output(){return this._output}
	set input(v){throw new Error("Can't modify port by assigning .input property")}
	set output(v){throw new Error("Can't modify port by assigning .input property")}

	createPort(){}
	renamePort(){}
	deletePort(){}
}

class BPFunctionNode extends Blackprint.Node {
	constructor(instance){
		super(instance);
	}

	imported(data){
		let instance = this._funcInstance;
		instance.used.push(this);
	}

	update(port, source, cable){
		// port => input port from current node
		this.iface._FnInput.node.output[port.name] = cable.value;
	}

	destroy(){
		let instance = this._funcInstance;

		let i = instance.used.indexOf(this);
		if(i !== -1) instance.used.splice(i, 1);
	}
}


// ==== Interface ====
// Register when ready
function BPFnInit(){
	Blackprint.registerInterface('BPIC/BP/Fn/Main',
	class extends Blackprint.Interface {
		static input = {};
		static output = {};

		async imported(data){
			if(this._importOnce)
				throw new Error("Can't import function more than once");

			this._importOnce = true;
			let node = this.node;

			if(node._instance.constructor === Blackprint.Engine)
				this.bpInstance = new Blackprint.Engine();
			else this.bpInstance = new Blackprint.Sketch();

			let newInstance = this.bpInstance;
			newInstance.variables = node._instance.variables;
			newInstance.functions = node._instance.functions;

			let {input, output} = this.node._funcInstance;
			for(let key in input)
				node.createPort('input', key, input[key]);

			for(let key in output)
				node.createPort('output', key, output[key]);

			await this.bpInstance.importJSON(this.node._funcInstance.structure);

			let debounce;
			this.bpInstance.on('cable.connect cable.disconnect node.created node.delete', ()=>{
				clearTimeout(debounce);
				debounce = setTimeout(() => {
					let structure = this.bpInstance.exportJSON({toRawObject: true});
					this.node._funcInstance.structure = structure;
				}, 1000);
			});

			let In = this._FnInput = this.bpInstance.getNodes("BP/Fn/Input")[0].iface;
			let Out = this._FnOutput = this.bpInstance.getNodes("BP/Fn/Output")[0].iface;
			Out._funcMain = In._funcMain = this;
		}
	});

	class BPFnInOut extends Blackprint.Interface {
		useType(port){
			if(port === undefined) throw new Error("Can't set type with undefined");

			let cable;
			if(port === true){
				cable = this.$space('cables').currentCable;
				if(cable == null) return;
			}

			if(port instanceof Blackprint.Engine.Cable)
				cable = port;

			if(cable != null)
				port = cable.owner;

			let name = port.name;
			let outputPort;
			let portType = port.feature != null ? port.feature(port.type) : port.type;

			let nodeA, nodeB; // Main (input) -> Input (output), Output (input) -> Main (output)
			if(this.type === 'bp-fn-input'){ // Main (input) -> Input (output)
				let inc = 1;
				while(name in this.output){
					if(name + inc in this.output) inc++;
					else {
						name += inc;
						break;
					}
				}

				nodeA = this._funcMain.node;
				nodeB = this.node;
			}
			else { // Output (input) -> Main (output)
				let inc = 1;
				while(name in this.input){
					if(name + inc in this.input) inc++;
					else {
						name += inc;
						break;
					}
				}

				nodeA = this.node;
				nodeB = this._funcMain.node;
			}

			outputPort = nodeB.createPort('output', name, portType);

			let inputPort;
			if(portType === Function || portType.prototype instanceof Function)
				inputPort = nodeA.createPort('input', name, Blackprint.Port.Trigger(outputPort._callAll));
			else inputPort = nodeA.createPort('input', name, portType);

			if(cable != null){
				if(this.type === 'bp-fn-input')
					outputPort.connectCable(cable);
				else inputPort.connectCable(cable);
			}
		}
	}

	Blackprint.registerInterface('BPIC/BP/Fn/Input',
	class extends BPFnInOut {
		static output = {};
		constructor(node){
			super(node);
			this.title = 'Input';
			this.type = 'bp-fn-input';
		}
	});

	Blackprint.registerInterface('BPIC/BP/Fn/Output',
	class extends BPFnInOut {
		static input = {};
		constructor(node){
			super(node);
			this.title = 'Output';
			this.type = 'bp-fn-output';
		}
	});
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPFnInit);
else BPFnInit();