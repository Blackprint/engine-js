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

		// Processing scope is different with node scope
		var handle = {}, node = {type:'default', title:'No Title', description:''};

		node.handle = handle;
		node.namespace = namespace;
		node.importing = true;

		Object.setPrototypeOf(node, Interpreter.Node.prototype);

		// Call the registered func (from this.registerNode)
		func(handle, node);

		if(Interpreter.interface[node.type] === void 0)
			return console.error('Node type for', node.type, "was not found, maybe .registerInterface() haven't being called?") && void 0;

		// Initialize for interface
		Interpreter.Node.interface(Interpreter.interface[node.type], node);

		// Assign the saved options if exist
		// Must be called here to avoid port trigger
		if(node.options !== void 0 && options.options !== void 0)
			Object.assign(node.options, options.options);

		// Create the linker between the handler and the node
		Interpreter.Node.prepare(handle, node);

		this.nodes.push(node);

		node.importing = false;
		handle.imported && handle.imported();

		if(handlers !== void 0)
			handlers.push(handle);
		else if(handle.init !== void 0)
			handle.init();

		return node;
	}
}

var Interpreter = Blackprint.Interpreter;