Blackprint.Engine = class Engine{
	static handler = {};
	static interface = {default: NoOperation};

	// Register node handler
	// Callback function will get node and iface
	// - node = Blackprint binding
	// - iface = ScarletsFrame binding <~> element
	static registerNode(namespace, func){
		deepProperty(Engine.handler, namespace.split('/'), func);
	}

	static registerInterface(nodeType, options, func){
		if(func === void 0)
			func = options;
		else if(options.extend !== void 0)
			func.extend = options.extend;

		Engine.interface[nodeType] = func;
	}

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

		var version = json.version;
		delete json.version;

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

		// Create cable only from outputs and properties
		// > Important to be separated from above, so the cable can reference to loaded nodes
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				var node = inserted[nodes[a].i];

				// If have outputs connection
				if(nodes[a].outputs !== void 0){
					var out = nodes[a].outputs;

					// Every outputs port that have connection
					for(var portName in out){
						var linkPortA = node.outputs[portName];
						if(linkPortA === void 0){
							console.error("Node port not found for", node, "with name:", portName);
							continue;
						}

						var port = out[portName];

						// Current outputs's available targets
						for (var k = 0; k < port.length; k++) {
							var target = port[k];
							var targetNode = inserted[target.i];

							// Outputs can only meet input port
							var linkPortB = targetNode.inputs[target.name];
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
		var func = deepProperty(Engine.handler, namespace.split('/'));
		if(func === void 0)
			return console.error('Node handler for', namespace, "was not found, maybe .registerNode() haven't being called?") && void 0;

		// Processing scope is different with iface scope
		var node = {}, iface = {interface:'default', title:'No Title', description:''};

		iface.node = node;
		iface.namespace = namespace;
		iface.importing = true;

		Object.setPrototypeOf(iface, Engine.Node.prototype);

		// Call the registered func (from this.registerNode)
		func(node, iface);

		if(Engine.interface[iface.interface] === void 0)
			return console.error('Node interface for', iface.interface, "was not found, maybe .registerInterface() haven't being called?") && void 0;

		// Initialize for interface
		Engine.Node.interface(Engine.interface[iface.interface], iface);

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

var Engine = Blackprint.Engine;