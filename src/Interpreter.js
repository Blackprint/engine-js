Blackprint.Interpreter = class Interpreter{
	constructor(){
		this.handler = {};
		this.settings = {};
		this.interface = {default: NoOperation};

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
			for (var a = 0; a < nodes.length; a++)
				inserted[nodes[a].id] = this.createNode(namespace, nodes[a].options, handlers);
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

							var cable = new Blackprint.Interpreter.Cable(linkPortA, linkPortB);
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

	// Register node handler
	// Callback function will get handle and node
	// - handle = Blackprint binding
	// - node = ScarletsFrame binding <~> element
	registerNode(namespace, func){
		deepProperty(this.handler, namespace.split('/'), func);
	}

	registerInterface(nodeType, options, func){
		if(func === void 0)
			func = options;

		this.interface[nodeType] = func;
	}

	createNode(namespace, options, handlers){
		var func = deepProperty(this.handler, namespace.split('/'));
		if(func === void 0)
			return console.error('Node handler for', namespace, "was not found, maybe .registerNode() haven't being called?") && void 0;

		// Processing scope is different with node scope
		var handle = {}, node = {type:'default', title:'No Title', description:''};
		node.handle = handle;
		node.namespace = namespace;

		Object.setPrototypeOf(node, Blackprint.Interpreter.Node.prototype);

		// Call the registered func (from this.registerNode)
		func(handle, node);

		if(this.interface[node.type] === void 0)
			return console.error('Node type for', node.type, "was not found, maybe .registerInterface() haven't being called?") && void 0;

		// Initialize for interface
		Blackprint.Interpreter.Node.interface(this.interface[node.type], node);

		// Create the linker between the handler and the node
		Blackprint.Interpreter.Node.prepare(handle, node);

		// Assign the options if exist
		if(options !== void 0)
			Object.assign(node, options);

		this.nodes.push(node);

		if(handlers !== void 0)
			handlers.push(handle);
		else if(handle.init !== void 0)
			handle.init();

		return node;
	}
}