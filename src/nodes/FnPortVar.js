Blackprint.nodes.BP.FnVar = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/FnVar/Input');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {name: ''};
			iface.title = 'FnInput';

			iface.enum = _InternalNodeEnum.BPFnVarInput;
			iface._dynamicPort = true; // Port is initialized dynamically
		}
	},
	Output: class extends Blackprint.Node {
		static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/FnVar/Output');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {name: ''};
			iface.title = 'FnOutput';

			iface.enum = _InternalNodeEnum.BPFnVarOutput;
			iface._dynamicPort = true; // Port is initialized dynamically
		}
		update(){
			let id = this.iface.data.name;
			this.refOutput[id] = this.ref.Input.Val;
		}
	},
};

// ==== Interface ====
// Register when ready
function BPFnVarInit(){
	class BPFnVarInOut extends Blackprint.Interface {
		imported(data){
			if(!data.name) throw new Error("Parameter 'name' is required");
			this.data.name = data.name;
			this._parentFunc = this.node._instance._funcMain;
		}
	};

	Blackprint.registerInterface('BPIC/BP/FnVar/Input',
	class extends BPFnVarInOut {
		constructor(node){
			super(node);
			this.type = 'bp-fnvar-input';
		}
		imported(data){
			super.imported(data);
			let ports = this._parentFunc.ref.IInput;
			let node = this.node;

			// Create temporary port if the main function doesn't have the port
			let name = data.name;
			if(!(name in ports)){
				let iPort = node.createPort('output', name, null); // null = any type
				iPort.onConnect = (cable, port) => {
					delete iPort.onConnect;

					cable.disconnect();
					node.deletePort('output', 'Val');

					let portType = port.feature != null ? port.feature(port.type) : port.type;
					let newPort = node.createPort('output', 'Val', portType);
					newPort.connectCable(cable);

					this._parentFunc.addPort(port, name);
					this._addListener();
				};
			}
			else{
				let port = ports[name];
				let portType = port.feature != null ? port.feature(port.type) : port.type;
				node.createPort('output', 'Val', portType);
				this._addListener();
			}
		}
		_addListener(){
			let data = this.data;

			this._listener = v => {
				if(v.key !== data.name) return;
				this.ref.Output.Val = v.value;
			};

			this._parentFunc.input[data.name].on('value', this._listener);
		}
		destroy(){
			super.destroy();

			if(this._listener == null) return;
			this._parentFunc.input[this.data.name].off('value', this._listener);
		}
	});

	Blackprint.registerInterface('BPIC/BP/FnVar/Output',
	class extends BPFnVarInOut {
		constructor(node){
			super(node);
			this.type = 'bp-fnvar-output';
		}
		imported(data){
			super.imported(data);
			let ports = this._parentFunc.ref.IOutput;
			let node = this.node;

			node.refOutput = this._parentFunc.ref.Output;

			// Create temporary port if the main function doesn't have the port
			let name = data.name;
			if(!(name in ports)){
				let iPort = node.createPort('input', name, null); // null = any type
				iPort.onConnect = (cable, port) => {
					delete iPort.onConnect;

					cable.disconnect();
					node.deletePort('input', 'Val');

					let portType = port.feature != null ? port.feature(port.type) : port.type;
					let newPort = node.createPort('input', 'Val', portType);
					newPort.connectCable(cable);

					this._parentFunc.addPort(port, name);
				};
			}
			else {
				let port = ports[name];
				let portType = port.feature != null ? port.feature(port.type) : port.type;
				node.createPort('input', 'Val', portType);
			}
		}
	});
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPFnVarInit);
else BPFnVarInit();