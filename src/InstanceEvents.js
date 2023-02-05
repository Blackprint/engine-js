class InstanceEvents extends CustomEvent {
	constructor(instance){
		super();
		this.list = {};
		this.instance = instance;
	}

	// This only available on Blackprint.Sketch
	_updateTreeList(){
		if(!this.instance.isSketch) return;
		this.totalEvent = 0;

		// Clear object by using for in to reuse the object
		let treeList = this.treeList ??= {};
		for (let key in treeList) {
			delete treeList[key];
		}

		let list = this.list;
		Object.assign(list, Blackprint._events);
		for (let key in list) {
			deepProperty(this.treeList, key.split('/'), list[key]);
			this.totalEvent++;
		}

		// Refresh ScarletsFrame's object watcher
		treeList.refresh?.();
	}

	emit(eventName, obj){
		if(this._event === void 0)
			return false;

		let events = this._event[eventName];
		if(events === void 0)
			return false;

		if(arguments.length > 2)
			throw new Error(".emit only accept 2 parameter, please wrap the others on a object");

		for (var i = 0; i < events.length; i++){
			var ev = events[i];
			if(ev.once){
				delete ev.once;
				events.splice(i--, 1);
			}

			ev(obj, eventName);
		}

		return true;
	}

	createEvent(namespace, options={}){
		if(namespace in this.list) return;
		if(/\s/.test(namespace))
			throw new Error("Namespace can't have space character");

		this.list[namespace] = new InstanceEvent({
			schema: options.schema || {},
		});

		this._updateTreeList();
	}

	_renameFields(namespace, name, to){
		let schema = this.list[namespace]?.schema;
		if(schema == null) return;

		schema[to] = schema[name];
		delete schema[name];

		this.refreshFields(namespace, name, to);
	}

	// second and third parameter is only be used for renaming field
	refreshFields(namespace, _name, _to){
		let schema = this.list[namespace]?.schema;
		if(schema == null) return;

		function refreshPorts(iface, target){
			let ports = iface[target];
			let node = iface.node;

			if(_name != null){
				node.renamePort(target, _name, _to);
				return;
			}

			// Delete port that not exist or different type first
			let isEmitPort = target === 'input' ? true : false;
			for (let name in ports) {
				if(isEmitPort) { isEmitPort = false; continue; }
				if(schema[name] != ports[name]._config){
					node.deletePort(target, name);
				}
			}

			// Create port that not exist
			for (let name in schema) {
				if(ports[target] == null)
					node.createPort(target, name, schema[name]);
			}
		}

		function iterateList(ifaceList){
			for (let i=0; i < ifaceList.length; i++) {
				let iface = ifaceList[i];
				if(iface._enum === _InternalNodeEnum.BPEventListen){
					if(iface.data.namespace === namespace)
						refreshPorts(iface, 'output');
				}
				else if(iface._enum === _InternalNodeEnum.BPEventEmit){
					if(iface.data.namespace === namespace)
						refreshPorts(iface, 'input');
				}
				else if(iface._enum === _InternalNodeEnum.BPFnMain){
					iterateList(iface.bpInstance.ifaceList);
				}
			}
		}

		iterateList(this.instance.ifaceList);
	}
}

class InstanceEvent {
	constructor(options){
		this.schema = options.schema;
	}
}