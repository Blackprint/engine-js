Blackprint.nodes.BP.Var = {
	Set: class extends Blackprint.Node {
		static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Var/Set');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {
				name: '',
				_scopeName: '',
				scope: VarScope.Public,
			};

			iface.title = 'VarSet';
			iface.type = 'bp-var-set';

			iface._enum = _InternalNodeEnum.BPVarSet;
		}
		update(){
			this.iface._bpVarRef.value = this.input.Val;
		}
		destroy(){ this.iface.destroyIface() }
	},
	Get: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Var/Get');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {
				name: '',
				_scopeName: '',
				scope: VarScope.Public,
			};

			iface.title = 'VarGet';
			iface.type = 'bp-var-get';

			iface._enum = _InternalNodeEnum.BPVarGet;
		}
		destroy(){ this.iface.destroyIface() }
	},
};

// used for instance.createVariable
class BPVariable extends CustomEvent {
	constructor(id, options, instance){
		super();
		// this.rootInstance = instance;

		id = id.replace(/^\/|\/$/gm, '');
		this.id = id.replace(/[`~!@#$%^&*()\-_+={}\[\]:"|;'\\,.<>?]+/g, '_');
		this.title = options?.title || id;

		// The type need to be defined dynamically on first cable connect
		this.type = Types.Slot;
		this.used = []; // [Interface, Interface, ...]

		this.totalSet = 0;
		this.totalGet = 0;
	}

	_value = null;
	get value(){return this._value}
	set value(val){
		if(this._value === val) return;
		this._value = val;
		this.emit('value');
	}

	destroy(){
		let map = this.used; // This list can be altered multiple times when deleting a node
		for (let i=map.length-1; i >= 0; i = map.length-1) {
			let iface = map[i];
			iface.node.instance.deleteNode(iface);
		}
	}
}

Blackprint._utils.BPVariable = BPVariable;

let BPVarEventSlot = {slot: "bp-engine-var"};

// ==== Interface ====
// Register when ready
function BPVarInit(){
	class BPVarGetSet extends Blackprint.Interface {
		constructor(node){
			super(node);
			this._dynamicPort = true; // Port is initialized dynamically
		}
		init(){
			this._recheckRoute();
		}
		imported(data){
			if(data.scope == null || data.name == null)
				throw new Error("'scope' and 'name' options is required for creating variable node");

			this.changeVar(data.name, data.scope);
			let temp = this._bpVarRef;
			temp.used.push(this);
		}
		changeVar(name, scopeId){
			if(this.data.name !== '')
				throw new Error(`Can't change variable node that already be initialized`);

			this.data.name = name;
			this.data.scope = scopeId;

			let _scopeName;
			if(scopeId === VarScope.Public) _scopeName = 'public';
			else if(scopeId === VarScope.Private) _scopeName = 'private';
			else if(scopeId === VarScope.Shared) _scopeName = 'shared';
			else throw new Error("Unrecognized scopeId: " + scopeId);

			if(Blackprint.Sketch != null)
				this.data._scopeName = _scopeName;

			let _funcInstance = this.node.instance._funcMain?.node._funcInstance;

			let scope;
			if(scopeId === VarScope.Public)
				scope = (_funcInstance?.rootInstance ?? this.node.instance).variables;
			else if(scopeId === VarScope.Shared)
				scope = _funcInstance.variables;
			else // private
				scope = this.node.instance.variables;

			let construct = getDeepProperty(scope, name.split('/'));
			if(construct == null)
				throw new Error(`'${name}' variable was not defined on the '${_scopeName}' instance`);

			return construct;
		}
		useType(port){
			let temp = this._bpVarRef;
			if(temp.type !== Types.Slot){
				if(port == null) temp.type = Types.Slot;
				return;
			}

			if(port == null) throw new Error("Can't set type with null or undefined");

			let cable;
			if(port === true){
				cable = this.$space('cables').currentCable;
				if(cable == null) return;
			}

			if(port instanceof Blackprint.Engine.Cable)
				cable = port;

			if(cable != null)
				port = cable.owner;

			temp.type = port._config || port.type;
			if(temp.type.portFeature === BP_Port.Trigger) temp.type = Types.Trigger;

			if(port.type === Types.Slot)
				this.waitTypeChange(temp, port);
			else {
				this._recheckRoute();
				temp.emit('type.assigned');
			}

			// Also create port for other node that using this variable
			let map = temp.used;
			for (let i=0; i < map.length; i++) {
				let item = map[i];
				let temp = item._reinitPort();
				if(item === this)
					temp.connectCable(cable);
			}
		}
		waitTypeChange(bpVar, port){
			this._waitTypeChange = () => {
				if(port != null) {
					bpVar.type = port._config || port.type;
					if(bpVar.type.portFeature === BP_Port.Trigger) bpVar.type = Types.Trigger;
					bpVar.emit('type.assigned');
				}
				else {
					let target = this.input.Val || this.output.Val;
					target.assignType(bpVar.type);
				}

				this._recheckRoute();
			};

			this._destroyWaitType = () => { bpVar.off('type.assigned', this._waitTypeChange); };
			(port || bpVar).once('type.assigned', this._waitTypeChange);
		}
		destroyIface(){
			this._destroyWaitType?.();

			let temp = this._bpVarRef;
			if(temp === void 0) return;

			let i_node = temp.used.indexOf(this);
			if(i_node !== -1) temp.used.splice(i_node, 1);

			let listener = this._bpVarRef.listener;
			if(listener == null) return;

			let i = listener.indexOf(this);
			if(i !== -1) listener.splice(i, 1)
		}
		_recheckRoute(){
			if(this.input?.Val?.type === Types.Trigger
			|| this.output?.Val?.type === Types.Trigger){
				let routes = this.node.routes;
				routes.disableOut = true;
				routes.noUpdate = true;
			}
		}
	}
	Blackprint._utils.BPVarGetSet = BPVarGetSet;

	Blackprint.registerInterface('BPIC/BP/Var/Get',
	class extends BPVarGetSet {
		changeVar(name, scopeId){
			if(this.data.name !== '')
				throw new Error(`Can't change variable node that already be initialized`);

			if(this._onChanged != null)
				this._bpVarRef?.off('value', this._onChanged);

			let varRef = super.changeVar(name, scopeId);
			this.title = name.split('/').join(' / ');

			let temp = this._bpVarRef = varRef;
			if(temp.type === Types.Slot) return;

			this._reinitPort();
			this._recheckRoute();
		}

		_reinitPort(){
			let temp = this._bpVarRef;
			let node = this.node;

			if(temp.type === Types.Slot) this.waitTypeChange(temp);

			if(this.output.Val !== void 0)
				node.deletePort('output', 'Val');

			let ref = node.output;
			node.createPort('output', 'Val', temp.type);

			if(temp.type === Types.Trigger){
				this._eventListen = 'call';
				this._onChanged = () => { ref.Val() };
			}
			else{
				this._eventListen = 'value';
				this._onChanged = () => { ref.Val = temp._value };
			}

			if(temp.type !== Types.Trigger)
				node.output.Val = temp._value;

			temp.on(this._eventListen, this._onChanged);
			return this.output.Val;
		}
		destroyIface(){
			if(this._eventListen != null)
				this._bpVarRef.off(this._eventListen, this._onChanged);

			super.destroyIface();
		}
	});

	Blackprint.registerInterface('BPIC/BP/Var/Set',
	class extends BPVarGetSet {
		changeVar(name, scopeId){
			let varRef = super.changeVar(name, scopeId);
			this.title = name.split('/').join(' / ');

			let temp = this._bpVarRef = varRef;
			if(temp.type === Types.Slot) return;

			this._reinitPort();
			this._recheckRoute();
		}

		_reinitPort(){
			let {input, node} = this;
			let temp = this._bpVarRef;

			if(temp.type === Types.Slot) this.waitTypeChange(temp);

			if(input.Val !== void 0)
				node.deletePort('input', 'Val');

			if(temp.type === Types.Trigger){
				node.createPort('input', 'Val', BP_Port.Trigger(function(){
					temp.emit('call');
				}));
			}
			else node.createPort('input', 'Val', temp.type);

			return this.input.Val;
		}
	});
}

var VarScope = Blackprint.VarScope = {
	Public: 0,
	Private: 1,
	Shared: 2,
};

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPVarInit);
else BPVarInit();