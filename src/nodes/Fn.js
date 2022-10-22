Blackprint.nodes.BP.Fn = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Input');
			iface._enum = _InternalNodeEnum.BPFnInput;
			iface._proxyInput = true; // Port is initialized dynamically

			let funcMain = iface._funcMain = this.instance._funcMain;
			funcMain._proxyInput = this;
		}
		imported(){
			let { input } = this.iface._funcMain.node._funcInstance;

			for(let key in input)
				this.createPort('output', key, input[key]);
		}
		request(cable){
			let name = cable.output.name;

			// This will trigger the port to request from outside and assign to this node's port
			this.output[name] = this.iface._funcMain.node.input[name];
		}
	},
	Output: class extends Blackprint.Node {
		static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Output');
			iface._enum = _InternalNodeEnum.BPFnOutput;
			iface._dynamicPort = true; // Port is initialized dynamically

			let funcMain = iface._funcMain = this.instance._funcMain;
			funcMain._proxyOutput = this;
		}

		imported(){
			let { output } = this.iface._funcMain.node._funcInstance;

			for(let key in output)
				this.createPort('input', key, output[key]);
		}

		update(cable){
			let iface = this.iface._funcMain;
			if(cable == null){ // Triggered by port route
				let IOutput = iface.output;
				let Output = iface.node.output;
				let thisInput = this.input;

				// Sync all port value
				for (let key in IOutput){
					if(IOutput[key].type === Function) continue;
					Output[key] = thisInput[key];
				}
	
				return;
			}

			iface.node.output[cable.input.name] = cable.value;
		}
	},
};

// used for instance.createFunction
class BPFunction extends CustomEvent { // <= _funcInstance
	constructor(id, options, instance){
		super();

		this.title = options.title || id;
		id = id.replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,./<>?]+/g, '_');
		this.id = id

		this.rootInstance = instance; // root instance
		this.description = options?.description ?? '';

		// {name: BPVariable}
		this.variables = {}; // shared between function

		// ['id', ...]
		this.privateVars = []; // private variable (different from other function)

		let input = this._input = {};
		let output = this._output = {};
		this.used = []; // [Blackprint.Interface, ...]

		// This will be updated if the function sketch was modified
		this.structure = options.structure || {
			'BP/Fn/Input':[{i: 0, x: 400, y: 100}],
			'BP/Fn/Output':[{i: 1, x: 600, y: 100}],
		};

		let temp = this;
		let uniqId = 0;
		this.node = class extends BPFunctionNode { // Main function node -> BPI/F/{FunctionName}
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

				iface._enum = _InternalNodeEnum.BPFnMain;
			}

			async init(){
				// This is required when the node is created at runtime (maybe from remote or Sketch)
				if(!this.iface._importOnce) await this.iface._BpFnInit();
			}
		};
	}

	_onFuncChanges(eventName, obj, fromNode){
		let list = this.used;

		for (let a=0; a < list.length; a++) {
			let iface = list[a];
			if(iface.node === fromNode) continue;

			let nodeInstance = iface.bpInstance;
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
						if(inputIface._enum === _InternalNodeEnum.BPFnOutput){
							targetInput = inputIface.addPort(targetOutput, output.name);
						}
						else throw new Error("Output port was not found");
					}

					if(targetOutput == null){
						if(outputIface._enum === _InternalNodeEnum.BPFnInput){
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
		temp._scope = options.scope;

		if(options.scope === VarScope.Shared){
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
			this.emit('variable.new', {scope: VarScope.Private, id});
			this.rootInstance.emit('variable.new', {
				funcInstance: this,
				scope: VarScope.Private,
				id,
			});
		}
		else return;

		let hasSketch = Blackprint.Sketch != null;
		
		let list = this.used;
		for (let i=0; i < list.length; i++) {
			let vars = list[i].bpInstance.variables;

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

	renamePort(which, fromName, toName){
		let main = this[which];
		main[toName] = main[fromName];
		delete main[fromName];

		let used = this.used;
		let proxyPort = which === 'output' ? 'input' : 'output';

		for (let i=0; i < used.length; i++) {
			let iface = used[i];
			iface.node.renamePort(which, fromName, toName);

			let temp = which === 'output' ? iface._proxyOutput : iface._proxyInput;
			temp.iface[proxyPort][fromName]._name.name = toName;
			temp.renamePort(proxyPort, fromName, toName);

			let ifaces = iface.bpInstance.ifaceList;
			for (let a=0; a < ifaces.length; a++) {
				let proxyVar = ifaces[a];
				if((which === 'output' && proxyVar.namespace !== "BP/FnVar/Output")
					|| (which === 'input' && proxyVar.namespace !== "BP/FnVar/Input"))
					continue;

				if(proxyVar.data.name !== fromName) continue;
				proxyVar.data.name = toName;

				if(which === 'output')
					proxyVar[proxyPort].Val._name.name = toName;
			}
		}
	}

	get input(){return this._input}
	get output(){return this._output}
	set input(v){throw new Error("Can't modify port by assigning .input property")}
	set output(v){throw new Error("Can't modify port by assigning .input property")}

	destroy(){
		let map = this.used;
		for (let i=0; i < map.length; i++) {
			let iface = map[i];
			iface.node.instance.deleteNode(iface);
		}
	}
}

Blackprint._utils.BPFunction = BPFunction;

// Main function node
class BPFunctionNode extends Blackprint.Node {
	imported(data){
		let instance = this._funcInstance;
		instance.used.push(this.iface);
	}

	update(cable){
		let iface = this.iface._proxyInput.iface;
		let Output = iface.node.output;

		if(cable == null){ // Triggered by port route
			let IOutput = iface.output;
			let thisInput = this.input;

			// Sync all port value
			for (let key in IOutput){
				if(IOutput[key].type === Function) continue;
				Output[key] = thisInput[key];
			}

			return;
		}

		// Update output value on the input node inside the function node
		Output[cable.input.name] = cable.value;
	}

	destroy(){
		let instance = this._funcInstance;

		let i = instance.used.indexOf(this.iface);
		if(i !== -1) instance.used.splice(i, 1);

		this.iface.bpInstance.destroy();
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

			if(node.instance.constructor === Blackprint.Engine)
				this.bpInstance = new Blackprint.Engine();
			else this.bpInstance = new Blackprint.Sketch();

			let bpFunction = node._funcInstance;

			let newInstance = this.bpInstance;
			newInstance.variables = {}; // private for one function
			newInstance.sharedVariables = bpFunction.variables; // shared between function
			newInstance.functions = node.instance.functions;
			newInstance._funcMain = this;
			newInstance._mainInstance = bpFunction.rootInstance;

			bpFunction.refreshPrivateVars(newInstance);

			let swallowCopy = Object.assign({}, bpFunction.structure);
			await this.bpInstance.importJSON(swallowCopy, {pendingRender: true});

			// Init port switches
			if(this._portSw_ != null){
				this._initPortSwitches(this._portSw_);
				delete this._portSw_;

				let InputIface = this._proxyInput.iface;
				if(InputIface._portSw_ != null){
					InputIface._initPortSwitches(InputIface._portSw_);
					delete InputIface._portSw_;
				}
			}

			let debounce;
			this._save = (ev, eventName, force) => {
				clearTimeout(debounce);
				debounce = setTimeout(() => {
					if(this.bpInstance.exportJSON == null){
						this.bpInstance.emit('_fn.structure.update', this);
						return;
					}

					bpFunction.structure = this.bpInstance.exportJSON({
						toRawObject: true,
						exportFunctions: false,
						exportVariables: false,
					});
				}, 1000);

				if(force || bpFunction._syncing) return;

				ev.bpFunction = bpFunction;
				newInstance._mainInstance.emit(eventName, ev);

				bpFunction._syncing = true;
				bpFunction._onFuncChanges(eventName, ev, node);
				bpFunction._syncing = false;
			};

			this.bpInstance.on('cable.connect cable.disconnect node.created node.delete node.move node.id.changed', this._save);
		}
		renamePort(which, fromName, toName){
			this.node._funcInstance.renamePort(which, fromName, toName);
			this._save(false, false, true);
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

			if(cable != null){
				if(cable.isRoute) return;
				port = cable.owner;
			}

			if(port.iface.namespace.startsWith("BP/Fn"))
				throw new Error("Function Input can't be connected directly to Output");

			let name = port._name?.name || customName || port.name;
			let outputPort;
			let portType;

			if(port.feature === BP_Port.Trigger){
				portType = BP_Port.Trigger(function(){ nodeB.output[inputPort.name](); });
			}
			// Skip port with feature: ArrayOf
			else if(port.feature === BP_Port.ArrayOf){
				portType = port.type;
			}
			else portType = port.feature != null ? port.feature(port.type) : port.type;

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

			// When using Blackprint.Sketch we need to reconnect the cable
			if(cable != null){
				if(this.type === 'bp-fn-input')
					outputPort.connectCable(cable);
				else inputPort.connectCable(cable);
			}

			if(this.type === 'bp-fn-input'){
				outputPort._name = {name}; // When renaming port, this also need to be changed
				this.emit(`_add.${name}`, outputPort);
				return outputPort;
			}

			inputPort._name = {name}; // When renaming port, this also need to be changed
			this.emit(`_add.${name}`, inputPort);

			inputPort.on('value', ({ cable }) => {
				outputPort.iface.node.output[outputPort.name] = cable.output.value;
			});

			return inputPort;
		}
		renamePort(fromName, toName){
			let bpFunction = this._funcMain.node._funcInstance;

			// Main (input) -> Input (output)
			if(this.type === 'bp-fn-input')
				bpFunction.renamePort('input', fromName, toName);

			// Output (input) -> Main (output)
			else bpFunction.renamePort('output', fromName, toName);
		}
		deletePort(name){
			let funcMainNode = this._funcMain.node;
			if(this.type === 'bp-fn-input'){ // Main (input) -> Input (output)
				funcMainNode.deletePort('input', name);
				this.node.deletePort('output', name);

				delete funcMainNode._funcInstance.input[name];
			}
			else { // Output (input) -> Main (output)
				funcMainNode.deletePort('output', name);
				this.node.deletePort('input', name);

				delete funcMainNode._funcInstance.output[name];
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