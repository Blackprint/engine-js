Blackprint.nodes.BP.Event = {
	Listen: class extends Blackprint.Node {
		static output = {};
		static input = {
			Limit: Blackprint.Port.Default(Number, 0),
			Reset: Blackprint.Port.Trigger(port => port.iface.node.resetLimit()),
			Off: Blackprint.Port.Trigger(port => port.iface.node.offEvent()),
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

			Object.assign(this.output, obj);
			this.routes.routeOut();
		}
		offEvent(){
			if(this._off === false){
				let iface = this.iface;
				this.instance.events.off(iface.data.namespace, iface._listener);

				this._off = true;
			}
		}
	},
	Emit: class extends Blackprint.Node {
		static input = {
			Emit: Blackprint.Port.Trigger(port => port.iface.node.trigger()),
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

			let eventIns = this.node.instance.events;
			if(eventIns.list[namespace] == null){
				// create if not exist
				eventIns.createEvent(namespace);
				this._eventRef = eventIns.list[namespace];
			}
			else this._eventRef = eventIns.list[namespace];

			let { schema } = this._eventRef;
			let createPortTarget;
			if(this._enum === _InternalNodeEnum.BPEventListen){
				createPortTarget = 'output';
			}
			else createPortTarget = 'input';

			for (let key in schema) {
				this.node.createPort(createPortTarget, key, schema[key]);
			}
		}
		createField(name, type=Blackprint.Types.Any){
			let { schema } = this._eventRef;
			if(schema[name] != null) return;

			schema[name] = type;
			this._insEventsRef.refreshFields(this.data.namespace);
		}
		renameField(name, to){
			let { schema } = this._eventRef;
			if(schema[name] == null || schema[to] != null) return;

			this._insEventsRef._renameFields(this.data.namespace, name, to);
		}
		deleteField(name, type=Blackprint.Types.Any){
			let { schema } = this._eventRef;
			if(schema[name] == null) return;

			delete schema[name];
			this._insEventsRef.refreshFields(this.data.namespace);
		}
	};

	Blackprint.registerInterface('BPIC/BP/Event/Listen',
	class extends BPEventListenEmit {
		initPorts(data){
			super.initPorts(data);

			if(this._listener) throw new Error("This node already listen to an event");
			this._listener = ev => {
				if(ev == null) return;
				this.node.eventUpdate(ev);
			}

			this._insEventsRef.on(data.namespace, this._listener);
		}
		destroy(){
			if(this._listener == null) return;
			this._insEventsRef.off(this.data.namespace, this._listener);
		}
	});

	Blackprint.registerInterface('BPIC/BP/Event/Emit',
	class extends BPEventListenEmit { });
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPEventInit);
else BPEventInit();