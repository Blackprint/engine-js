Blackprint.Engine = class Engine extends CustomEvent {
	constructor(){
		super();
		this.ifaceList = []; // IFace

		this.variables = {}; // { name => { value, type, title, category } }
		this.functions = {}; // { name => { variables, input, output, used: [], node, title, category, description } }

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

		// Delete reference
		delete this.iface[iface.id];
		delete this.ref[iface.id];
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
				let temp = Blackprint.Environment;
				Object.assign(temp.map, metadata.env);
				temp.list = Object.entries(temp.map).map(([k, v]) => ({key: k, value: v}));
			}

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
		}

		var inserted = this.ifaceList;
		var handlers = []; // nodes

		// Prepare all nodes depend on the namespace
		// before we create cables for them
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				let temp = nodes[a];
				this.createNode(namespace, {
					id: temp.id, // Named ID (if exist)
					i: temp.i, // List Index
					data: temp.data, // if exist
					oldIface: oldIfaces[temp.id],
				}, handlers);
			}
		}

		// Create cable only from output and property
		// > Important to be separated from above, so the cable can reference to loaded nodes
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				var iface = inserted[nodes[a].i];

				// If have output connection
				if(nodes[a].output !== void 0){
					var out = nodes[a].output;

					// Every output port that have connection
					for(var portName in out){
						var linkPortA = iface.output[portName];
						if(linkPortA === void 0){
							console.error("Node port not found for", iface, "with name:", portName);
							continue;
						}

						var port = out[portName];

						// Current output's available targets
						for (var k = 0; k < port.length; k++) {
							var target = port[k];
							var targetNode = inserted[target.i];

							// output can only meet input port
							var linkPortB = targetNode.input[target.name];
							if(linkPortB === void 0){
								console.error("Node port not found for", targetNode, "with name:", target.name);
								continue;
							}

							var cable = new Engine.Cable(linkPortA, linkPortB);
							linkPortA.cables.push(cable);
							linkPortB.cables.push(cable);

							cable.connecting();
						}
					}
				}
			}
		}

		// Call node init after creation processes was finished
		for (var i = 0; i < handlers.length; i++){
			let temp = handlers[i];
			temp.init && temp.init();
		}
	}

	getNode(id){
		if(id == null) throw "ID couldn't be null or undefined";

		if(id.constructor === Number)
			return this.ifaceList[id];

		var ifaces = this.ifaceList;
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

	createNode(namespace, options, handlers){
		var func = deepProperty(Blackprint.nodes, namespace.split('/'));
		if(func === void 0)
			return console.error('Node handler for', namespace, "was not found, maybe .registerNode() haven't being called?") && void 0;

		// Call the registered func (from this.registerNode)
		var node;
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
		delete options.data;

		// Assign the iface options
		Object.assign(iface, options);

		if(iface.id !== void 0){
			this.iface[iface.id] = iface;
			this.ref[iface.id] = iface.ref;
		}

		if(options.oldIface !== void 0 && options.oldIface.namespace === iface.namespace)
			Blackprint.Interface._reuse(iface, options.oldIface);

		// Create the linker between the node and the iface
		else Blackprint.Interface._prepare(node, iface);

		if(iface.i !== void 0)
			this.ifaceList[iface.i] = iface;
		else this.ifaceList.push(iface);

		// Assign the saved options if exist
		// Must be called here to avoid port trigger
		iface.importing = false;
		iface.imported && iface.imported(savedData);
		node.imported && node.imported(savedData);

		if(handlers !== void 0)
			handlers.push(node);
		else if(node.init !== void 0)
			node.init();

		return iface;
	}

	createVariable(id, type){
		if(id in this.variables)
			throw new Error("Variable id already exist");

		// BPVariable = ./nodes/Var.js
		this.variables[id] = new BPVariable(id, type);
	}

	createFunction(id){
		if(id in this.functions)
			throw new Error("Function id already exist");

		// BPFunction = ./nodes/Fn.js
		this.functions[id] = new BPFunction(id);
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
			onModuleConflict.pending.clear();

			// Delete new URL as it's not load any new nodes
			for(let [key, info] of onModuleConflict.pending){
				let i = _modulesURL.indexOf(modulesURL[key]);
				if(i !== -1)
					_modulesURL.splice(i, 1);

				delete modulesURL[key];
			}

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
			info.pending._call.forEach(v => v());
		}

		onModuleConflict.async = null;
		onModuleConflict.pending.clear();
	})();
}

// For storing registered nodes
Blackprint.nodes = {
	BP: {hidden: true} // Internal nodes, ToDo
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