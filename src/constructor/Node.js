Blackprint.Engine.Node = class Node extends Blackprint.Engine.CustomEvent{
	static prepare(node, iface){
		// Type extract for port data type
		// Create reactiveness of node and iface's ports

		iface.const = {};
		node.iface = iface;

		if(node.outputs !== void 0){
			Object.setPrototypeOf(node.outputs, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.outputs, 'outputs', iface);

			iface.const.IOutput = iface.outputs;
			iface.const.Output = node.outputs;
		}

		if(node.inputs !== void 0){
			Object.setPrototypeOf(node.inputs, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.inputs, 'inputs', iface);

			iface.const.IInput = iface.inputs;
			iface.const.Input = node.inputs;
		}

		if(node.properties !== void 0){
			Object.setPrototypeOf(node.properties, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.properties, 'properties', iface);

			iface.const.IProperty = iface.properties;
			iface.const.Property = node.properties;
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
			return interFunc(node, function bindingFunction(bind, target = node){
				var temp = Object.getOwnPropertyDescriptors(bind);
				Object.defineProperties(target, temp);

				for(let key in temp){
					var val = temp[key].value;
					if(!val || val.constructor !== Object)
						continue;

					bindingFunction(val, val);
					Object.defineProperty(target, key, {
						get:()=>val,
						set:(v)=>Object.assign(val, v)
					});
				}
			});

		interFunc(node);
	}

	newPort(portName, type, def, which, node){
		return new Blackprint.Engine.Port(portName, type, def, which, node);
	}
}