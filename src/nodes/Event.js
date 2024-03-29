Blackprint.nodes.BP.Event = {
	Listen: class extends Blackprint.Node {
		static output = {};
		static input = {
			Limit: BP_Port.Default(Number, 0),
			Reset: BP_Port.Trigger(port => port.iface.node.resetLimit()),
			Off: BP_Port.Trigger(port => port.iface.node.offEvent()),
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Event/Listen');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {namespace: ''};
			iface.title = 'Event';
			iface.description = 'Event Listener';
			iface.type = 'event';

			iface._enum = _InternalNodeEnum.BPEventListen;

			this._limit = -1; // -1 = no limit
			this._off = false;
		}
		initPorts(data){ this.iface.initPorts(data) }
		resetLimit(){
			let limit = this.input.Limit;
			this._limit = limit === 0 ? -1 : limit;

			if(this._off){
				let iface = this.iface;
				this.instance.events.on(iface.data.namespace, iface._listener);
			}
		}
		eventUpdate(obj){
			if(this._off || this._limit === 0) return;
			if(this._limit > 0) this._limit--;

			// Don't use object assign as we need to re-assign null/undefined field
			let output = this.output;
			for (let key in output) {
				output[key] = obj[key];
			}

			this.routes.routeOut();
		}
		offEvent(){
			if(this._off === false){
				let iface = this.iface;
				this.instance.events.off(iface.data.namespace, iface._listener);

				this._off = true;
			}
		}
		destroy(){
			let iface = this.iface;
			iface._removeFromList();

			if(iface._listener == null) return;
			iface._insEventsRef.off(iface.data.namespace, iface._listener);
		}
	},
	Emit: class extends Blackprint.Node {
		static input = {
			Emit: BP_Port.Trigger(port => port.iface.node.trigger()),
		};

		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Event/Emit');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {namespace: ''};
			iface.title = 'Event';
			iface.description = 'Event Emitter';
			iface.type = 'event';

			iface._enum = _InternalNodeEnum.BPEventEmit;
		}
		initPorts(data){ this.iface.initPorts(data) }
		trigger(){
			let data = Object.assign({}, this.input);
			delete data.Emit;

			this.instance.events.emit(this.iface.data.namespace, data);
		}

		destroy(){
			this.iface._removeFromList();
		}
	},
};

// ==== Interface ====
// We need interface because we want to register Sketch interface later
function BPEventInit(){
	class BPEventListenEmit extends Blackprint.Interface {
		constructor(node){
			super(node);
			this._insEventsRef = this.node.instance.events;
		}
		initPorts(data){
			let namespace = data.namespace;
			if(!namespace) throw new Error("Parameter 'namespace' is required");

			this.data.namespace = namespace;
			this.title = namespace.split('/').splice(-2).join(' ');

			this._eventRef = this.node.instance.events.list[namespace];
			if(this._eventRef == null) throw new Error("Events ("+namespace+") is not defined");

			let { schema } = this._eventRef;
			let createPortTarget;
			if(this._enum === _InternalNodeEnum.BPEventListen){
				createPortTarget = 'output';
			}
			else createPortTarget = 'input';

			for (let key in schema) {
				this.node.createPort(createPortTarget, key, schema[key]);
			}

			this._addToList();
		}
		createField(name, type=Blackprint.Types.Any){
			let { schema } = this._eventRef;
			if(schema[name] != null) return;

			schema[name] = type;
			this._insEventsRef.refreshFields(this.data.namespace);
			this.node.instance._emit('event.field.created', {
				name, 
				namespace: this.data.namespace,
			});
		}
		renameField(name, to){
			let { schema } = this._eventRef;
			if(schema[name] == null || schema[to] != null) return;

			this._insEventsRef._renameFields(this.data.namespace, name, to);
			this.node.instance._emit('event.field.renamed', {
				old: name, now: to,
				namespace: this.data.namespace,
			});
		}
		deleteField(name){
			let { schema } = this._eventRef;
			if(schema[name] == null) return;

			delete schema[name];
			this._insEventsRef.refreshFields(this.data.namespace);
			this.node.instance._emit('event.field.deleted', {
				name, 
				namespace: this.data.namespace,
			});
		}

		_addToList(){
			let used = this._insEventsRef.list[this.data.namespace].used;
			if(!used.includes(this)) used.push(this);
			else console.error("Tried to adding this node to the InstanceEvents more than once");
		}
		_removeFromList(){
			let used = this._insEventsRef.list[this.data.namespace].used;
			let usedIndex = used.indexOf(this);
			if(usedIndex !== -1) used.splice(usedIndex, 1);
		}
	};

	Blackprint.registerInterface('BPIC/BP/Event/Listen',
	class extends BPEventListenEmit {
		initPorts(data){
			super.initPorts(data);

			if(this._listener) throw new Error("This node already listen to an event");
			this._listener = ev => this.node.eventUpdate(ev);

			this._insEventsRef.on(data.namespace, this._listener);
		}
	});

	Blackprint.registerInterface('BPIC/BP/Event/Emit',
	class extends BPEventListenEmit { });
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPEventInit);
else BPEventInit();