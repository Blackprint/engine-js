Blackprint.nodes.BP.fn = {
	input: class extends Blackprint.Node {
		// static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BP/fn/input');
			iface.title = 'FnInput';
			iface.type = 'bp-fn-input';
		}
	},
	output: class extends Blackprint.Node {
		// static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BP/fn/output');
			iface.title = 'FnOutput';
			iface.type = 'bp-fn-output';
		}
	},
};

// used for instance.createFunction
class BPFunction {
	constructor(){
		this.id = this.title = id;
		this.category = 'Uncategorized';
		this.description = '';

		this.variables = {}; // just like instance variable
		this.input = {};
		this.output = {};

		this.used = [];
		let temp = this;

		this.node = class extends BPFunctionNode {
			static input = this.output;
			static output = this.input;

			constructor(instance){
				super(instance);
				this._funcInstance = temp;
			}
		};
	}

	createPort(){}
	renamePort(){}
	deletePort(){}
}

// Copy the function
BPFunction.prototype.createVariable = Engine.prototype.createVariable;

class BPFunctionNode extends Blackprint.Node {
	imported(data){
		let instance = this._funcInstance;
		instance.used.push(this);
	}

	update(source, port, cable){
		// port => input port from current node
		this.output[port.name] = cable.value;
	}

	destroy(){
		let instance = this._funcInstance;

		let i = instance.used.indexOf(this);
		if(i !== -1) instance.used.splice(i, 1);
	}
}


// ==== Interface ====
class BPFnInOut extends Blackprint.Interface {
	imported(data){ this.changeVar(data.name, data.scope) }
}

Blackprint._iface['BP/fn/input'] = class extends BPFnInOut {
	// static output = {};
};

Blackprint._iface['BP/fn/output'] = class extends BPFnInOut {
	// static input = {};
};