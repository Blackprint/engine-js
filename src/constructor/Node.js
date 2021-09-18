Blackprint.Engine.Node = class Node extends Blackprint.Engine.CustomEvent{
	static prepare(node, iface){
		// Type extract for port data type
		// Create reactiveness of node and iface's ports

		iface.const = {};
		node.iface = iface;

		if(node.output !== void 0){
			Object.setPrototypeOf(node.output, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.output, 'output', iface);

			iface.const.IOutput = iface.output;
			iface.const.Output = node.output;
		}

		if(node.input !== void 0){
			Object.setPrototypeOf(node.input, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.input, 'input', iface);

			iface.const.IInput = iface.input;
			iface.const.Input = node.input;
		}

		if(node.property !== void 0){
			Object.setPrototypeOf(node.property, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.property, 'property', iface);

			iface.const.IProperty = iface.property;
			iface.const.Property = node.property;
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

				for(var key in temp){
					let val = temp[key].value; // don't have getter/setter property?
					if(!val || val.constructor !== Object)
						continue; // If also not an object

					bindingFunction(val, val);
					Object.defineProperty(target, key, {
						get:()=> val,
						set:v=> Object.assign(val, v)
					});
				}
			});

		interFunc(node);
	}

	newPort(portName, type, def, which, node){
		return new Blackprint.Engine.Port(portName, type, def, which, node);
	}
}