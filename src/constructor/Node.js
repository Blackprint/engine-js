Blackprint.Interpreter.Node = class Node extends Blackprint.Interpreter.CustomEvent{
	static prepare(handle, node){
		// Type extract for port data type
		// Create reactiveness of handle and node's ports
		['inputs', 'outputs', 'properties'].forEach(function(which){
			node[which] = {}; // Handled by ScarletsFrame

			var localPorts = handle[which]; // Handled by registered node handler
			if(localPorts === void 0)
				return;

			for(let portName in localPorts){
				let port = localPorts[portName]; // Handled by registered node handler

				// Determine type and add default value for each type
				var type, def, haveFeature;
				if(typeof port === 'function'){
					type = port;

					// Give default value for each data type
					if(type === Number)
						def = 0;
					else if(type === Boolean)
						def = false;
					else if(type === String)
						def = '';
					else if(type === Array)
						def = [];
					else if(type === Object)
						def = {};
					else if(type.constructor === Function){
						if(type.portFeature !== void 0){
							haveFeature = type.portFeature;
							type = type.portType || Object;
						}
						else type = Function;

						def = void 0;
					}
					else return console.error(type, "was unrecognized as an port data type");
				}
				else if(port === null){
					type = {name:'Any'};
					def = null;
				}
				else{
					type = port.constructor;
					def = port;
				}

				var linkedPort = node[which][portName] = new Blackprint.Interpreter.Port(portName, type, def, which, node);

				if(haveFeature){
					linkedPort.feature = haveFeature;
					linkedPort._call = port;
				}

				// Set on the localPorts scope
				if(type === Function){
					if(which === 'outputs')
						Object.defineProperty(localPorts, portName, {enumerable:true, writable:false, value:linkedPort.createLinker()});
				}
				else Object.defineProperty(localPorts, portName, linkedPort.createLinker());
			}
		});

		Object.defineProperty(node, '_requsting', {writable:true, value:false});
	}

	static interface(interFunc, node){
		// function argument = 2
		if(interFunc.length === 2)
			return interFunc(node, function(bind){
				Object.defineProperties(node, Object.getOwnPropertyDescriptors(bind));
			});

		interFunc(node);
	}
}