Blackprint.Interpreter.Node = class Node extends Blackprint.Interpreter.CustomEvent{
	static prepare(handle, node){
		// Type extract for port data type
		// Create reactiveness of handle and node's ports

		if(handle.outputs !== void 0){
			Object.setPrototypeOf(handle.outputs, Interpreter.PortLink.prototype);
			Interpreter.PortLink.construct(handle.outputs, 'outputs', node);
		}

		if(handle.inputs !== void 0){
			Object.setPrototypeOf(handle.inputs, Interpreter.PortLink.prototype);
			Interpreter.PortLink.construct(handle.inputs, 'inputs', node);
		}

		if(handle.properties !== void 0){
			Object.setPrototypeOf(handle.properties, Interpreter.PortLink.prototype);
			Interpreter.PortLink.construct(handle.properties, 'properties', node);
		}

		Object.defineProperty(node, '_requsting', {writable:true, value:false});
	}

	static interface(interFunc, node){
		// Check for options
		if(interFunc.extend !== void 0){
			Object.setPrototypeOf(node, interFunc.extend.prototype);
			interFunc.extend.construct && interFunc.extend.construct.call(node);
		}

		// function argument = 2
		if(interFunc.length === 2)
			return interFunc(node, function(bind){
				Object.defineProperties(node, Object.getOwnPropertyDescriptors(bind));
			});

		interFunc(node);
	}

	newPort(portName, type, def, which, node){
		return new Blackprint.Interpreter.Port(portName, type, def, which, node);
	}
}