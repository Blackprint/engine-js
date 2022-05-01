Blackprint.nodes.BP.Var = {
	Set: class extends Blackprint.Node {
		static input = {};
		// static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Var/Set');
			iface.data = {};
			iface.title = 'VarSet';
			iface.type = 'bp-var-set';
		}
	},
	Get: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Var/Get');
			iface.data = {};
			iface.title = 'VarGet';
			iface.type = 'bp-var-get';
		}
	},
};

let typeNotSet = {typeNotSet: true}; // Flag that a port is not set

// used for instance.createVariable
class BPVariable extends CustomEvent {
	constructor(id, options, instance){
		super();
		this.instance = instance;

		this.id = this.title = id;

		// The type need to be defined dynamically on first cable connect
		this.type = typeNotSet;

		this.totalSet = 0;
		this.totalGet = 0;
	}

	_value = null;
	get value(){return this._value}
	set value(val){
		this._value = val;
		this.emit('value');
	}
}

Blackprint._utils.BPVariable = BPVariable;

let BPVarEventSlot = {slot: "bp-engine-var"};

// ==== Interface ====
// Register when ready
function BPVarInit(){
	class BPVarGetSet extends Blackprint.Interface {
		imported(data){
			this.changeVar(data.name, data.scope || 'instance');
		}
		changeVar(name, scopeName){
			this.data.name = name;
			this.data.scope = scopeName;

			let scope;
			if(scopeName === 'instance')
				scope = this.node._instance.variables;
			else {
				if(this.node._funcInstance == null)
					throw new Error(`Can't access to private variable`);

				scope = this.node._funcInstance.variables;
			}

			if(!(name in scope))
				throw new Error(`'${name}' variable was not defined on the '${scopeName}' instance`);

			return scope;
		}
		useType(port){
			let temp = this._bpVarRef;
			if(temp.type !== typeNotSet){
				if(port === undefined) temp.type = typeNotSet;
				return;
			}

			if(port === undefined) throw new Error("Can't set type with undefined");

			let cable;
			if(port === true){
				cable = this.$space('cables').currentCable;
				if(cable == null) return;
			}

			if(port instanceof Blackprint.Engine.Cable)
				cable = port;

			if(cable != null)
				port = cable.owner;

			temp.type = port.type;

			let targetPort = this._reinitPort();
			if(cable != null)
				targetPort.connectCable(cable);
		}
		destroy(){
			if(this._bpVarRef === void 0) return;

			let listener = this._bpVarRef.listener;
			if(listener == null) return;

			let i = listener.indexOf(this);
			if(i !== -1) listener.splice(i, 1)
		}
	}

	Blackprint.registerInterface('BPIC/BP/Var/Get',
	class extends BPVarGetSet {
		changeVar(name, scopeName){
			if(this._onChanged != null)
				scope[this.data.name]?.off('value', this._onChanged);

			let scope = super.changeVar(name, scopeName);
			this.title = 'Get '+name;

			let temp = this._bpVarRef = scope[this.data.name];
			if(temp.type === typeNotSet) return;

			this._reinitPort();
		}

		_reinitPort(){
			let temp = this._bpVarRef;
			let node = this.node;
			if(this.output.Val !== void 0)
				node.deletePort('output', 'Val');

			let ref = this.node.output;
			if(temp.type === Function || temp.type.prototype instanceof Function){
				node.createPort('output', 'Val', temp.type);

				this._eventListen = 'call';
				this._onChanged = () => {
					ref.Val();
				}
			}
			else{
				node.createPort('output', 'Val', temp.type);

				this._eventListen = 'value';
				this._onChanged = () => {
					ref.Val = temp._value;
				}
			}

			temp.on(this._eventListen, this._onChanged);
			return this.output.Val;
		}
		destroy(){
			if(this._eventListen != null)
				this._bpVarRef.off(this._eventListen, this._onChanged);

			super.destroy();
		}
	});

	Blackprint.registerInterface('BPIC/BP/Var/Set',
	class extends BPVarGetSet {
		changeVar(name, scopeName){
			let scope = super.changeVar(name, scopeName);
			this.title = 'Set '+name;

			let temp = this._bpVarRef = scope[this.data.name];
			if(temp.type === typeNotSet) return;

			this._reinitPort();
		}

		_reinitPort(){
			let {input, node} = this;
			let temp = this._bpVarRef;
			if(input.Val !== void 0)
				node.deletePort('input', 'Val');

			if(temp.type === Function || temp.type.prototype instanceof Function){
				node.createPort('input', 'Val', Blackprint.Port.Trigger(function(){
					temp.emit('call');
				}));
			}
			else{
				node.createPort('input', 'Val', temp.type);

				this._onChanged = ev => {
					temp.value = ev.cable.value;
				};

				input.Val.on('value', this._onChanged);
			}

			return this.input.Val;
		}
		destroy(){
			if(this._eventListen != null)
				this.input.Val?.off('value', this._onChanged);

			super.destroy();
		}
	});
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPVarInit);
else BPVarInit();