Blackprint.Interpreter = class Interpreter{
	static handler = {};
	static interface = {default: NoOperation};

	// Register node handler
	// Callback function will get handle and node
	// - handle = Blackprint binding
	// - node = ScarletsFrame binding <~> element
	static registerNode(namespace, func){
		deepProperty(Interpreter.handler, namespace.split('/'), func);
	}

	static registerInterface(nodeType, options, func){
		if(func === void 0)
			func = options;
		else if(options.extend !== void 0)
			func.extend = options.extend;

		Interpreter.interface[nodeType] = func;
	}

	constructor(){
		this.settings = {};

		// ToDo: Improve
		this.nodes = [];
	}

	clearNodes(){
		this.nodes.splice(0);
	}

	importJSON(json){
		if(json.constructor !== Object)
			json = JSON.parse(json);

		var version = json.version;
		delete json.version;

		var inserted = this.nodes;
		var handlers = [];

		// Prepare all nodes depend on the namespace
		// before we create cables for them
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				var nodeOpt = {};
				if(nodes[a].options !== void 0)
					nodeOpt.options = nodes[a].options;

				inserted[nodes[a].id] = this.createNode(namespace, nodeOpt, handlers);
			}
		}

		// Create cable only from outputs and properties
		// > Important to be separated from above, so the cable can reference to loaded nodes
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				var node = inserted[nodes[a].id];

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
							var targetNode = inserted[target.id];

							// Outputs can only meet input port
							var linkPortB = targetNode.inputs[target.name];
							if(linkPortB === void 0){
								console.error("Node port not found for", targetNode, "with name:", target.name);
								continue;
							}

							var cable = new Interpreter.Cable(linkPortA, linkPortB);
							linkPortA.cables.push(cable);
							linkPortB.cables.push(cable);

							cable.connecting();
						}
					}
				}
			}
		}

		// Call handler init after creation processes was finished
		for (var i = 0; i < handlers.length; i++)
			handlers[i].init && handlers[i].init();
	}

	// ToDo: Improve
	getNodes(namespace){
		var nodes = this.nodes;
		var got = [];
		for (var i = 0; i < nodes.length; i++) {
			if(nodes[i].namespace === namespace)
				got.push(nodes[i]);
		}

		return got;
	}

	settings(which, val){
		this.settings[which] = val;
	}

	createNode(namespace, options, handlers){
		var func = deepProperty(Interpreter.handler, namespace.split('/'));
		if(func === void 0)
			return console.error('Node handler for', namespace, "was not found, maybe .registerNode() haven't being called?") && void 0;

		// Processing scope is different with iface scope
		var node = {}, iface = {interface:'default', title:'No Title', description:''};

		iface.node = node;
		iface.namespace = namespace;
		iface.importing = true;

		Object.setPrototypeOf(iface, Interpreter.Node.prototype);

		// Call the registered func (from this.registerNode)
		func(node, iface);

		if(Interpreter.interface[iface.interface] === void 0)
			return console.error('Node interface for', iface.interface, "was not found, maybe .registerInterface() haven't being called?") && void 0;

		// Initialize for interface
		Interpreter.Node.interface(Interpreter.interface[iface.interface], iface);

		// Assign the saved options if exist
		// Must be called here to avoid port trigger
		iface.imported && iface.imported(options.options);

		// Create the linker between the node and the iface
		Interpreter.Node.prepare(node, iface);

		this.nodes.push(iface);

		iface.importing = false;
		node.imported && node.imported(options.options);

		if(handlers !== void 0)
			handlers.push(node);
		else if(node.init !== void 0)
			node.init();

		return iface;
	}
}

var Interpreter = Blackprint.Interpreter;