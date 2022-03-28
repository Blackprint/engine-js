Blackprint.Interface = class Interface extends Blackprint.Engine.CustomEvent{
	static _ports = ['input', 'output'];
	static _prepare(node, iface){
		// Type extract for port data type
		// Create reactiveness of node and iface's ports

		let clazz = node.constructor;

		node.ref = iface.ref = {};
		if(clazz.output !== void 0){
			node.output = new Engine.PortLink(node, 'output', clazz.output);
			iface.ref.IOutput = iface.output;
			iface.ref.Output = node.output;
		}

		if(clazz.input !== void 0){
			node.input = new Engine.PortLink(node, 'input', clazz.input);
			iface.ref.IInput = iface.input;
			iface.ref.Input = node.input;
		}

		if(node.property !== void 0 || iface.property !== void 0 || clazz.property !== void 0)
			throw new Error("'node.property', 'iface.property', and 'static property' is reserved field for Blackprint");

		// if(clazz.property !== void 0){
		//	node.property = new Engine.PortLink(node, 'property', clazz.property);
		// 	iface.ref.IProperty = iface.property;
		// 	iface.ref.Property = node.property;
		// }

		Object.defineProperty(iface, '_requesting', {configurable: true, writable:true, value:void 0});
	}

	static _reuse(newIface, oldIface){
		let iface = newIface;
		let node = newIface.node;

		iface._event = oldIface._event;
		node.ref = iface.ref = oldIface.ref;

		iface.output = iface.ref.IOutput;
		node.output = iface.ref.Output;

		iface.input = iface.ref.IInput;
		node.input = iface.ref.Input;

		// iface.property = iface.ref.IProperty;
		// node.property = iface.ref.Property;

		let cleanUp = [iface.output, iface.input];
		for (var i = 0; i < cleanUp.length; i++) {
			let temp = cleanUp[i];
			if(temp === void 0) continue;

			if(temp._list){
				Object.defineProperty(temp._list, '$EM', {
					configurable: true,
					writable: true,
					value: void 0
				});
			}

			for(let key in temp){
				if(key.slice(0, 1) === '_') continue;

				let port = temp[key];
				// delete port._event;

				port.cables.splice(0);
				port.iface = iface;

				if(port.source === "output")
					port.value = undefined;
				else port.value = port.default;
			}
		}

		Object.defineProperty(iface, '_requesting', {configurable: true, writable:true, value:void 0});
	}

	constructor(node){
		super();
		// this.title = 'No Title';
		this.importing = true;
		this.node = node;
		this.env = Blackprint.Environment.map;
	}

	_newPort(portName, type, def, which, haveFeature){
		return new Blackprint.Engine.Port(portName, type, def, which, this, haveFeature);
	}
}