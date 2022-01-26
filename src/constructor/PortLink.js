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
			iPort._list = [];
		}

		// Create linker for all port
		for(var portName in portMeta){
			if(portName.slice(0, 1) === '_') continue;
			this._add(portName, portMeta[portName]);
		}
	}

	_add(portName, val){
		var iPort = this._iface[this._which];

		// Determine type and add default value for each type
		var type, def, haveFeature;
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
				def = val.default.bind(this._iface.node);
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

		var linkedPort = this._iface._newPort(portName, type, def, this._which);
		iPort[portName] = linkedPort;

		if(this._sf === true)
			iPort._list.push(linkedPort);

		if(haveFeature){
			linkedPort.feature = haveFeature;
			if(haveFeature === BP_Port.ArrayOf)
				linkedPort.classAdd = ' Array';

			linkedPort._call = val;
		}

		var linkValue = linkedPort.createLinker();

		// Set on the this scope
		if(type === Function){
			if(this._which === 'output')
				Object.defineProperty(this, portName, {enumerable:true, writable:false, value:linkValue});
			else this[portName] = def;
		}
		else Object.defineProperty(this, portName, linkValue);

		return linkedPort;
	}

	_delete(portName){
		var iPort = this._iface[this._which];

		// Destroy cable first
		var cables = iPort[portName].cables;
		for (var i = 0; i < cables.length; i++)
			cables[i].disconnect();

		delete this[portName];

		// Check if a browser or not
		if(this._sf === true){
			let i = iPort._list(iPort[portName]);

			if(i !== -1)
				iPort._list.splice(i, 1);
		}

		delete iPort[portName];
	}
}

Blackprint.Engine.PortLink = PortLink;