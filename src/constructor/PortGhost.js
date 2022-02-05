let fakeIface = {
	title: "Blackprint.PortGhost",
	node: {},
	emit(){},
};

fakeIface._iface = fakeIface;
Object.freeze(fakeIface);

class PortGhost extends Blackprint.Engine.Port {
	destroy(){
		this.disconnectAll();
	}
}

// These may be useful for testing or creating custom port without creating nodes when scripting
Blackprint.OutputPort = class extends PortGhost {
	constructor(type){
		var { type, def, haveFeature } = determinePortType(type, fakeIface);

		super('Blackprint.OutputPort', type, def, 'output', fakeIface, haveFeature);
	}
}

Blackprint.InputPort = class extends PortGhost {
	constructor(type){
		var { type, def, haveFeature } = determinePortType(type, fakeIface);

		super('Blackprint.InputPort', type, def, 'input', fakeIface, haveFeature);
	}
}