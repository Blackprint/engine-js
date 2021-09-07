Blackprint.Engine = class Engine{
	iface = {};
	ifaceList = []; // ToDo: Improve
	settings = {};

	clearNodes(){
		this.iface = {};
		this.ifaceList.splice(0);
	}

	async importJSON(json){
		if(window.sf && window.sf.loader)
			await window.sf.loader.task;

		if(json.constructor !== Object)
			json = JSON.parse(json);

		var metadata = json._;
		delete json._;

		if(metadata !== void 0){
			if(metadata.env !== void 0){
				let temp = Blackprint.Environment;
				Object.assign(temp.map, metadata.env);
				temp.list = Object.entries(temp.map).map(([k, v]) => ({key: k, value: v}));
			}

			if(metadata.moduleJS !== void 0){
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
		var handlers = [];

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
				}, handlers);
			}
		}

		// Create cable only from output and property
		// > Important to be separated from above, so the cable can reference to loaded nodes
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				var node = inserted[nodes[a].i];

				// If have output connection
				if(nodes[a].output !== void 0){
					var out = nodes[a].output;

					// Every output port that have connection
					for(var portName in out){
						var linkPortA = node.output[portName];
						if(linkPortA === void 0){
							console.error("Node port not found for", node, "with name:", portName);
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

		// Call handler init after creation processes was finished
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

	settings(which, val){
		this.settings[which] = val;
	}

	createNode(namespace, options, handlers){
		var func = deepProperty(Blackprint.nodes, namespace.split('/'));
		if(func === void 0)
			return console.error('Node handler for', namespace, "was not found, maybe .registerNode() haven't being called?") && void 0;

		// Processing scope is different with iface scope
		var node = {}, iface = {
			interface:'default',
			title:'No Title',
			namespace,
			importing:true,
			env: Blackprint.Environment.map
		};

		iface.node = node;
		Object.setPrototypeOf(iface, Engine.Node.prototype);

		// Call the registered func (from this.registerNode)
		func(node, iface);

		if(Blackprint.interface[iface.interface] === void 0)
			return console.error('Node interface for', iface.interface, "was not found, maybe .registerInterface() haven't being called?") && void 0;

		// Initialize for interface
		Engine.Node.interface(Blackprint.interface[iface.interface], iface);

		var savedData = options.data;
		delete options.data;

		// Assign the iface options
		Object.assign(iface, options);

		// Assign the saved options if exist
		// Must be called here to avoid port trigger
		iface.imported && iface.imported(savedData);

		if(iface.id !== void 0)
			this.iface[iface.id] = iface;

		// Create the linker between the node and the iface
		Engine.Node.prepare(node, iface);

		if(iface.i !== void 0)
			this.ifaceList[iface.i] = iface;
		else this.ifaceList.push(iface);

		iface.importing = false;
		node.imported && node.imported(savedData);

		if(handlers !== void 0)
			handlers.push(node);
		else if(node.init !== void 0)
			node.init();

		return iface;
	}
}

// ToDo: Migrate some code to Blackprint Sketch
if(isBrowser){
	Blackprint.modulesURL = {};
	Blackprint._modulesURL = [];
}

// Register node handler
// Callback function will get node and iface
// - node = Blackprint binding
// - iface = ScarletsFrame binding <~> element
Blackprint.nodes = {};
Blackprint.registerNode = function(namespace, func){
	let hasScarletsFrame = isBrowser && sf.Obj;

	// ToDo: Migrate some code to Blackprint Sketch
	if(hasScarletsFrame && this._scopeURL !== void 0){
		let temp = Blackprint.modulesURL[this._scopeURL];

		if(temp === void 0){
			Blackprint.modulesURL[this._scopeURL] = {};
			temp = Blackprint.modulesURL[this._scopeURL];
			temp._nodeLength = 0;
			temp._url = this._scopeURL;
			Blackprint._modulesURL.push(temp);
		}

		temp[namespace] = true;
	}

	namespace = namespace.split('/');

	// Add with sf.Obj to trigger ScarletsFrame object binding update
	if(hasScarletsFrame && !(namespace[0] in Blackprint.nodes))
		sf.Obj.set(Blackprint.nodes, namespace[0], {});

	let isExist = deepProperty(Blackprint.nodes, namespace);
	if(isExist){
		if(this._scopeURL && isExist._scopeURL !== this._scopeURL){
			throw `Conflicting nodes with similar name was found\nNamespace: ${namespace.join('/')}\nFirst register from: ${isExist._scopeURL}\nTrying to register again from: ${this._scopeURL}`;
		}

		if(isExist._hidden)
			func._hidden = true;

		if(isExist._disabled)
			func._disabled = true;
	}
	else if(hasScarletsFrame && this._scopeURL !== void 0){
		let ref = Blackprint.modulesURL[this._scopeURL];
		if(ref._nodeLength === void 0)
			ref._nodeLength = 0;
		ref._nodeLength++;

		ref = Blackprint.nodes[namespace[0]];
		if(ref._length === void 0){
			Object.defineProperty(ref, '_length', {writable: true, value: 0});
			Object.defineProperty(ref, '_visibleNode', {writable: true, value: 0});
		}

		ref._length++;
		ref._visibleNode++;
	}

	func._scopeURL = this._scopeURL;
	deepProperty(Blackprint.nodes, namespace, func, hasScarletsFrame && function(obj){
		if(obj._length !== void 0)
			obj._length++;
		else{
			Object.defineProperty(obj, '_length', {writable: true, value: 1});
			Object.defineProperty(obj, '_visibleNode', {writable: true, value: 1});
		}
	});
}

Blackprint.interface = {default: NoOperation};
Blackprint.registerInterface = function(nodeType, options, func){
	if(func === void 0)
		func = options;
	else if(options.extend !== void 0)
		func.extend = options.extend;

	Blackprint.interface[nodeType] = func;
}

var Engine = Blackprint.Engine;