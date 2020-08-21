class PortLink{
	static construct(portLink, which, iface){
		Object.defineProperties(portLink, {
			_which:{value:which},
			_iface:{value:iface},
			_extracted:{writable:true, value:false},
		});

		iface[which] = {}; // Handled by ScarletsFrame

		// Create linker for all port
		for(var portName in portLink)
			portLink.add(portName, portLink[portName]);

		// Check if a browser
		if(typeof sf !== 'undefined' && sf.set !== void 0)
			portLink._extracted = true;
	}

	add(portName, val){
		var nodeEls = this._iface[this._which];

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
			else if(type === Array)
				def = [];
			else if(type === Object)
				def = {};
			else if(type.constructor === Function && !type.prototype[Symbol.toStringTag]){
				if(type.portFeature !== void 0){
					haveFeature = type.portFeature;
					type = type.portType || Object;
				}
				else type = Function;

				def = void 0;
			}
			else def = null;
		}
		else if(val === null){
			type = {name:'Any'};
			def = null;
		}
		else{
			if(val.portFeature === Blackprint.PortArrayOf){
				haveFeature = val.portFeature;
				type = val.portType;
				def = [];
			}
			else if(val.portFeature === Blackprint.PortAsync){
				haveFeature = val.portFeature;
				type = val.portType;
				def = val.call;
			}
			else{
				type = val.constructor;
				def = val;
			}
		}

		var linkedPort = this._iface.newPort(portName, type, def, this._which, this._iface);

		if(this._extracted === true)
			sf.set(nodeEls, portName, linkedPort);
		else
			nodeEls[portName] = linkedPort;

		if(haveFeature){
			linkedPort.feature = haveFeature;
			if(haveFeature === Blackprint.PortArrayOf)
				linkedPort.classAdd = ' Array';
			linkedPort._call = val;
		}

		// Set on the this scope
		if(type === Function){
			if(this._which === 'outputs')
				Object.defineProperty(this, portName, {enumerable:true, writable:false, value:linkedPort.createLinker()});
		}
		else Object.defineProperty(this, portName, linkedPort.createLinker());
	}

	delete(portName){
		var ref = this._iface[this._which];

		// Destroy cable first
		var cables = ref[portName].cables;
		for (var i = 0; i < cables.length; i++)
			cables[i].destroy();

		delete this[portName];

		// Check if a browser or not
		if(typeof sf === 'undefined' && sf.delete)
			delete ref[portName];
		else
			sf.delete(ref, portName);
	}
}

Blackprint.Interpreter.PortLink = PortLink;