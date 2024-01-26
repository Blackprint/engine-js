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
		for (let key in treeList) sf.Obj.delete(treeList, key);

		let list = this.list;
		Object.assign(list, Blackprint._events);
		for (let key in list) {
			setDeepProperty(this.treeList, key.split('/'), list[key]);
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
		if(namespace in this.list) return; // throw new Error(`Event with name '${namespace}' already exist`);
		if(/\s/.test(namespace))
			throw new Error("Namespace can't have space character: " + `'${namespace}'`);

		let schema = {};
		let list = options.schema;
		if(list != null){
			for (let i=0; i < list.length; i++) {
				schema[list[i]] = Blackprint.Types.Any;
			}
		}

		let obj = this.list[namespace] = new InstanceEvent({ schema, namespace, _root: this });
		this._updateTreeList();

		this.instance._emit('event.created', obj);
	}

	renameEvent(from, to){
		if(to in this.list) throw new Error(`Event with name '${to}' already exist`);
		if(/\s/.test(to))
			throw new Error("Namespace can't have space character: " + `'${to}'`);

		let oldEvInstance = this.list[from];
		let used = oldEvInstance.used;
		oldEvInstance.namespace = to;

		for (let i=0; i < used.length; i++) {
			let iface = used[i];
			if(iface._enum === _InternalNodeEnum.BPEventListen){
				this.off(iface.data.namespace, iface._listener);
				this.on(to, iface._listener);
			}

			iface.data.namespace = to;
			iface.title = to.split('/').splice(-2).join(' ');
		}

		this.list[to] = this.list[from];
		delete this.list[from];
		this._updateTreeList();

		this.instance._emit('event.renamed', {old: from, now: to, reference: oldEvInstance});
	}

	deleteEvent(namespace){
		let exist = this.list[namespace];
		if(exist == null) return;

		let map = exist.used; // This list can be altered multiple times when deleting a node
		for (let i=map.length-1; i >= 0; i = map.length-1) {
			let iface = map[i];
			iface.node.instance.deleteNode(iface);
		}

		delete this.list[namespace];
		this._updateTreeList();
		this.instance._emit('event.deleted', exist);
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
		let evInstance = this.list[namespace];
		let schema = evInstance?.schema;
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

		let used = evInstance.used;
		for (let i=0; i < used.length; i++) {
			let iface = used[i];
			if(iface._enum === _InternalNodeEnum.BPEventListen){
				if(iface.data.namespace === namespace)
					refreshPorts(iface, 'output');
			}
			else if(iface._enum === _InternalNodeEnum.BPEventEmit){
				if(iface.data.namespace === namespace)
					refreshPorts(iface, 'input');
			}
			else throw new Error("Unrecognized node in event list's stored nodes");
		}
	}
}

class InstanceEvent {
	constructor(options){
		this.schema = options.schema;
		this._root = options._root;
		this.namespace = options.namespace;
		this.used = [];
	}
}