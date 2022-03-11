Blackprint.nodes.BP.var = {
	set: class extends Blackprint.Node {
		// static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Var/Set');
			iface.title = 'VarSet';
			iface.type = 'bp-var-set';
		}
	},
	get: class extends Blackprint.Node {
		// static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Var/Get');
			iface.title = 'VarGet';
			iface.type = 'bp-var-get';
		}
	},
};

// used for instance.createVariable
class BPVariable extends CustomEvent {
	constructor(id, type){
		super();

		this.id = this.title = id;
		this.type = type;
		this.category = 'Uncategorized';
	}

	_value = null;
	get value(){return this._value}
	set value(val){
		this._value = val;
		this.emit('value');
	}
}


// ==== Interface ====
// Register when ready
function BPVarInit(){
	class BPVarGetSet extends Blackprint.Interface {
		imported(data){
			data ??= {name: 'varName'};
			this.changeVar(data.name, data.scope);
		}
		changeVar(name, scopeName){
			this.name = name;
			this.scope = scopeName;

			let scope;
			if(this.scope === 'public')
				scope = this.node._instance.variables;
			else {
				if(this.node._funcInstance == null)
					throw new Error(`Can't access to private instance's variable`);

				scope = this.node._funcInstance.variables;
			}

			if(!(name in scope))
				throw new Error(`'${name}' variable was not defined on the '${scopeName}' instance`);

			return scope;
		}
		static destroy(iface){
			if(iface._bpVarRef === void 0) return;

			let listener = iface._bpVarRef.listener;
			let i = listener.indexOf(iface);

			if(i !== -1) listener.splice(i, 1)
		}
	}

	Blackprint.registerInterface('BPIC/BP/Var/Get',
	class extends BPVarGetSet {
		changeVar(name, scopeName){
			let scope = super.changeVar(name, scopeName);
			let node = this.node;

			if(this.output.Val !== void 0)
				node.deletePort('output', 'Val');

			let temp = this._bpVarRef = scope[this.name];
			node.createPort('output', 'Val', temp.type);

			let listener = temp.listener;
			let i = listener.indexOf(iface);
			if(i !== -1) listener.splice(i, 1)

			listener.push(this);
		}
	});

	Blackprint.registerInterface('BPIC/BP/Var/Set',
	class extends BPVarGetSet {
		changeVar(name, scopeName){
			let scope = super.changeVar(name, scopeName);
			let {input, node} = this;

			if(input.Val !== void 0)
				node.deletePort('input', 'Val');

			let temp = this._bpVarRef = scope[this.name];

			node.createPort('input', 'Val', temp.type);
			input.Val.on('value', ev => {
				temp.setValue(ev.cable.value);
			});
		}
	});
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPVarInit);
else BPVarInit();