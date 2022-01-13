Blackprint.Interface = class Interface extends Blackprint.Engine.CustomEvent{
	static prepare(node, iface){
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

		if(node.property !== void 0){
			Object.setPrototypeOf(node.property, Engine.PortLink.prototype);
			Engine.PortLink.construct(node.property, 'property', iface);

			iface.ref.IProperty = iface.property;
			iface.ref.Property = node.property;
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