Blackprint.nodes.BP.Fn = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Input');
			iface.enum = _InternalNodeEnum.BPFnInput;
			iface._proxyInput = true; // Port is initialized dynamically

			let funcMain = iface._funcMain = this._instance._funcMain;
			funcMain._proxyInput = this;
		}
		imported(){
			let { input } = this.iface._funcMain.node._funcInstance;

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
			iface._dynamicPort = true; // Port is initialized dynamically

			let funcMain = iface._funcMain = this._instance._funcMain;
			funcMain._proxyOutput = this;
		}

		imported(){
			let { output } = this.iface._funcMain.node._funcInstance;

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
		this.privateVars = []; // private variable (different from other function)

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

	_onFuncChanges(eventName, obj, fromNode){
		let list = this.used;

		for (let a=0; a < list.length; a++) {
			let node = list[a];
			if(node === fromNode) continue;

			let nodeInstance = node.iface.bpInstance;
			nodeInstance.pendingRender = true; // Force recalculation for cable position

			if(eventName === 'cable.connect' || eventName === 'cable.disconnect'){
				let { input, output } = obj.cable;
				let ifaceList = fromNode.iface.bpInstance.ifaceList;

				// Skip event that also triggered when deleting a node
				if(input.iface._bpDestroy || output.iface._bpDestroy) continue;

				let inputIface = nodeInstance.ifaceList[ifaceList.indexOf(input.iface)];
				if(inputIface == null)
					throw new Error("Failed to get node input iface index");

				let outputIface = nodeInstance.ifaceList[ifaceList.indexOf(output.iface)];
				if(outputIface == null)
					throw new Error("Failed to get node output iface index");

				if(inputIface.namespace !== input.iface.namespace){
					console.log(inputIface.namespace, input.iface.namespace);
					throw new Error("Input iface namespace was different");
				}

				if(outputIface.namespace !== output.iface.namespace){
					console.log(outputIface.namespace, output.iface.namespace);
					throw new Error("Output iface namespace was different");
				}

				let lastState = Blackprint.settings.windowless;
				Blackprint.settings.windowless = true;

				if(eventName === 'cable.connect'){
					let targetInput = inputIface.input[input.name];
					let targetOutput = outputIface.output[output.name];

					if(targetInput == null){
						if(inputIface.enum === _InternalNodeEnum.BPFnOutput){
							targetInput = inputIface.addPort(targetOutput, output.name);
						}
						else throw new Error("Output port was not found");
					}

					if(targetOutput == null){
						if(outputIface.enum === _InternalNodeEnum.BPFnInput){
							targetOutput = outputIface.addPort(targetInput, input.name);
						}
						else throw new Error("Input port was not found");
					}

					targetInput.connectPort(targetOutput);
				}
				else if(eventName === 'cable.disconnect'){
					let cables = inputIface.input[input.name].cables;
					let outputPort = outputIface.output[output.name];

					for (let z=0; z < cables.length; z++) {
						let cable = cables[z];
						if(cable.output === outputPort){
							cable.disconnect();
							break;
						}
					}
				}

				Blackprint.settings.windowless = lastState;
			}
			else if(eventName === 'node.created'){
				let iface = obj.iface;
				nodeInstance.createNode(iface.namespace, {
					x: iface.x,
					y: iface.y,
					data: iface.data
				});
			}
			else if(eventName === 'node.delete' || eventName === 'node.move'){
				let index = fromNode.iface.bpInstance.ifaceList.indexOf(obj.iface);
				if(index === -1)
					throw new Error("Failed to get node index");

				let iface = nodeInstance.ifaceList[index];
				if(iface.namespace !== obj.iface.namespace){
					console.log(iface.namespace, obj.iface.namespace);
					throw new Error("Failed to delete node from other function instance");
				}

				if(eventName === 'node.delete')
					nodeInstance.deleteNode(iface);

				if(eventName === 'node.move'){
					iface.x = obj.iface.x;
					iface.y = obj.iface.y;
				}
			}
		}
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
		else return this.addPrivateVars(id);

		this.emit('variable.new', temp);
		this.rootInstance.emit('variable.new', temp);
		return temp;
	}

	addPrivateVars(id){
		if(!this.privateVars.includes(id)){
			this.privateVars.push(id);
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

	refreshPrivateVars(instance){
		let vars = instance.variables;
		let hasSketch = Blackprint.Sketch != null;

		let list = this.privateVars;
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
	imported(data){
		let instance = this._funcInstance;
		instance.used.push(this);
	}

	update(port, source, cable){
		// port => input port from current node
		let temp = this.iface._proxyInput.iface.node;

		if(port == null) return temp.update();
		temp.output[port.name] = cable.value;
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

			let bpFunction = node._funcInstance;

			let newInstance = this.bpInstance;
			newInstance.variables = {}; // private for one function
			newInstance.sharedVariables = bpFunction.variables; // shared between function
			newInstance.functions = node._instance.functions;
			newInstance._funcMain = this;
			newInstance._mainInstance = bpFunction.rootInstance;

			bpFunction.refreshPrivateVars(newInstance);

			let swallowCopy = Object.assign({}, bpFunction.structure);
			await this.bpInstance.importJSON(swallowCopy, {pendingRender: true});

			let debounce;
			this.bpInstance.on('cable.connect cable.disconnect node.created node.delete node.move', (ev, eventName)=>{
				clearTimeout(debounce);
				debounce = setTimeout(() => {
					bpFunction.structure = this.bpInstance.exportJSON({
						toRawObject: true,
						exportFunctions: false,
						exportVariables: false,
					});
				}, 1000);

				if(bpFunction._syncing) return;

				ev.bpFunction = bpFunction;
				newInstance._mainInstance.emit(eventName, ev);

				bpFunction._syncing = true;
				bpFunction._onFuncChanges(eventName, ev, node);
				bpFunction._syncing = false;
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

			if(this.type === 'bp-fn-input'){
				this.emit(`_add.${name}`, outputPort);
				return outputPort;
			}

			this.emit(`_add.${name}`, inputPort);
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