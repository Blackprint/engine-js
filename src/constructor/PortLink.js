class PortLink {
	constructor(node, which, portMeta){
		let iface = node.iface;

		Object.defineProperties(this, {
			_which: {value: which},
			_iface: {value: iface},
			_sf:{writable:true, value:false},
		});

		let iPort = iface[which] = {};

		// Check if a browser
		if(typeof sf !== 'undefined' && sf.Obj !== void 0 && sf.Obj.set !== void 0){
			this._sf = true;
			Object.defineProperty(iPort, '_list', {
				enumerable: false,
				configurable: true,
				value: []
			});
		}

		// Create linker for all port
		for(var portName in portMeta){
			if(portName.slice(0, 1) === '_') continue;
			this._add(portName, portMeta[portName]);
		}
	}

	_add(portName, val){
		var iPort = this._iface[this._which];
		let exist = iPort[portName];

		if(portName in iPort)
			return exist;

		// Determine type and add default value for each type
		let { type, def, haveFeature } = determinePortType(val, this);

		var linkedPort = this._iface._newPort(portName, type, def, this._which, haveFeature);
		iPort[portName] = linkedPort;

		if(this._sf === true)
			iPort._list.push(linkedPort);

		var linkValue = linkedPort.createLinker();

		// Set on the this scope
		if(type === Function){
			if(this._which === 'output')
				Object.defineProperty(this, portName, {configurable: true, enumerable:true, writable:false, value:linkValue});
			else this[portName] = def;
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

		// Check if a browser or not
		if(this._sf === true){
			let i = iPort._list.indexOf(port);

			if(i !== -1)
				iPort._list.splice(i, 1);
		}

		delete iPort[portName];
		delete this[portName];
	}
}

Blackprint.Engine.PortLink = PortLink;

function determinePortType(val, that){
	var type, def, haveFeature;
	if(val === void 0)
		throw new Error("Port type can't be undefined, error when processing: "+that._iface.title+", "+that._which+' port');

	if(typeof val === 'function'){
		type = val;

		// Give default value for each data type
		if(type === Number)
			def = 0;
		else if(type === Boolean)
			def = false;
		else if(type === String)
			def = '';
		else def = null;
	}
	else if(val === null){
		type = TypeAny;
		def = null;
	}
	else{
		if(val.portFeature === BP_Port.ArrayOf){
			haveFeature = val.portFeature;
			type = val.portType;

			if(type === null){
				type = {name:'Any', any:true};
				def = null;
			}
			else def = [];
		}
		else if(val.portFeature === BP_Port.Trigger){
			type = Function;
			def = val.default.bind(that._iface.node);
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
		else{
			type = val.constructor;
			def = val;
		}

		// Default must be null (because it's defined but don't have data)
		if(def === void 0) def = null;
	}

	return { type, def, haveFeature };
}