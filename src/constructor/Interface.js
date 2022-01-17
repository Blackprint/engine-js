Blackprint.Interface = class Interface extends Blackprint.Engine.CustomEvent{
	static _prepare(node, iface){
		// Type extract for port data type
		// Create reactiveness of node and iface's ports

		node.ref = iface.ref = {};
		if(node.output !== void 0){
			Object.setPrototypeOf(node.output, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.output, 'output', iface);

			iface.ref.IOutput = iface.output;
			iface.ref.Output = node.output;
		}

		if(node.input !== void 0){
			Object.setPrototypeOf(node.input, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.input, 'input', iface);

			iface.ref.IInput = iface.input;
			iface.ref.Input = node.input;
		}

		if(node.property !== void 0 || iface.property !== void 0)
			throw new Error("'node.property' and 'iface.property' is reserved field for Blackprint");

		// if(node.property !== void 0){
		// 	Object.setPrototypeOf(node.property, Engine.PortLink.prototype);
		// 	Engine.PortLink.construct(node.property, 'property', iface);

		// 	iface.ref.IProperty = iface.property;
		// 	iface.ref.Property = node.property;
		// }

		Object.defineProperty(iface, '_requesting', {writable:true, value:void 0});
	}

	static _reuse(newIface, oldIface){
		let iface = newIface;
		let node = newIface.node;

		iface._event = oldIface._event;
		iface.ref = oldIface.ref;

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

			for(let key in temp){
				let port = temp[key];

				port.cables.splice(0);
				port.classAdd = "";
				port.value = port.default;
				port.iface = iface;
			}
		}

		Object.defineProperty(iface, '_requesting', {writable:true, value:void 0});
	}

	constructor(node){
		super();
		// this.title = 'No Title';
		this.importing = true;
		this.node = node;
		this.env = Blackprint.Environment.map;
	}

	newPort(portName, type, def, which, node){
		return new Blackprint.Engine.Port(portName, type, def, which, node);
	}
}