Blackprint.nodes.BP.Fn = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Input');
			iface.enum = _InternalNodeEnum.BPFnInput;
		}
		imported(){
			let funcMain = this.iface._funcMain = this._instance._funcMain;
			let { input } = funcMain.node._funcInstance;

			for(let key in input)
				this.createPort('output', key, input[key]);
		}
	},
	Output: class extends Blackprint.Node {
		static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Output');
			iface.enum = _InternalNodeEnum.BPFnOutput;
		}

		imported(){
			let funcMain = this.iface._funcMain = this._instance._funcMain;
			let { output } = funcMain.node._funcInstance;

			for(let key in output)
				this.createPort('input', key, output[key]);
		}

		update(port, source, cable){
			this.iface._funcMain.node.output[port.name] = cable.value;
		}
	},
};

// used for instance.createFunction
class BPFunction extends CustomEvent { // <= _funcInstance
	constructor(id, options, instance){
		super();

		this.rootInstance = instance; // root instance
		this.id = this.title = id;
		this.description = options?.description ?? '';

		// {name: BPVariable}
		this.variables = {}; // shared between function

		// ['id', ...]
		this.privateVariables = []; // private variable (different from other function)

		let input = this._input = {};
		let output = this._output = {};
		this.used = []; // [Blackprint.Node, ...]

		// This will be updated if the function sketch was modified
		this.structure = options.structure || {
			'BP/Fn/Input':[{x: 400, y: 100}],
			'BP/Fn/Output':[{x: 600, y: 100}],
		};

		let temp = this;
		let uniqId = 0;
		this.node = class extends BPFunctionNode {
			static input = input;
			static output = output;
			static namespace = id;
			static type = 'function';

			constructor(instance){
				super(instance);
				instance._funcInstance = this._funcInstance = temp;

				let iface = this.setInterface("BPIC/BP/Fn/Main");
				iface.description = temp.description;
				iface.title = temp.title;
				iface.type = 'function';
				iface.uniqId = uniqId++;

				iface.enum = _InternalNodeEnum.BPFnMain;
			}

			async init(){
				if(!this.iface._importOnce) await this.iface._BpFnInit();
			}
		};
	}

	createNode(instance, options){
		return instance.createNode(this.node, options);
	}

	createVariable(id, options){
		if(id in this.variables)
			throw new Error("Variable id already exist: "+id);

		// deepProperty

		// BPVariable = ./Var.js
		let temp = new BPVariable(id, options);
		temp.funcInstance = this;

		if(options.scope === 'shared'){
			if(Blackprint.Sketch != null)
				sf.Obj.set(this.variables, id, temp);
			else this.variables[id] = temp;
		}
		else return this.addPrivateVariables(id);

		this.emit('variable.new', temp);
		this.rootInstance.emit('variable.new', temp);
		return temp;
	}

	addPrivateVariables(id){
		if(!this.privateVariables.includes(id)){
			this.privateVariables.push(id);
			this.emit('variable.new', {scope: 'private', id});
			this.rootInstance.emit('variable.new', {scope: 'private', id});
		}
		else return;

		let hasSketch = Blackprint.Sketch != null;
		
		let list = this.used;
		for (let i=0; i < list.length; i++) {
			let vars = list[i].iface.bpInstance.variables;

			if(hasSketch)
				sf.Obj.set(vars, id, new BPVariable(id));
			else vars[id] = new BPVariable(id);
		}
	}

	refreshPrivateVariables(instance){
		let vars = instance.variables;
		let hasSketch = Blackprint.Sketch != null;

		let list = this.privateVariables;
		for (let i=0; i < list.length; i++) {
			let id = list[i];

			if(hasSketch)
				sf.Obj.set(vars, id, new BPVariable(id));
			else vars[id] = new BPVariable(id);
		}
	}

	get input(){return this._input}
	get output(){return this._output}
	set input(v){throw new Error("Can't modify port by assigning .input property")}
	set output(v){throw new Error("Can't modify port by assigning .input property")}

	destroy(){
		let map = this.used;
		for (let iface of map) {
			iface.node._instance.deleteNode(iface);
		}
	}
}

Blackprint._utils.BPFunction = BPFunction;

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
		async _BpFnInit(){
			if(this._importOnce)
				throw new Error("Can't import function more than once");

			this._importOnce = true;
			let node = this.node;

			if(node._instance.constructor === Blackprint.Engine)
				this.bpInstance = new Blackprint.Engine();
			else this.bpInstance = new Blackprint.Sketch();

			let newInstance = this.bpInstance;
			newInstance.variables = {}; // private for one function
			newInstance.sharedVariables = node._funcInstance.variables; // shared between function
			newInstance.functions = node._instance.functions;
			newInstance._funcMain = this;

			node._funcInstance.refreshPrivateVariables(newInstance);

			let swallowCopy = Object.assign({}, node._funcInstance.structure);
			await this.bpInstance.importJSON(swallowCopy, {pendingRender: true});

			let debounce;
			this.bpInstance.on('cable.connect cable.disconnect node.created node.delete', ()=>{
				clearTimeout(debounce);
				debounce = setTimeout(() => {
					let structure = this.bpInstance.exportJSON({
						toRawObject: true,
						exportFunctions: false,
						exportVariables: false,
					});
					this.node._funcInstance.structure = structure;
				}, 1000);
			});
		}
	});

	class BPFnInOut extends Blackprint.Interface {
		addPort(port, customName){
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

			if(port.iface.namespace.startsWith("BP/Fn"))
				throw new Error("Function Input can't be connected directly to Output");

			let name = customName || port.name;
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
				nodeA._funcInstance.input[name] = portType;
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
				nodeB._funcInstance.output[name] = portType;
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

			if(this.type === 'bp-fn-input') return outputPort;
			return inputPort;
		}
		renamePort(fromName, toName){
			let funcMainNode = this._funcMain.node;

			if(this.type === 'bp-fn-input'){ // Main (input) -> Input (output)
				funcMainNode.renamePort('input', fromName, toName);
				this.node.renamePort('output', fromName, toName);

				let main = funcMainNode._funcInstance.input;
				main[toName] = main[fromName];
				delete main[fromName];
			}
			else { // Output (input) -> Main (output)
				funcMainNode.renamePort('output', fromName, toName);
				this.node.renamePort('input', fromName, toName);

				let main = funcMainNode._funcInstance.output;
				main[toName] = main[fromName];
				delete main[fromName];
			}
		}
		deletePort(name){
			let funcMainNode = this._funcMain.node;
			if(this.type === 'bp-fn-input'){ // Main (input) -> Input (output)
				funcMainNode.deletePort('input', name);
				this.node.deletePort('output', name);

				delete funcMainNode._funcInstance.input[fromName];
			}
			else { // Output (input) -> Main (output)
				funcMainNode.deletePort('output', name);
				this.node.deletePort('input', name);

				delete funcMainNode._funcInstance.output[fromName];
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