class PortLink {
	constructor(node, which, portMeta){
		let iface = node.iface;

		Object.defineProperties(this, {
			_which: {value: which},
			_iface: {value: iface},
			_sf:{writable:true, value:false},
		});

		let iPort = iface[which] = {};

		// Check if a browser or input port
		if(which === 'input' || (typeof sf !== 'undefined' && sf.Obj !== void 0 && sf.Obj.set !== void 0)){
			this._sf = true;
			Object.defineProperty(iPort, '_portList', {
				enumerable: false,
				configurable: true,
				value: []
			});
		}

		// Create linker for all port
		for(var portName in portMeta){
			if(portName.slice(0, 1) === '_') continue;
			let meta = portMeta[portName];
			if(meta === undefined) continue; // Skip undefined, but allow null to pass

			this._add(portName, meta);
		}
	}

	_add(portName, val){
		portName = ''+portName;

		var iPort = this._iface[this._which];
		let exist = iPort[portName];

		if(portName in iPort)
			return exist;

		// Determine type and add default value for each type
		let { type, def, haveFeature, virtualType } = determinePortType(val, this);

		var linkedPort = this._iface._newPort(portName, type, def, this._which, haveFeature);
		linkedPort.virtualType = virtualType; // For engine-js only
		iPort[portName] = linkedPort;
		linkedPort._config = val;

		if(iPort._portList !== undefined)
			iPort._portList.push(linkedPort);

		var linkValue = linkedPort.createLinker();

		// Set on the this scope
		if(type === Function || type === Types.Route){
			if(this._which === 'output')
				Object.defineProperty(this, portName, linkValue);
			else this[portName] = linkedPort.default;
		}
		else Object.defineProperty(this, portName, linkValue);

		return linkedPort;
	}

	_delete(portName){
		var iPort = this._iface[this._which];

		if(!(portName in iPort))
			return;

		// Destroy cable first
		let port = iPort[portName];
		port.disconnectAll();

		if(iPort._portList !== undefined){
			let i = iPort._portList.indexOf(port);

			if(i !== -1)
				iPort._portList.splice(i, 1);
		}

		delete iPort[portName];
		delete this[portName];
	}
}

Blackprint.Engine.PortLink = PortLink;

function determinePortType(val, that){
	var type, def, haveFeature, virtualType;
	if(val == null)
		throw new Error("Port type can't be null or undefined, error when processing: "+that._iface.title+", "+that._which+' port');

	if(typeof val === 'function'){
		type = val;

		// Give default value for each primitive type
		if(type === Number)
			def = 0;
		else if(type === Boolean)
			def = false;
		else if(type === String)
			def = '';
		else def = null;
	}
	else if(val === Types.Any || val === Types.Slot){
		type = val;
		def = null;
	}
	else{
		if(val.portFeature === BP_Port.ArrayOf){
			haveFeature = val.portFeature;
			type = val.portType;

			if(type === Types.Any){
				// type = type;
				def = null;
			}
			else def = [];
		}
		else if(val.portFeature === BP_Port.Trigger){
			haveFeature = val.portFeature;
			type = Function;
			def = val.default;
		}
		else if(val.portFeature === BP_Port.Default){
			type = val.portType;
			def = val.default;
		}
		else if(val.portFeature === BP_Port.Union){
			haveFeature = BP_Port.Union;
			type = val.portType;
			def = val.default;
		}
		else if(val.portFeature === BP_Port.StructOf){
			haveFeature = BP_Port.StructOf;
			type = val.portType;
			def = val.default;
		}
		else if(val === Types.Route){
			type = Types.Route;
			def = null;
		}
		else if(val.portFeature === BP_Port.VirtualType){ } // pass
		else throw new Error("Unrecognized port type or port feature");

		if(val.virtualType != null){
			haveFeature = val.portFeature;
			virtualType = val.virtualType;
			type = val.portType;
		}

		// Default must be null (because it's defined but don't have data)
		if(def === void 0) def = null;
	}

	return { type, def, haveFeature, virtualType };
}