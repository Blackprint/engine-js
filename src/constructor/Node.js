Blackprint.Interpreter.Node = class Node extends Blackprint.Interpreter.CustomEvent{
	static prepare(node, iface){
		// Type extract for port data type
		// Create reactiveness of node and iface's ports

		iface.const = {};

		if(node.outputs !== void 0){
			Object.setPrototypeOf(node.outputs, Interpreter.PortLink.prototype);
			Interpreter.PortLink.construct(node.outputs, 'outputs', iface);

			iface.const.IOutput = iface.outputs;
			iface.const.Output = node.outputs;
		}

		if(node.inputs !== void 0){
			Object.setPrototypeOf(node.inputs, Interpreter.PortLink.prototype);
			Interpreter.PortLink.construct(node.inputs, 'inputs', iface);

			iface.const.IInput = iface.inputs;
			iface.const.Input = node.inputs;
		}

		if(node.properties !== void 0){
			Object.setPrototypeOf(node.properties, Interpreter.PortLink.prototype);
			Interpreter.PortLink.construct(node.properties, 'properties', iface);

			iface.const.IProperty= iface.properties;
			iface.const.Property= node.properties;
		}

		Object.defineProperty(iface, '_requesting', {writable:true, value:false});
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