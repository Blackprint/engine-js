Blackprint.nodes.BP.Fn = {
	Main: class extends Blackprint.Node {
		// static input = {};
		// static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Main');
			iface.title = 'Unnamed';
			iface.type = 'function';
		}
	},
	Input: class extends Blackprint.Node {
		// static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Input');
			iface.title = 'Input';
			iface.type = 'bp-fn-input';
		}
	},
	Output: class extends Blackprint.Node {
		// static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Fn/Output');
			iface.title = 'Output';
			iface.type = 'bp-fn-output';
		}
	},
};

// used for instance.createFunction
class BPFunction extends CustomEvent {
	constructor(id, options, instance){
		super();

		this.instance = instance;
		this.id = this.title = id;
		this.description = options?.description ?? '';
		this.variables = {}; // private variables

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
// Register when ready
function BPFnInit(){
	class BPFnInOut extends Blackprint.Interface {
		imported(data){
			data ??= {name: 'funcName'};
			this.changeVar(data.name, data.scope);
		}
		changeVar(name){
			this.name = name;
			this.title = name;
		}
	}

	Blackprint.registerInterface('BPIC/BP/Fn/Main',
	class extends BPFnInOut {
		static input = {};
		static output = {};
	});

	Blackprint.registerInterface('BPIC/BP/Fn/Input',
	class extends BPFnInOut {
		static output = {};
	});

	Blackprint.registerInterface('BPIC/BP/Fn/Output',
	class extends BPFnInOut {
		static input = {};
	});
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPFnInit);
else BPFnInit();