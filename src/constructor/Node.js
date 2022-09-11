// Constructor cycle
// CreateNode = Blackprint.Node then Blackprint.Interface
Blackprint.Node = class Node extends Blackprint.Engine.CustomEvent {
	constructor(instance){
		if(instance === void 0)
			throw new Error("First parameter was not found, did you forget 'super(instance)' when extending Blackprint.Node?");

		super();
		this.instance = instance;
		this._bpUpdateWait = 0;
		this._scope = instance.scope; // Only in Blackprint.Sketch
		this.syncThrottle = 250; // One syncOut per 250ms, last state will be synced
		this.disablePorts = false; // Disable output port from synchronizing data to other nodes
	}

	setInterface(path='BP/default'){
		if(this.iface !== void 0)
			throw new Error('node.setInterface() can only be called once');

		let isSketch = this._scope !== void 0;

		// Get the requested iface after initialize the node
		let ifaceFunc = (isSketch ? Blackprint.Sketch._iface : Blackprint._iface)[path];
		if(ifaceFunc === void 0)
			throw new Error('Node interface for '+path+" was not found, maybe .registerInterface() haven't being called?" + (isSketch ? " (for Sketch Interface)" : ""));

		// Initialize for interface
		let iface;
		if(isClass(ifaceFunc))
			iface = new ifaceFunc(this);
		else{
			// Check for options
			if(ifaceFunc._extend !== void 0)
				iface = new ifaceFunc._extend(this);
			else iface = new Blackprint.Interface(this);

			// If it was for Sketch, it will being handled by framework on Blackprint/src/page.sf
			if(!isSketch)
				ifaceFunc(iface);
		}

		if(iface.data !== void 0){
			let desc = Object.getOwnPropertyDescriptor(iface, 'data');
			if(desc.set === void 0){
				let data = iface.data;
				Object.defineProperty(iface, 'data', {
					enumerable: true,
					configurable: true,
					get:()=> data,
					set:v=> Object.assign(data, v),
				});
			}
		}

		iface.interface = path;
		return this.iface = iface;
	}

	createPort(which, name, type){
		if(which !== 'input' && which !== 'output')
			throw new Error("Can only create port for 'input' and 'output'");

		if(type == null)
			throw new Error("Type is required for creating new port");

		if(type.any || type.constructor === Function
		   || (type.constructor === Object && type.portFeature !== void 0)){
			return this[which]._add(name, type);
		}

		console.error("Error:", type);
		throw new Error("Type must be a class object or from Blackprint.Port.{feature}");
	}

	renamePort(which, name, to){
		let iPort = this.iface[which];

		if(!(name in iPort))
			throw new Error(which+" port with name '"+name+"' was not found");

		if(to in iPort)
			throw new Error(which+" port with name '"+to+"' already exist");

		let temp = iPort[to] = iPort[name];
		delete iPort[name];

		temp.name = to;

		let port = this[which];
		Object.defineProperty(port, to, Object.getOwnPropertyDescriptor(port, name));
		delete port[name];

		return true;
	}

	deletePort(which, name){
		if(which !== 'input' && which !== 'output')
			throw new Error("Can only delete port for 'input' and 'output'");

		return this[which]._delete(name);
	}

	log(message){
		this.instance._log({
			iface: this.iface,
			message,
		});
	}

	_bpUpdate(cable){
		if(this.routes.out == null){
			this._bpUpdating = true;
			this.update(cable);
			this._bpUpdating = false;

			if(this._bpHasUpdate){
				this._bpHasUpdate = false;

				let outputs = this.iface.output._portList;
				let hasError = null;
				for (let i=0; i < outputs.length; i++) {
					let output = outputs[i];
					if(output._bpHasUpdate === false) continue;

					let cables = output.cables;
					for (let a=0; a < cables.length; a++) {
						let cable = cables[a];
						let targetNode = cable.input._node;

						if(targetNode._bpUpdateWait !== 0){
							if(--targetNode._bpUpdateWait !== 0) continue;
						}

						if(hasError) continue;

						try {
							targetNode._bpUpdate(cable);
						} catch(e) {
							hasError = e;
						}
					}
				}

				if(hasError !== null) throw hasError;
			}
		}
		else this.update(cable);

		if(this.iface._enum !== _InternalNodeEnum.BPFnMain)
			this.routes.routeOut();
		else this.iface._proxyInput.routes.routeOut();
	}

	// Will be replaced by @blackprint/remote-control/js/src/Node.js
	syncOut(id, data){}

	// To be replaced by the developer or user
	syncIn(id, data){}
};