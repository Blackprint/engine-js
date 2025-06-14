Blackprint.nodes.BP.Fn = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Input');
			iface._enum = _InternalNodeEnum.BPFnInput;
			iface._proxyInput = true; // Port is initialized dynamically

			let funcMain = iface.parentInterface = this.instance.parentInterface;
			funcMain._proxyInput = this;
		}
		imported(){
			let { input } = this.iface.parentInterface.node.bpFunction;

			for(let key in input)
				this.createPort('output', key, input[key]);
		}
		request(cable){
			let name = cable.output.name;

			// This will trigger the port to request from outside and assign to this node's port
			this.output[name] = this.iface.parentInterface.node.input[name];
		}
	},
	Output: class extends Blackprint.Node {
		static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Output');
			iface._enum = _InternalNodeEnum.BPFnOutput;

			let funcMain = iface.parentInterface = this.instance.parentInterface;
			funcMain._proxyOutput ??= [];
			funcMain._proxyOutput.push(this);
		}

		imported(){
			this.routes.disableOut = true; // Disable route out
			let { output } = this.iface.parentInterface.node.bpFunction;

			for(let key in output)
				this.createPort('input', key, output[key]);
		}

		update(cable){
			let iface = this.iface.parentInterface;
			let Output = iface.node.output;

			if(cable == null){ // Triggered by port route
				let IOutput = iface.output;
				let thisInput = this.input;

				// Sync all port value
				for (let key in IOutput){
					let port = IOutput[key];
					if(port.type === Types.Trigger) continue;
					port.value = thisInput[key];
				}

				return iface.node.routes.routeOut(); // Also trigger route on the function caller if exist
			}

			// Update output value on the outside of this function node
			Output[cable.input.name] = cable.value;
		}
	},
};

// used for instance.createFunction
class BPFunction extends CustomEvent {
	constructor(id, options, instance){
		super();

		id = id.replace(/^\/|\/$/gm, '');
		id = id.replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,.<>?]+/g, '_');
		this.id = id
		this.title = options?.title || id;

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
			instance: {
				'BP/Fn/Input':[{i: 0, x: 400, y: 100}],
				'BP/Fn/Output':[{i: 1, x: 600, y: 100}],
			}
		};

		this._envNameListener = ({ old, now }) => {
			let instance = this.structure.instance;
			let list = _combineArray(instance['BP/Env/Get'], instance['BP/Env/Set']);
			for (let i=0; i < list.length; i++) {
				let data = list[i].data;
				if(data.name === old) data.name = data.title = now;
			}
		};
		Blackprint.on('environment.renamed', this._envNameListener);

		this._varNameListener = ({ old, now, scope }) => {
			let instance = this.structure.instance;
			if(scope === VarScope.Public || scope === VarScope.Shared){
				let list = _combineArray(instance['BP/Var/Get'], instance['BP/Var/Set']);
				for (let i=0; i < list.length; i++) {
					let data = list[i].data;
					if(data.scope === scope && data.name === old) data.name = now;
				}
			}
		};
		this.rootInstance.on('variable.renamed', this._varNameListener);

		this._funcNameListener = ({ old, now }) => {
			let instance = this.structure.instance;
			if(instance[`BPI/F/${old}`] == null) return;
			instance[`BPI/F/${now}`] = instance[`BPI/F/${old}`];
			delete instance[`BPI/F/${old}`];
		};
		this.rootInstance.on('function.renamed', this._funcNameListener);

		this._funcPortNameListener = ({ old, now, reference, which }) => {
			let instance = this.structure.instance;
			let funcs = instance[`BPI/F/${reference.id}`];
			if(funcs == null) return;

			for (let i=0; i < funcs.length; i++) {
				let item = funcs[i];
				if(which === 'output'){
					if(item.output_sw == null || item.output_sw[old] == null) continue;
					item.output_sw[now] = item.output_sw[old];
					delete item.input_d[old];
				}
				else if(which === 'input'){
					if(item.input_d == null || item.input_d[old] == null) continue;
					item.input_d[now] = item.input_d[old];
					delete item.input_d[old];
				}
			}
		};
		this.rootInstance.on('function.port.renamed', this._funcPortNameListener);

		this._eventNameListener = ({ old, now }) => {
			let instance = this.structure.instance;
			let list = _combineArray(instance['BP/Event/Listen'], instance['BP/Event/Emit']);
			for (let i=0; i < list.length; i++) {
				let data = list[i].data;
				if(data.namespace === old) data.namespace = now;
			}
		};
		this.rootInstance.on('event.renamed', this._eventNameListener);

		let temp = this;
		let uniqId = 0;
		this.node = class extends BPFunctionNode { // Main function node -> BPI/F/{FunctionName}
			static input = input;
			static output = output;
			static namespace = id;
			static type = 'function';

			constructor(instance){
				super(instance);
				this.bpFunction = temp;

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

					if(targetInput == null && input.isRoute) targetInput = inputIface.node.routes;
					if(targetOutput == null && output.isRoute) targetOutput = outputIface.node.routes;

					if(targetInput == null){
						if(inputIface._enum === _InternalNodeEnum.BPFnOutput){
							targetInput = inputIface.createPort(targetOutput, output.name);
						}
						else throw new Error("Output port was not found");
					}

					if(targetOutput == null){
						if(outputIface._enum === _InternalNodeEnum.BPFnInput){
							targetOutput = outputIface.createPort(targetInput, input.name);
						}
						else throw new Error("Input port was not found");
					}

					if(targetInput.isRoute){
						if(!(targetOutput instanceof Blackprint.RoutePort))
							targetOutput.connectPort(targetInput);
						else targetInput.connectCable(targetOutput.createCable());
					}
					else targetInput.connectPort(targetOutput);
				}
				else if(eventName === 'cable.disconnect'){
					let inputPort = inputIface.input[input.name];
					let outputPort = outputIface.output[output.name];
					if(outputPort == null && output.isRoute) outputPort = outputIface.node.routes;

					let cables;
					if(inputPort == null && input.isRoute) cables = inputIface.node.routes.in;
					else cables = inputPort.cables;

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
		if(id.includes('/')) throw new Error("Slash symbol is reserved character and currently can't be used for creating path");

		if(options.scope === VarScope.Private){
			if(!this.privateVars.includes(id)){
				this.privateVars.push(id);

				let eventData = {bpFunction: this, scope: VarScope.Private, id};
				this.emit('variable.new', eventData);
				this.rootInstance.emit('variable.new', eventData);
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

			return;
		}
		else if(options.scope === VarScope.Public) throw new Error("Can't create public variable from a function");
		// else: Shared variable

		if(id in this.variables) throw new Error("Variable id already exist: "+id);

		// BPVariable = ./Var.js
		let temp = new BPVariable(id, options);
		temp.bpFunction = this;
		temp._scope = options.scope;

		if(Blackprint.Sketch != null)
			sf.Obj.set(this.variables, id, temp);
		else this.variables[id] = temp;

		let eventData = {
			reference: temp,
			scope: temp._scope,
			id: temp.id
		};
		this.emit('variable.new', eventData);
		this.rootInstance.emit('variable.new', eventData);
		return temp;
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

	renameVariable(from, to, scopeId){
		if(scopeId == null) throw new Error("Third parameter couldn't be null");
		if(to.includes('/'))
			throw new Error("Slash symbol is reserved character and currently can't be used for creating path");

		to = to.replace(/^\/|\/$/gm, '').replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,.<>?]+/g, '_');
		if(scopeId === VarScope.Private){
			let privateVars = this.privateVars;
			let i = privateVars.indexOf(from);
			if(i === -1) throw new Error(`Private variable with name '${from}' was not found on '${this.id}' function`);
			privateVars[i] = to;
		}
		else if(scopeId === VarScope.Shared){
			let varObj = this.variables[from];
			if(varObj == null) throw new Error(`Shared variable with name '${from}' was not found on '${this.id}' function`);

			varObj.id = varObj.title = to;
			if(window.sf?.Obj != null) {
				sf.Obj.set(this.variables, to, varObj);
				sf.Obj.delete(this.variables, from);
				this.variables.refresh?.();
			}
			else delete this.variables[from];

			this.rootInstance.emit('variable.renamed', {
				old: from, now: to, reference: varObj, scope: scopeId,
			});
		}
		else throw new Error("Can't rename variable from scopeId: " + scopeId);

		let lastInstance = null;
		if(scopeId === VarScope.Shared){
			let used = this.variables[to].used;
			for (let i=0; i < used.length; i++) {
				let iface = used[i];
				iface.title = iface.data.name = to;
				lastInstance = iface.node.instance;
			}
		}
		else {
			let used = this.used;
			for (let i=0; i < used.length; i++) {
				lastInstance = used[i].bpInstance;
				lastInstance.renameVariable(from, to, scopeId);
			}
		}
	}

	deleteVariable(namespace, scopeId){
		if(scopeId === VarScope.Public) return this.rootInstance.deleteVariable(namespace, scopeId);

		let used = this.used;
		let path = namespace.split('/');
		if(scopeId === VarScope.Private){
			let privateVars = this.privateVars;
			let i = privateVars.indexOf(namespace);
			if(i === -1) return;
			privateVars.splice(i, 1);

			used[0].bpInstance.deleteVariable(namespace, scopeId);

			// Delete from all function node instance
			for (let i=1; i < used.length; i++) {
				let instance = used[i].bpInstance;
				let varsObject = instance.variables;
				let oldObj = getDeepProperty(varsObject, path);
				if(oldObj == null) continue;
				if(scopeId === VarScope.Private) oldObj.destroy();
	
				deleteDeepProperty(varsObject, path, true);
				let eventData = {scope: oldObj._scope, id: oldObj.id, bpFunction: this};
				instance.emit('variable.deleted', eventData);
			}
		}
		else if(scopeId === VarScope.Shared){
			let oldObj = getDeepProperty(this.variables, path);
			used[0].bpInstance.deleteVariable(namespace, scopeId);

			// Delete from all function node instance
			let eventData = {scope: oldObj._scope, id: oldObj.id, reference: oldObj};
			for (let i=1; i < used.length; i++) {
				used[i].bpInstance.emit('variable.deleted', eventData);
			}
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

			if(which === 'output'){
				let list = iface._proxyOutput;
				for (let a=0; a < list.length; a++) {
					list[a].renamePort(proxyPort, fromName, toName);
				}
			}
			else { // input
				let temp = iface._proxyInput;
				temp.iface[proxyPort][fromName]._name.name = toName; // for function input variable node
				temp.renamePort(proxyPort, fromName, toName);
			}

			if(which === 'input'){
				let ifaces = iface.bpInstance.ifaceList;
				for (let a=0; a < ifaces.length; a++) {
					let proxyVar = ifaces[a];
					if(proxyVar.namespace !== "BP/FnVar/Input")
						continue;
	
					if(proxyVar.data.name !== fromName) continue;
					proxyVar.data.name = toName;
				}
			}
		}

		this.rootInstance.emit('function.port.renamed', {
			old: fromName, now: toName, reference: this, which,
		});
	}

	deletePort(which, portName){
		let used = this.used;
		if(used.length === 0)
			throw new Error("One function node need to be placed to the instance before deleting port");

		let main = this[which];
		delete main[portName];

		let hasDeletion = false;
		for (let i=0; i < used.length; i++) {
			let iface = used[i];
			if(which === 'output'){
				let list = iface._proxyOutput;
				for (let a=0; a < list.length; a++) {
					list[a].iface.deletePort(portName);
				}

				hasDeletion = true;
			}
			else if(which === 'input'){
				iface._proxyInput.iface.deletePort(portName);
				hasDeletion = true;
			}
		}

		if(!hasDeletion) return;
		used[0]._save(false, false, true);
		this.rootInstance.emit('function.port.deleted', {
			which, name: portName, reference: this,
		});
	}

	async invoke(input){
		let iface = this.directInvokeFn;
		if(iface == null){
			iface = this.directInvokeFn = this.createNode(this.rootInstance);
			iface.bpInstance.executionOrder.stop = true; // Disable execution order and force to use route cable
			iface.bpInstance.pendingRender = true;
			iface.isDirectInvoke = true; // Mark this node as direct invoke, for some optimization

			// For sketch instance, we will remove it from sketch visibility
			let sketchScope = iface.node.instance.scope;
			if(sketchScope != null){
				let list = sketchScope('nodes').list;
				if(list.includes(iface)) list.splice(list.indexOf(iface), 1);
			}

			// Wait until ready
			await new Promise(resolve => iface.once('ready', resolve));
		}

		let proxyInput = iface._proxyInput;
		if(proxyInput.routes.out == null){
			throw new Error(this.id + ": Blackprint function node must have route port that connected from input node to the output node");
		}

		let inputPorts = proxyInput.iface.output;
		for (let key in inputPorts) {
			let port = inputPorts[key];
			let val = input[key];

			if(port.value == val) continue; // Skip if value is the same

			// Set the value if different, and reset cache and emit value event after this line
			port.value = val;

			// Check all connected cables, if any node need to synchronize
			let cables = port.cables;
			for (var i = 0; i < cables.length; i++) {
				var cable = cables[i];
				if(cable.hasBranch) continue;

				var inp = cable.input;
				if(inp === void 0) continue;

				inp._cache = void 0;
				inp.emit('value', { port: inp, target: iface, cable });
			}
		}

		await proxyInput.routes.routeOut();

		let ret = {};
		let outputs = iface.node.output;
		for (let key in outputs) {
			ret[key] = outputs[key];
		}

		return ret;
	}

	get input(){return this._input}
	get output(){return this._output}
	set input(v){throw new Error("Can't modify port by assigning .input property")}
	set output(v){throw new Error("Can't modify port by assigning .output property")}

	destroy(){
		let map = this.used; // This list can be altered multiple times when deleting a node
		for (let i=map.length-1; i >= 0; i = map.length-1) {
			let iface = map[i];
			iface.node.instance.deleteNode(iface);
		}
	}
}

Blackprint._utils.BPFunction = BPFunction;

// Main function node
class BPFunctionNode extends Blackprint.Node {
	imported(data){
		let bpFunction = this.bpFunction;
		bpFunction.used.push(this.iface);
	}

	update(cable){
		let iface = this.iface._proxyInput.iface;
		let Output = iface.node.output;

		if(cable == null){ // Triggered by port route
			let IOutput = iface.output;
			let thisInput = this.input;

			// Sync all port value
			for (let key in IOutput){
				if(IOutput[key].type === Types.Trigger) continue;
				Output[key] = thisInput[key];
			}

			return;
		}

		// Update output value on the input node inside the function node
		Output[cable.input.name] = cable.value;
	}

	destroy(){
		let bpFunction = this.bpFunction;

		let i = bpFunction.used.indexOf(this.iface);
		if(i !== -1) bpFunction.used.splice(i, 1);

		this.iface.bpInstance.destroy();
	}
}


// ==== Interface ====
// Register when ready
function BPFnInit(){
	Blackprint.registerInterface('BPIC/BP/Fn/Main',
	class extends Blackprint.Interface {
		// We won't internally mark this node for having dynamic port
		// The port was defined after the node is imported, the outer port
		// will already have a type
		async _BpFnInit(){
			if(this._importOnce)
				throw new Error("Can't import function more than once");

			this._importOnce = true;
			this.isDirectInvoke = false;
			let node = this.node;

			if(node.instance.constructor === Blackprint.Engine)
				this.bpInstance = new Blackprint.Engine();
			else
				this.bpInstance = new Blackprint.Sketch();

			let bpFunction = node.bpFunction;
			this.bpInstance.pendingRender = true;
			this.bpInstance.executionOrder._rootExecOrder = bpFunction.rootInstance.executionOrder;

			if(this.data?.pause) this.bpInstance.executionOrder.pause = true;

			let newInstance = this.bpInstance;
			newInstance.variables = {}; // private for one function
			newInstance.sharedVariables = bpFunction.variables; // shared between function
			newInstance.functions = node.instance.functions;
			newInstance.events = node.instance.events;
			newInstance.parentInterface = this;
			newInstance.rootInstance = bpFunction.rootInstance;

			Blackprint.off('_eventInstance.new', newInstance._eventsInsNew);
			bpFunction.refreshPrivateVars(newInstance);

			let swallowCopy = Object.assign({}, bpFunction.structure);
			await newInstance.importJSON(swallowCopy, {clean: false, pendingRender: true});

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

			// Fix missing HTML input component for first function node
			this.initInputPort?.(true);

			let debounce;
			this._save = (ev, eventName, force) => {
				if(newInstance.rootInstance._destroying || this.bpInstance._destroying)
					return; // Avoid saving when the instance is being destroyed

				clearTimeout(debounce);
				debounce = setTimeout(() => {
					this.bpInstance._emit('_fn.structure.update', { iface: this });

					if(this.bpInstance.exportJSON == null)
						return;

					bpFunction.structure = this.bpInstance.exportJSON({
						toRawObject: true,
						exportFunctions: false,
						exportVariables: false,
						exportEvents: false,
					});
				}, 1000);

				if(force || bpFunction._syncing) return;

				ev.bpFunction = bpFunction;

				if(!newInstance.rootInstance._remote || eventName !== 'variable.renamed')
					newInstance.rootInstance.emit(eventName, ev);

				bpFunction._syncing = true;
				try {
					bpFunction._onFuncChanges(eventName, ev, node);
				}
				finally {
					bpFunction._syncing = false;
				}
			};

			this.bpInstance.on('cable.connect cable.disconnect node.created node.delete node.move node.id.changed port.default.changed _port.split _port.unsplit _port.resync.allow _port.resync.disallow variable.renamed', this._save);

			this.emit('ready');
		}
		imported(data){ this.data = data; }
		renamePort(which, fromName, toName){
			this.node.bpFunction.renamePort(which, fromName, toName);
			this._save(false, false, true);

			this.node.instance._emit('_fn.rename.port', {
				iface: this,
				which, fromName, toName,
			});
		}
	});

	class BPFnInOut extends Blackprint.Interface {
		constructor(node){
			super(node);
			this._dynamicPort = true; // Port is initialized dynamically
		}
		createPort(port, customName){
			if(port === undefined) return;

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
			let portType, refName;

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

				nodeA = this.parentInterface.node;
				nodeB = this.node;
				refName = {name};

				portType = getFnPortType(port, 'input', this, refName);
				nodeA.bpFunction.input[name] = portType;
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
				nodeB = this.parentInterface.node;
				refName = {name};

				portType = getFnPortType(port, 'output', this, refName);
				nodeB.bpFunction.output[name] = portType;
			}

			outputPort = nodeB.createPort('output', name, portType);

			let inputPort;
			let inputPortType;
			if(portType === Types.Trigger)
				inputPortType = BP_Port.Trigger(()=> outputPort._callAll());
			else inputPortType = portType;

			inputPort = nodeA.createPort('input', name, inputPortType);

			// When using Blackprint.Sketch we need to reconnect the cable
			if(cable != null){
				if(this.type === 'bp-fn-input')
					outputPort.connectCable(cable);
				else inputPort.connectCable(cable);
			}

			if(this.type === 'bp-fn-input'){
				outputPort._name = refName; // When renaming port, this also need to be changed
				this.emit(`_add.${refName.name}`, {port: outputPort});
				return outputPort;
			}
			// else = bp-fn-output

			inputPort._name = {name}; // When renaming port, this also need to be changed
			this.emit(`_add.${name}`, {port: inputPort});

			let onValueChanged = ({ cable }) => {
				outputPort.iface.node.output[outputPort.name] = cable.output.value;
			}
			inputPort.on('value', onValueChanged);

			let list = this.parentInterface._proxyOutput;
			for (let i=0; i < list.length; i++) {
				let node = list[i];
				let port = node.createPort('input', name, inputPortType);

				port._name = inputPort._name;
				this.emit(`_add.${name}`, {port});
				port.on('value', onValueChanged);
			}

			return inputPort;
		}
		renamePort(fromName, toName){
			let bpFunction = this.parentInterface.node.bpFunction;

			// Main (input) -> Input (output)
			if(this.type === 'bp-fn-input')
				bpFunction.renamePort('input', fromName, toName);

			// Output (input) -> Main (output)
			else bpFunction.renamePort('output', fromName, toName);

			this.node.instance._emit('_fn.rename.port', {
				iface: this,
				which, fromName, toName,
			});
		}
		deletePort(name){
			let funcMainNode = this.parentInterface.node;
			let instance = this.node.instance;
			let ifaceList = instance.ifaceList;
			if(this.type === 'bp-fn-input'){ // Main (input) -> Input (output)
				for (let i=ifaceList.length-1; i >= 0; i--) { // Delete function input variable nodes
					let iface = ifaceList[i];
					if(iface.namespace === "BP/FnVar/Input" && iface.data.name === name)
						instance.deleteNode(iface);
				}

				funcMainNode.deletePort('input', name);
				this.node.deletePort('output', name);

				delete funcMainNode.bpFunction.input[name];
			}
			else { // Output (input) -> Main (output)
				funcMainNode.deletePort('output', name);
				this.node.deletePort('input', name);

				delete funcMainNode.bpFunction.output[name];
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