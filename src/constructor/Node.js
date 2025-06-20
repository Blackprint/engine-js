// Constructor cycle
// CreateNode = Blackprint.Node then Blackprint.Interface
Blackprint.Node = class Node {
	constructor(instance){
		if(instance === void 0)
			throw new Error("First parameter was not found, did you forget 'super(instance)' when extending Blackprint.Node?");

		// super();
		this.instance = instance;
		this._scope = instance.scope; // Only in Blackprint.Sketch
		this.syncThrottle = 0; // One syncOut per 0ms, last state will be synced
		this.disablePorts = false; // Disable output port from synchronizing data to other nodes

		this.partialUpdate = false;
	}

	setInterface(path='BP/default'){
		if(this.iface !== void 0)
			throw new Error('node.setInterface() can only be called once');

		let isSketch = this._scope !== void 0;

		// Get the requested iface after initialize the node
		let ifaceFunc = (isSketch ? Blackprint.Sketch._iface : Blackprint._iface)[path];
		if(ifaceFunc === void 0)
			throw new Error('Node interface for '+path+" was not found, maybe .registerInterface() haven't being called?" + (isSketch ? " (missing for Sketch Interface)" : ""));

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
		if(this.instance._locked_) throw new Error("This instance was locked");

		if(which !== 'input' && which !== 'output')
			throw new Error("Can only create port for 'input' and 'output'");

		if(type == null)
			throw new Error("Type is required for creating new port");

		if(name.constructor !== String) name = String(name);

		if(type.any
			|| type.constructor === Function
			|| type.isRoute
			|| type.isTrigger
			|| type.portFeature !== void 0
		){
			let ret = this[which]._add(name, type);

			// Sketch only: Recalculate cable position
			this.iface._recalculateBpVisual?.();

			return ret;
		}

		console.error("Error:", type);
		throw new Error("Type must be a class object or from Blackprint.Port.{feature}");
	}

	renamePort(which, name, to){
		if(this.instance._locked_) throw new Error("This instance was locked");

		let iPort = this.iface[which];
		if(name.constructor !== String) name = String(name);
		if(to.constructor !== String) to = String(to);

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
		if(this.instance._locked_) throw new Error("This instance was locked");

		if(which !== 'input' && which !== 'output')
			throw new Error("Can only delete port for 'input' and 'output'");

		if(name.constructor !== String) name = String(name);
		let ret = this[which]._delete(name);

		// Sketch only: Recalculate cable position
		this.iface._recalculateBpVisual?.();

		return ret;
	}

	log(message){
		this.instance._log({
			iface: this.iface,
			message,
		});
	}

	async request(cable){
		// await this.update?.(cable);
	}

	async _bpUpdate(cable){
		let thisIface = this.iface;
		let isMainFuncNode = thisIface._enum === _InternalNodeEnum.BPFnMain;
		let ref = this.instance.executionOrder;

		if(this.update != null){
			this._bpUpdating = true;
			try {
				let temp = this.update(cable);
				if(temp?.constructor === Promise) await temp; // Performance optimization
			}
			finally {
				this._bpUpdating = false;
			}
			this.iface.emit('updated');
		}

		if(this.routes.out == null){
			if(isMainFuncNode && thisIface._proxyInput.routes.out != null){
				await thisIface._proxyInput.routes.routeOut();
			}
		}
		else{
			if(!isMainFuncNode)
				await this.routes.routeOut();
			else await thisIface._proxyInput.routes.routeOut();
		}

		await ref.next();
	}

	_syncToAllFunction(id, data){
		let parentInterface = this.instance.parentInterface;
		if(parentInterface === void 0) return; // This is not in a function node

		let list = parentInterface.node.bpFunction.used;
		let nodeIndex = this.iface.i;
		let namespace = this.instance.parentInterface.namespace;

		for (let i=0; i < list.length; i++) {
			let iface = list[i];
			if(iface === parentInterface) continue; // Skip self
			let target = iface.bpInstance.ifaceList[nodeIndex];

			if(target === void 0) throw new Error("Target node was not found on other function instance, maybe the node was not correctly synced? (" + namespace.replace('BPI/F/', '') + ");");
			target.node.syncIn(id, data, false);
		}
	}

	syncOut(id, data, force=false){
		this._syncToAllFunction(id, data);

		let instance = this.instance;
		if(instance.rootInstance !== void 0) instance.rootInstance = instance.rootInstance; // Ensure rootInstance is set

		let remote = instance._remote;
		if(remote !== void 0)
			remote.nodeSyncOut(this, id, data, force);
	}

	// To be replaced by the developer or user
	syncIn(id, data, isRemote=false){}
};