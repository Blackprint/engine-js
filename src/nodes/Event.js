Blackprint.nodes.BP.Event = {
	Listen: class extends Blackprint.Node {
		static output = {};
		static input = {
			Limit: Blackprint.Port.Default(Number, 0),
			Reset: Blackprint.Port.Trigger(port => port.iface.node.resetLimit()),
			Off: Blackprint.Port.Trigger(port => port.iface.node.trigger()),
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
		}
		resetLimit(){
			let limit = this.input.Limit;
			this._limit = limit === 0 ? -1 : limit;
		}
		eventUpdate(obj){
			if(this._off || this._limit === 0) return;
			if(this._limit > 0) this._limit--;

			Object.assign(this.output, obj);
			this.routes.routeOut();
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
		imported(data){
			let namespace = data.namespace;
			if(!namespace) throw new Error("Parameter 'namespace' is required");
			this.data.namespace = namespace;
			this.title = namespace.split('/').pop();

			let eventIns = this.node.instance.events;
			if(eventIns[namespace] == null){
				// create if not exist
				eventIns.createEvent(namespace);
				this._eventRef = eventIns.list[namespace];
			}
			else this._eventRef = eventIns.list[namespace];
		}
	};

	Blackprint.registerInterface('BPIC/BP/Event/Listen',
	class extends BPEventListenEmit {
		imported(data){
			super.imported(data);

			if(this._listener) throw new Error("This node already listen to an event");
			this._listener = ev => {
				if(ev == null) return;
				this.node.eventUpdate(ev);
			}

			this.node.instance.events.on(data.namespace, this._listener);
		}
		destroy(){
			if(this._listener == null) return;
			this.node.instance.events.off(this.data.namespace, this._listener);
		}
	});

	Blackprint.registerInterface('BPIC/BP/Event/Emit',
	class extends BPEventListenEmit { });
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPEventInit);
else BPEventInit();