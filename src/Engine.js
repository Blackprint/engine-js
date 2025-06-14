Blackprint.Engine = class Engine extends CustomEvent {
	constructor(){
		super();
		this.ifaceList = []; // IFace

		this.variables = {}; // { category => BPVariable{ name, value, type }, category => { category } }
		this.functions = {}; // { category => BPFunction{ name, variables, input, output, used: [], node, description }, category => { category } }
		this.events = new InstanceEvents(this);

		this.iface = {}; // { id => IFace }
		this.ref = {}; // { id => Port references }

		this.executionOrder = new OrderedExecution(this);
		this._importing = false;
		this._destroying = false;
		this._ready = false;

		// This is only for Sketch, other engine than JS doesn't need this
		this._eventsInsNew = ev => this.events._updateTreeList();
		Blackprint.on('_eventInstance.register', this._eventsInsNew);

		this._envDeleted = ({ key }) => {
			let list = this.ifaceList;
			for (let i=list.length-1; i >= 0; i--) {
				let iface = list[i];
				if(iface.namespace !== 'BP/Env/Get' && iface.namespace !== 'BP/Env/Set') continue;
				if(iface.data.name === key) this.deleteNode(iface);
			}
		};
		Blackprint.on('environment.deleted', this._envDeleted);

		this.once('json.imported', () => {
			this._ready = true;
			this._readyResolve?.();
		});
	}

	ready(){
		if(this._ready) return;
		if(this._readyPromise) return this._readyPromise;

		return this._readyPromise = new Promise(resolve => {
			this._readyResolve = resolve;
			this._readyPromise = null;
		});
	}

	deleteNode(iface){
		if(this._locked_)
			throw new Error("This instance was locked");

		let list = this.ifaceList;
		var i = list.indexOf(iface);

		if(i !== -1)
			list.splice(i, 1);
		else return this._emit('error', {
			type: 'node_delete_not_found',
			data: {iface}
		});

		iface._bpDestroy = true;

		let eventData = { iface };
		this._emit('node.delete', eventData);

		iface.node.destroy && iface.node.destroy();
		iface.destroy && iface.destroy();

		var check = Blackprint.Interface._ports;
		for (var i = 0; i < check.length; i++) {
			var portList = iface[check[i]];

			for(var port in portList){
				if(port.slice(0, 1) === '_') continue;
				portList[port].disconnectAll(this._remote != null);
			}
		}

		let routes = iface.node.routes;
		if(routes.in.length !== 0){
			let inp = routes.in;
			for (let i=0; i < inp.length; i++) {
				inp[i].disconnect();
			}
		}

		routes.out?.disconnect();

		// Delete reference
		delete this.iface[iface.id];
		delete this.ref[iface.id];

		let parent = iface.node.bpFunction;
		if(parent != null)
			delete parent.rootInstance.ref[iface.id];

		this._emit('node.deleted', eventData);
	}

	clearNodes(){
		if(this._locked_) throw new Error("This instance was locked");
		this._destroying = true;

		let list = this.ifaceList;
		for (var i = 0; i < list.length; i++) {
			let iface = list[i];
			if(iface == null) continue;

			let eventData = { iface };
			this._emit('node.delete', eventData);

			iface.node.destroy?.();
			iface.destroy?.();

			this._emit('node.deleted', eventData);
		}

		this.ifaceList.splice(0);
		this.iface = {};
		this.ref = {};

		this._destroying = false;
	}

	// If this was changed, we also need to change the `importJSON` on the `@blackprint/sketch`
	async importJSON(json, options){
		if(this._locked_) throw new Error("This instance was locked");

		if(window.sf && window.sf.loader)
			await window.sf.loader.task;

		if(json.constructor !== Object)
			json = JSON.parse(json);

		// ToDo: remove this after v1.0 released
		if(json.instance == null)
			json = this._jsonToNew(json);

		// Throw if no instance data in the JSON
		if(json.instance == null)
			throw new Error("Instance was not found in the JSON data");

		let oldIfaces = this.iface;

		if(options === void 0) options = {};
		if(options.clean !== false && !options.appendMode){
			this.clearNodes();

			let list = this.functions;
			for (let key in list)
				delete list[key];

			list = this.variables;
			for (let key in list)
				delete list[key];

			list = this.events.list;
			for (let key in list)
				delete list[key];
		}
		else if(!options.appendMode) this.clearNodes();

		this._importing = true;
		this.emit("json.importing", {appendMode: options.appendMode, raw: json});

		if(json.environments !== void 0 && !options.noEnv){
			let Env = Blackprint.Environment;
			let temp = json.environments;
			
			for (let key in temp) {
				Env.set(key, temp[key]);
			}
		}

		let mjs;
		if(json.functions != null) mjs = json.moduleJS.slice(0) || [];

		if(json.moduleJS !== void 0 && !options.noModuleJS){
			// wait for .min.mjs
			await Blackprint.loadModuleFromURL(json.moduleJS, {
				loadBrowserInterface: false
			});

			// wait for .sf.mjs and .sf.css if being loaded from code above
			if(window.sf && window.sf.loader){
				await sf.loader.task;
				await Promise.resolve();
			}
		}

		if(json.functions != null){
			let functions = json.functions;

			for (let key in functions){
				let temp = this.createFunction(key, functions[key]);

				// Required to be included on JSON export if this function isn't modified
				// ToDo: use better mapping for moduleJS
				temp.structure.moduleJS = mjs;
			}
		}

		if(json.variables != null){
			let variables = json.variables;

			for (let key in variables)
				this.createVariable(key, variables[key]);
		}

		if(json.events != null){
			let events = json.events;

			for (let path in events){
				this.events.createEvent(path, events[path]);
			}
		}

		var inserted = this.ifaceList;
		var handlers = []; // nodes
		let appendLength = options.appendMode ? inserted.length : 0;
		let reorderInputPort = [];
		let instance = json.instance;

		// Prepare all nodes depend on the namespace
		// before we create cables for them
		for(var namespace in instance){
			var nodes = instance[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				let temp = nodes[a];
				temp.i += appendLength;

				let iface = this.createNode(namespace, {
					id: temp.id, // Named ID (if exist)
					i: temp.i, // List Index
					data: temp.data, // if exist
					oldIface: oldIfaces[temp.id],
					input_d: temp.input_d,
					output_sw: temp.output_sw,
				}, handlers);

				if(temp.input != null){
					reorderInputPort.push({
						iface: iface,
						config: temp,
					});
				}

				// For custom function node
				await iface._BpFnInit?.();
			}
		}

		// Create cable only from output and property
		// > Important to be separated from above, so the cable can reference to loaded nodes
		for(var namespace in instance){
			var nodes = instance[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				let node = nodes[a];
				var iface = inserted[node.i];

				// Connect route cable
				if(node.route != null)
					iface.node.routes.routeTo(inserted[node.route.i + appendLength]);

				// If have output connection
				if(node.output !== void 0){
					var out = node.output;

					// Every output port that have connection
					for(var portName in out){
						var port = out[portName];

						var linkPortA = iface.output[portName];
						if(linkPortA === void 0){
							if(iface._enum === _InternalNodeEnum.BPFnInput){
								let target = this._getTargetPortType(iface.node.instance, 'input', port);
								linkPortA = iface.createPort(target, portName);

								if(linkPortA === void 0)
									throw new Error(`Can't create output port (${portName}) for function (${iface.parentInterface.node.bpFunction.id})`);
							}
							else if(iface._enum === _InternalNodeEnum.BPVarGet){
								let target = this._getTargetPortType(this, 'input', port);
								iface.useType(target);
								linkPortA = iface.output[portName];
							}
							else{
								console.error(`Node port not found for iface (index: ${iface.i}, title: ${iface.title}) with portname: ${portName}`);
								continue;
							}
						}

						// Current output's available targets
						for (var k = 0; k < port.length; k++) {
							var target = port[k];
							target.i += appendLength;

							var targetNode = inserted[target.i]; // iface

							if(linkPortA.isRoute){
								let cable = new Cable(linkPortA);
								cable.isRoute = true;
								cable.output = linkPortA;
								linkPortA.cables.push(cable);

								targetNode.node.routes.connectCable(cable);
								continue;
							}

							// output can only meet input port
							var linkPortB = targetNode.input[target.name];
							if(linkPortB === void 0){
								if(linkPortA.type === Blackprint.Types.Route){
									linkPortB = targetNode.node.routes;
								}
								else if(targetNode._enum === _InternalNodeEnum.BPFnOutput){
									linkPortB = targetNode.createPort(linkPortA, target.name);

									if(linkPortB === void 0)
										throw new Error(`Can't create output port (${target.name}) for function (${targetNode.parentInterface.node.bpFunction.id})`);
								}
								else if(targetNode._enum === _InternalNodeEnum.BPVarSet){
									targetNode.useType(linkPortA);
									linkPortB = targetNode.input[target.name];
								}
								else{
									console.error("Node port not found for", targetNode, "with name:", target.name);
									continue;
								}
							}

							linkPortA.connectPort(linkPortB);
						}
					}
				}
			}
		}

		// Fix input port cable order
		for (let i=0; i < reorderInputPort.length; i++) {
			let { iface, config } = reorderInputPort[i];
			let cInput = config.input;

			for (let key in cInput) {
				let port = iface.input[key];
				let cables = port.cables;
				let temp = new Array(cables.length);

				let conf = cInput[key];
				for (let a=0; a < conf.length; a++) {
					let { i: index, name } = conf[a];
					let targetIface = inserted[index + appendLength];
					
					for (let z=0; z < cables.length; z++) {
						let cable = cables[z];
						if(cable.output.name !== name || cable.output.iface !== targetIface) continue;

						temp[a] = cable;
						break;
					}
				}

				for (let a=0; a < temp.length; a++) {
					if(temp[a] == null) console.error(`Some cable failed to be ordered for (${iface.title}: ${key})`);
				}

				port.cables = temp;
			}
		}

		// Call node init after creation processes was finished
		for (var i = 0; i < handlers.length; i++){
			let ref = handlers[i];
			ref.init?.();

			let nodeClass = ref.constructor;
			if(nodeClass.initUpdate != null) this._tryInitUpdateNode(ref, nodeClass.initUpdate, false);
		}

		this._importing = false;
		this.emit("json.imported", {appendMode: options.appendMode, startIndex: appendLength, nodes: inserted, raw: json});
		await this.executionOrder.next();

		return inserted;
	}

	linkVariables(vars){
		for (let i=0; i < vars.length; i++) {
			let temp = vars[i];
			setDeepProperty(this.variables, temp.id.split('/'), temp);
			this._emit('variable.new', {
				reference: temp,
				scope: temp._scope,
				id: temp.id,
			});
		}
	}

	_getTargetPortType(instance, whichPort, targetNodes){
		let target = targetNodes[0]; // ToDo: check all target in case if it's supporting Union type
		let targetIface = instance.ifaceList[target.i];
		return targetIface[whichPort][target.name];
	}

	changeNodeId(iface, newId){
		if(this._locked_) throw new Error("This instance was locked");

		let sketch = iface.node.instance;
		let oldId = iface.id;
		if(oldId === newId || iface.importing) return;

		if(!!oldId){
			delete sketch.iface[oldId];
			delete sketch.ref[oldId];

			if(sketch.parentInterface != null)
				delete sketch.parentInterface.ref[oldId];
		}

		newId ??= '';
		iface.id = newId;

		if(newId !== ''){
			sketch.iface[newId] = iface;
			sketch.ref[newId] = iface.ref;

			if(sketch.parentInterface != null)
				sketch.parentInterface.ref[newId] = iface.ref;
		}

		iface.node.instance.emit('node.id.changed', {
			iface, old: oldId, now: newId
		});
	}

	getNodes(namespace){
		var ifaces = this.ifaceList;
		var got = [];

		for (var i = 0; i < ifaces.length; i++) {
			if(ifaces[i].namespace === namespace)
				got.push(ifaces[i].node);
		}

		return got;
	}

	// Check into main instance if this instance is created inside of a function
	_isInsideFunction(fnNamespace){
		if(this.rootInstance == null) return false;
		if(this.parentInterface.namespace === fnNamespace) return true;
		return this.parentInterface.node.instance._isInsideFunction(fnNamespace);
	}

	// rule = Blackprint.InitUpdate (from ./InitUpdate.js)
	_tryInitUpdateNode(node, rule, creatingNode){
		if((rule & InitUpdate.WhenCreatingNode)) { if(!creatingNode) return; }
		else if(creatingNode) return;

		// There are no cable connected when creating node
		// So.. let's skip these checks
		if(!creatingNode){
			if((rule & InitUpdate.NoRouteIn) && node.routes.in.length !== 0) return;
			if((rule & InitUpdate.NoInputCable)){
				let input = node.iface.input;
				for (let key in input) {
					if(input[key].cables.length !== 0) return;
				}
			}
		}

		node.update();
	}

	// ToDo: should we turn this into async and wait call to `iface.imported`
	createNode(namespace, options, handlers){
		if(this._locked_) throw new Error("This instance was locked");

		if(namespace === "BP/Fn/Input" && this.parentInterface != null){
			let funcMain = this.parentInterface;
			if(funcMain._proxyInput != null) {
				// Disallow to have more than one proxy input
				console.error("Function node can't have more than one proxy input");
				return null;
			}
		}

		var node, func;
		if(!(namespace.prototype instanceof Blackprint.Node)){
			func = getDeepProperty(Blackprint.nodes, namespace.split('/'));

			if(func === void 0){
				if(namespace.startsWith("BPI/F/")){
					func = getDeepProperty(this.functions, namespace.slice(6).split('/'));

					if(func != null){
						func = func.node;
					}
					else return console.error('Function node for', namespace, "was not found on target instance:", this) && void 0;
				}
				else return console.error('Node handler for', namespace, "was not found, maybe .registerNode() haven't being called?") && void 0;
			}
		}
		else{
			func = namespace;
			if(func.type === 'function') namespace = "BPI/F/" + func.namespace;
			else throw new Error("Unrecognized node");

			if(this._isInsideFunction(namespace)) throw new Error("Blackprint doesn't support recursive function node");
		}

		this.emit('node.creating', { namespace, options });

		// Call the registered func (from this.registerNode)
		if(isClass(func))
			node = new func(this);
		else func(node = new Blackprint.Node(this));

		// Disable data flow on any node ports
		if(this.disablePorts) node.disablePorts = true;

		// Obtain iface from the node
		let iface = node.iface;
		if(iface === void 0)
			throw new Error(namespace+"> 'node.iface' was not found, do you forget to call 'node.setInterface()'?");

		iface.namespace = namespace;
		options ??= {};

		var savedData = options.data;
		var defaultInputData = options.input_d;
		var portSwitches = options.output_sw;
		delete options.data;
		delete options.input_d;
		delete options.output_sw;

		// Assign the iface options
		Object.assign(iface, options);

		if(iface.id)
			this.iface[iface.id] = iface;

		if(options.oldIface !== void 0 && options.oldIface.namespace === iface.namespace)
			Blackprint.Interface._reuse(iface, options.oldIface);

		// Create the linker between the node and the iface
		else Blackprint.Interface._prepare(node, iface);

		if(iface.id){
			this.ref[iface.id] = iface.ref;

			let parent = iface.node.bpFunction;
			if(parent != null)
				parent.rootInstance.ref[iface.id] = iface.ref;
		}

		if(iface.i !== void 0)
			this.ifaceList[iface.i] = iface;
		else this.ifaceList.push(iface);

		node.initPorts?.(savedData);

		if(defaultInputData != null)
			iface._importInputs(defaultInputData);

		if(portSwitches != null){
			for (let key in portSwitches) {
				let temp = portSwitches[key];
				let ref = iface.output[key];

				if((temp | 1) === 1)
					BP_Port.StructOf.split(ref);

				if((temp | 2) === 2)
					ref.allowResync = true;
			}
		}

		// Assign the saved options if exist
		// Must be called here to avoid port trigger
		iface.importing = false;
		iface.imported?.(savedData);
		node.imported?.(savedData);

		if(handlers !== void 0)
			handlers.push(node);
		else {
			if(node.init !== void 0)
				node.init();

			if(iface.init !== void 0)
				iface.init();
		}

		if(func.initUpdate != null) this._tryInitUpdateNode(node, func.initUpdate, true);

		this.emit('node.created', { iface });
		return iface;
	}

	createVariable(id, options){
		if(this._locked_) throw new Error("This instance was locked");
		if(/\s/.test(id))
			throw new Error("Id can't have space character: " + `'${id}'`);

		let ids = id.split('/');
		let lastId = ids[ids.length - 1];
		let parentObj = getDeepProperty(this.variables, ids, 1);

		if(parentObj != null && lastId in parentObj){
			if(parentObj[lastId].isShared) return;

			parentObj[lastId].destroy();
			delete parentObj[lastId];
		}

		// BPVariable = ./nodes/Var.js
		let temp = new BPVariable(id, options);
		setDeepProperty(this.variables, ids, temp);

		temp._scope = VarScope.Public;
		this._emit('variable.new', {
			reference: temp,
			scope: temp._scope,
			id: temp.id,
		});

		return temp;
	}

	renameVariable(from, to, scopeId){
		from = from.replace(/^\/|\/$/gm, '').replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,.<>?]+/g, '_');
		to = to.replace(/^\/|\/$/gm, '').replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,.<>?]+/g, '_');

		let instance, varsObject;
		if(scopeId === VarScope.Public) {
			instance = this.rootInstance ?? this;
			varsObject = instance.variables;
		}
		else if(scopeId === VarScope.Private) {
			instance = this;
			if(instance.rootInstance == null) throw new Error("Can't rename private function variable from main instance");
			varsObject = instance.variables;
		}
		else if(scopeId === VarScope.Shared) return; // Already handled on nodes/Fn.js

		// Old variable object
		let ids = from.split('/');
		let oldObj = getDeepProperty(varsObject, ids);
		if(oldObj == null)
			throw new Error(`Variable with name '${from}' was not found`);

		// New target variable object
		let ids2 = to.split('/');
		if(getDeepProperty(varsObject, ids2) != null)
			throw new Error(`Variable with similar name already exist in '${to}'`);

		let map = oldObj.used;
		for (let i=0; i < map.length; i++) {
			let iface = map[i];
			iface.title = iface.data.name = to;
		}

		oldObj.id = oldObj.title = to;

		deleteDeepProperty(varsObject, ids, true);
		setDeepProperty(varsObject, ids2, oldObj);

		if(scopeId === VarScope.Private) {
			instance._emit('variable.renamed', {
				old: from, now: to, bpFunction: this.parentInterface.node.bpFunction, scope: scopeId
			});
		}
		else instance._emit('variable.renamed', {old: from, now: to, reference: oldObj, scope: scopeId });
	}

	deleteVariable(namespace, scopeId){
		let varsObject, instance = this;
		if(scopeId === VarScope.Public) {
			instance = this.rootInstance ?? this;
			varsObject = instance.variables;
		}
		else if(scopeId === VarScope.Private) varsObject = instance.variables;
		else if(scopeId === VarScope.Shared) varsObject = instance.sharedVariables;
	
		let path = namespace.split('/');
		let oldObj = getDeepProperty(varsObject, path);
		if(oldObj == null) return;
		oldObj.destroy();

		let bpFunction = this.parentInterface?.node.bpFunction;

		deleteDeepProperty(varsObject, path, true);
		this._emit('variable.deleted', {scope: scopeId, id: oldObj.id, reference: oldObj, bpFunction});
	}

	createFunction(id, options){
		if(this._locked_) throw new Error("This instance was locked");
		if(/\s/.test(id))
			throw new Error("Id can't have space character: " + `'${id}'`);

		let ids = id.split('/');
		let lastId = ids[ids.length - 1];
		let parentObj = getDeepProperty(this.functions, ids, 1);

		if(parentObj != null && lastId in parentObj){
			parentObj[lastId].destroy();
			delete parentObj[lastId];
		}

		// ToDo: remove this after v1.0 released
		if(options.structure != null && options.structure.instance == null){
			options.structure = this._jsonToNew(options.structure);
		}

		// BPFunction = ./nodes/Fn.js
		let temp = new BPFunction(id, options, this);
		setDeepProperty(this.functions, ids, temp);

		if(options.vars != null){
			let vars = options.vars;
			for (let i=0; i < vars.length; i++) {
				temp.createVariable(vars[i], {scope: VarScope.Shared});
			}
		}

		if(options.privateVars != null){
			let privateVars = options.privateVars;
			for (let i=0; i < privateVars.length; i++) {
				temp.createVariable(privateVars[i], {scope: VarScope.Private});
			}
		}

		this._emit('function.new', {
			reference: temp,
		});
		return temp;
	}

	renameFunction(from, to){
		from = from.replace(/^\/|\/$/gm, '').replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,.<>?]+/g, '_');
		to = to.replace(/^\/|\/$/gm, '').replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,.<>?]+/g, '_');

		// Old function object
		let ids = from.split('/');
		let oldObj = getDeepProperty(this.functions, ids);
		if(oldObj == null)
			throw new Error(`Function with name '${from}' was not found`);

		// New target function object
		let ids2 = to.split('/');
		if(getDeepProperty(this.functions, ids2) != null)
			throw new Error(`Function with similar name already exist in '${to}'`);

		let map = oldObj.used;
		for (let i=0; i < map.length; i++) {
			let iface = map[i];
			iface.namespace = 'BPI/F/'+to;
			if(iface.title === from) iface.title = to;
		}

		if(oldObj.title === from) oldObj.title = to;
		oldObj.id = to;

		deleteDeepProperty(this.functions, ids, true);
		setDeepProperty(this.functions, ids2, oldObj);

		this._emit('function.renamed', {
			old: from, now: to, reference: oldObj,
		});
	}

	deleteFunction(id){
		let path = id.split('/');
		let oldObj = getDeepProperty(this.functions, path);
		if(oldObj == null) return;
		oldObj.destroy();

		deleteDeepProperty(this.functions, path, true);
		this._emit('function.deleted', {id: oldObj.id, reference: oldObj});
	}

	_log(data){
		data.instance = this;

		if(this.rootInstance != null)
			this.rootInstance._emit('log', data);
		else this._emit('log', data);
	}

	_emit(evName, data){
		this.emit(evName, data);
		if(this.parentInterface == null) return;

		let rootInstance = this.parentInterface.node.bpFunction.rootInstance;
		if(rootInstance._remote == null) return;
		rootInstance.emit(evName, data);
	}

	_jsonToNew(obj){
		console.error("The exported instance (JSON) format was deprecated, please re-export the JSON by importing your JSON to the editor and export it. Your current JSON format may not work after version v1.0. Other engine than JavaScript may also not support the old format.");

		let newData = { instance: obj };
		let metadata = obj._;
		delete obj._;

		if(metadata){
			newData.moduleJS = metadata.moduleJS;
			newData.functions = metadata.functions;
			newData.variables = metadata.variables;
			newData.events = metadata.events;
			newData.environments = metadata.env;
		}

		return newData;
	}

	/*
	Mark this instance as locked, nodes/cable connection can't be modified and optimize for performance
	Any unconnected output port will no longer update `port.value` and 'value' event will not be emitted
	`port.disabled` flag will be set to `true` or get deleted from the node
	*/
	lock(){
		console.log("Instance lock feature is still experimental, this may get deleted/changed anytime. Feel free to create a discussion if you need this feature.");

		this._locked_ = true;
		let list = this.ifaceList;

		for (let i=0; i < list.length; i++) {
			let iface = list[i];
			if(iface._enum === _InternalNodeEnum.BPFnMain)
				iface.bpInstance.lock();

			// Check and disable any unconnected ports
			let { output } = iface; // Port Interface
			for (let key in output) {
				let port = output[key];

				// Skip port created by from `StructOf` port feature and it's not being splitted too
				if(port._structSplitted && port.structList == null) continue;

				// Transverse over all output port that have `.structList` and disable any unconnected port
				// In JavaScript we will also remove from `.structList`
				let { struct, structList } = port;
				if(structList != null){
					for (let a=structList.length-1; a >= 0; a--) {
						let iPort = output[struct[structList[a]]._name];
						if(iPort.cables.length === 0){
							// iface.node.deletePort('output', iPort.name);
							iPort.disabled = true;
							structList.splice(a, 1);
						}
					}

					// Unsplit any splitted port for 'StructOf' port feature to improve performance if no connection
					if(structList.length === 0){
						BP_Port.StructOf.unsplit(port);
						port.disabled = true;
					}
				}
				else if(port.cables.length === 0){
					port.disabled = true;
				}
			}
		}
	}

	destroy(){
		this._locked_ = false;
		this._destroyed_ = true;
		this.clearNodes();
		
		Blackprint.off('_eventInstance.new', this._eventsInsNew);
		Blackprint.off('environment.deleted', this._envDeleted);
		this.emit('destroy');
	}
}

Blackprint.Engine.CustomEvent = CustomEvent;

// This need to be replaced if you want to use this to solve conflicting nodes
// - throw error = stop any import process
// - return String (must be either old or now) = use nodes from that URL instead
Blackprint.onModuleConflict = async map => {
	let report = '\n';
	for(let [key, val] of map){
		report += `Conflicting nodes with similar name was found\n - Namespace: ${val.pending[0].namespace}\n - First register from: ${val.oldURL}\n - Trying to register again from: ${val.newURL}`;
	}

	throw report;
};

Blackprint.createVariable = function(namespace, options){
	if(/\s/.test(namespace))
		throw new Error("Namespace can't have space character: " + `'${namespace}'`);

	let temp = new BPVariable(namespace, options);
	temp._scope = VarScope.Public;
	temp.isShared = true;

	return temp;
}

// Use this to always use the newest module
// Blackprint.onModuleConflict = async map => Object.entries(map).forEach(v => v.useOld = false);

onModuleConflict.pending = new Map();
Blackprint._utils.onModuleConflict = onModuleConflict;
function onModuleConflict(namespace, old, now, _call){
	let info = onModuleConflict.pending.get(now);
	if(info == null){
		info = {pending:[], oldURL: old, newURL: now, useOld: false};
		onModuleConflict.pending.set(now, info);
	}

	info.pending.push({namespace, _call});

	if(onModuleConflict.async)
		return onModuleConflict.async;

	return onModuleConflict.async = (async () => {
		let { modulesURL, _modulesURL } = Blackprint;

		try {
			await Blackprint.onModuleConflict(onModuleConflict.pending);
		} catch(e){
			onModuleConflict.async = null;

			// Delete new URL as it's not load any new nodes
			for(let [key, info] of onModuleConflict.pending){
				let i = _modulesURL.indexOf(modulesURL[key]);
				if(i !== -1)
					_modulesURL.splice(i, 1);

				delete modulesURL[key];
			}

			onModuleConflict.pending.clear();
			Blackprint.emit('error', {type:'module_conflict', message: `Module conflict can't be resolved`});
			throw e;
		}

		for(let [key, info] of onModuleConflict.pending){
			if(info.useOld){
				let i = _modulesURL.indexOf(modulesURL[key]);
				if(i !== -1)
					_modulesURL.splice(i, 1);

				delete modulesURL[key];
				continue;
			}

			// Delete old URL nodes before registering new nodes
			Blackprint.deleteModuleFromURL(old);

			// Call all the register callback
			info.pending.forEach(v => v._call());
		}

		onModuleConflict.async = null;
		onModuleConflict.pending.clear();
	})();
}

// For storing registered nodes
Blackprint.nodes = {
	BP: {hidden: true} // Internal nodes
};

// This function will be replaced when using Blackprint Sketch
//
// Register node handler
// Callback function will get node and iface
// - node = Blackprint binding
// - iface = ScarletsFrame binding <~> element
Blackprint.registerNode = function(namespace, func){
	if(isClass(func) && !(func.prototype instanceof Blackprint.Node))
		throw new Error(".registerNode: Class must be instance of Blackprint.Node");

	if(this._scopeURL !== void 0){
		let temp = Blackprint.modulesURL[this._scopeURL];

		if(temp === void 0){
			temp = Blackprint.modulesURL[this._scopeURL] = { _url: this._scopeURL };
			Blackprint.emit('module.added', {url: this._scopeURL});
			Blackprint._modulesURL.push(temp);
		}

		temp[namespace] = true;
	}

	// Return for Decorator
	if(func === void 0){
		return claz => {
			this.registerNode(namespace, claz);
			return claz;
		}
	}

	namespace = namespace.split('/');

	let isExist = getDeepProperty(Blackprint.nodes, namespace);
	if(isExist){
		if(this._scopeURL && isExist._scopeURL !== this._scopeURL){
			let _call = ()=> this.registerNode.apply(this, arguments);
			onModuleConflict(namespace.join('/'), isExist._scopeURL, this._scopeURL, _call);
			return;
		}

		if(isExist._hidden)
			func._hidden = true;

		if(isExist._disabled)
			func._disabled = true;
	}

	func._scopeURL = this._scopeURL;
	setDeepProperty(Blackprint.nodes, namespace, func);
}

let _classIfaceError = ".registerInterface: Class must be instance of Blackprint.Interface";
Blackprint._iface = {'BP/default': NoOperation};
Blackprint.registerInterface = function(templatePath, options, func){
	if(templatePath.slice(0, 5) !== 'BPIC/')
		throw new Error("The first parameter of 'registerInterface' must be started with BPIC to avoid name conflict. Please name the interface similar with 'templatePrefix' for your module that you have set on 'blackprint.config.js'.");

	if(func === void 0){
		func = options;
		options = {};
	}
	else if(options.extend !== void 0){
		if(!(options.extend.prototype instanceof Blackprint.Interface))
			throw new Error(_classIfaceError);

		func._extend = options.extend;
	}

	// Return for Decorator
	if(func === void 0){
		return claz => {
			this.registerInterface(templatePath, options, claz);
			return claz;
		}
	}

	// Pause registration if have conflict
	let info = onModuleConflict.pending.get(this._scopeURL);
	if(info != null) return info.pending.push({
		namespace: templatePath,
		_call: ()=> this.registerInterface.apply(this, arguments),
	});

	if(isClass(func) && !(func.prototype instanceof Blackprint.Interface))
		throw new Error(_classIfaceError);

	Blackprint._iface[templatePath] = func;
}

Blackprint._events = {};
Blackprint.registerEvent = function(namespace, options){
	if(/\s/.test(namespace))
		throw new Error("Namespace can't have space character: " + `'${namespace}'`);

	let { schema } = options;
	if(schema == null)
		throw new Error("Registering an event must have a schema. If the event doesn't have a schema or dynamically created from an instance you may not need to do this registration.");

	for (let key in schema) {
		let obj = schema[key];

		// Must be a data type (class constructor)
		// or type from Blackprint.Port.{Feature}
		if(!isClass(obj) && obj !== Blackprint.Types.Any && obj.portFeature == null){
			throw new Error(`Unsupported schema type for field '${key}' in '${namespace}'`);
		}
	}

	Blackprint._events[namespace] = new InstanceEvent(options);
	Blackprint.emit('_eventInstance.register', { namespace });
}

var Engine = Blackprint.Engine;