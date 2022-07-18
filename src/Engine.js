Blackprint.Engine = class Engine extends CustomEvent {
	constructor(){
		super();
		this.ifaceList = []; // IFace

		this.variables = {}; // { category => { name, value, type, childs:{ category } } }
		this.functions = {}; // { category => { name, variables, input, output, used: [], node, description, childs:{ category } } }

		this.iface = {}; // { id => IFace }
		this.ref = {}; // { id => Port references }
	}

	deleteNode(iface){
		let list = this.ifaceList;
		var i = list.indexOf(iface);

		if(i !== -1)
			list.splice(i, 1);
		else return this.emit('error', {
			type: 'node_delete_not_found',
			data: {iface}
		});

		iface._bpDestroy = true;

		let eventData = { iface };
		this.emit('node.delete', eventData);

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

		let parent = iface.node.instance._funcMain;
		if(parent != null)
			delete parent.ref[iface.id];

		this.emit('node.deleted', eventData);
	}

	clearNodes(){
		let list = this.ifaceList;
		for (var i = 0; i < list.length; i++) {
			let iface = list[i];

			iface.node.destroy && iface.node.destroy();
			iface.destroy && iface.destroy();
		}

		this.ifaceList.splice(0);
		this.iface = {};
		this.ref = {};
	}

	async importJSON(json, options){
		if(window.sf && window.sf.loader)
			await window.sf.loader.task;

		if(json.constructor !== Object)
			json = JSON.parse(json);

		let oldIfaces = this.iface;

		if(options === void 0) options = {};
		if(!options.appendMode) this.clearNodes();

		var metadata = json._;
		delete json._;

		if(metadata !== void 0){
			if(metadata.env !== void 0 && !options.noEnv){
				let Env = Blackprint.Environment;
				let temp = metadata.env;
				
				for (let key in temp) {
					Env.set(key, temp[key]);
				}
			}

			let mjs;
			if(metadata.functions != null) mjs = metadata.moduleJS.slice(0) || [];

			if(metadata.moduleJS !== void 0 && !options.noModuleJS){
				// wait for .min.mjs
				await Blackprint.loadModuleFromURL(metadata.moduleJS, {
					loadBrowserInterface: false
				});

				// wait for .sf.mjs and .sf.css if being loaded from code above
				if(window.sf && window.sf.loader){
					await sf.loader.task;
					await Promise.resolve();
				}
			}

			if(metadata.functions != null){
				let functions = metadata.functions;

				for (let key in functions){
					let temp = this.createFunction(key, functions[key]);

					// Required to be included on JSON export if this function isn't modified
					// ToDo: use better mapping for moduleJS
					let other = temp.structure._ = {};
					other.moduleJS = mjs;
				}
			}

			if(metadata.variables != null){
				let variables = metadata.variables;

				for (let key in variables)
					this.createVariable(key, variables[key]);
			}
		}

		var inserted = this.ifaceList;
		var handlers = []; // nodes
		let appendLength = options.appendMode ? inserted.length : 0;

		// Prepare all nodes depend on the namespace
		// before we create cables for them
		for(var namespace in json){
			var nodes = json[namespace];

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
					output_sp: temp.output_sp,
				}, handlers);

				// For custom function node
				await iface._BpFnInit?.();
			}
		}

		// Create cable only from output and property
		// > Important to be separated from above, so the cable can reference to loaded nodes
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				let node = nodes[a];
				var iface = inserted[node.i];

				if(node.route != null)
					iface.node.routes.routeTo(inserted[node.route.i]);

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
								linkPortA = iface.addPort(target, portName);

								if(linkPortA === void 0)
									throw new Error(`Can't create output port (${portName}) for function (${iface._funcMain.node._funcInstance.id})`);
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

							var targetNode = inserted[target.i];

							// output can only meet input port
							var linkPortB = targetNode.input[target.name];
							if(linkPortB === void 0){
								if(targetNode._enum === _InternalNodeEnum.BPFnOutput){
									linkPortB = targetNode.addPort(linkPortA, target.name);

									if(linkPortB === void 0)
										throw new Error(`Can't create output port (${target.name}) for function (${targetNode._funcMain.node._funcInstance.id})`);
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

		// Call node init after creation processes was finished
		for (var i = 0; i < handlers.length; i++)
			handlers[i].init?.();

		this.emit("json.imported", {appendMode: options.appendMode, nodes: inserted, raw: json});
		return inserted;
	}

	_getTargetPortType(instance, whichPort, targetNodes){
		let target = targetNodes[0]; // ToDo: check all target in case if it's supporting Union type
		let targetIface = instance.ifaceList[target.i];
		return targetIface[whichPort][target.name];
	}

	changeNodeId(iface, newId){
		let sketch = iface.node.instance;
		let oldId = iface.id;
		if(oldId === newId || iface.importing) return;

		if(!!oldId){
			delete sketch.iface[oldId];
			delete sketch.ref[oldId];

			if(sketch._funcMain != null)
				delete sketch._funcMain.ref[oldId];
		}

		newId ??= '';
		iface.id = newId;

		if(newId !== ''){
			sketch.iface[newId] = iface;
			sketch.ref[newId] = iface.ref;

			if(sketch._funcMain != null)
				sketch._funcMain.ref[newId] = iface.ref;
		}

		iface.node.instance.emit('node.id.changed', {
			iface, from: oldId, to: newId
		});
	}

	getNode(id){
		if(id == null) throw "ID couldn't be null or undefined";

		var ifaces = this.ifaceList;
		if(id.constructor === Number)
			return ifaces[id].node;

		for (var i = 0; i < ifaces.length; i++) {
			if(ifaces[i].id === id)
				return ifaces[i].node;
		}
	}

	// ToDo: Improve
	getNodes(namespace){
		var ifaces = this.ifaceList;
		var got = [];

		for (var i = 0; i < ifaces.length; i++) {
			if(ifaces[i].namespace === namespace)
				got.push(ifaces[i].node);
		}

		return got;
	}

	// ToDo: turn this into async and wait call to `iface.imported`
	createNode(namespace, options, handlers){
		var node, func;
		if(!(namespace.prototype instanceof Blackprint.Node)){
			func = deepProperty(Blackprint.nodes, namespace.split('/'));

			if(func === void 0){
				if(namespace.startsWith("BPI/F/")){
					func = deepProperty(this.functions, namespace.slice(6).split('/'));

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
			if(func.type === 'function')
				namespace = "BPI/F/" + func.namespace;
			else throw new Error("Unrecognized node");
		}

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
		var splittedPort = options.output_sp;
		delete options.data;
		delete options.input_d;
		delete options.output_sp;

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

			let parent = iface.node.instance._funcMain;
			if(parent != null)
				parent.ref[iface.id] = iface.ref;
		}

		if(iface.i !== void 0)
			this.ifaceList[iface.i] = iface;
		else this.ifaceList.push(iface);

		if(defaultInputData != null)
			iface._importInputs(defaultInputData);

		if(splittedPort != null){
			for (let key in splittedPort) {
				Blackprint.Port.StructOf.split(iface.output[key]);
			}
		}

		// Assign the saved options if exist
		// Must be called here to avoid port trigger
		iface.importing = false;
		iface.imported?.(savedData);
		node.imported?.(savedData);

		if(handlers !== void 0)
			handlers.push(node);
		else if(node.init !== void 0)
			node.init();

		return iface;
	}

	createVariable(id, options){
		if(id in this.variables){
			this.variables[id].destroy();
			delete this.variables[id];
		}

		// deepProperty

		// BPVariable = ./nodes/Var.js
		let temp = this.variables[id] = new BPVariable(id, options);
		this.emit('variable.new', temp);

		return temp;
	}

	createFunction(id, options){
		if(id in this.functions){
			this.functions[id].destroy();
			delete this.functions[id];
		}

		// BPFunction = ./nodes/Fn.js
		let temp = this.functions[id] = new BPFunction(id, options, this);

		if(options.vars != null){
			let vars = options.vars;
			for (let i=0; i < vars.length; i++) {
				temp.createVariable(vars[i], {scope: VarScope.Shared});
			}
		}

		if(options.privateVars != null){
			let privateVars = options.privateVars;
			for (let i=0; i < privateVars.length; i++) {
				temp.addPrivateVars(privateVars[i]);
			}
		}

		this.emit('function.new', temp);
		return temp;
	}

	_log(data){
		data.instance = this;

		if(this._mainInstance != null)
			this._mainInstance.emit('log', data);
		else this.emit('log', data);
	}

	destroy(){
		this.iface = {};
		this.ifaceList.splice(0);
		this.clearNodes();
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
			Blackprint.emit('moduleAdded', {url: this._scopeURL});
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

	let isExist = deepProperty(Blackprint.nodes, namespace);
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
	deepProperty(Blackprint.nodes, namespace, func);
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

var Engine = Blackprint.Engine;