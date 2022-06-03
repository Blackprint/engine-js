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
		imported(){
			this.routes.disabled = true;
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

			this._proxyIface = this._parentFunc._proxyInput.iface;

			// Create temporary port if the main function doesn't have the port
			let name = data.name;
			if(!(name in ports)){
				let iPort = node.createPort('output', 'Val', null); // null = any type
				let proxyIface = this._proxyIface;

				// Run when this node is being connected with other node
				iPort.onConnect = (cable, port) => {
					delete iPort.onConnect;
					proxyIface.off(`_add.${name}`, this._waitPortInit);

					cable.disconnect();
					node.deletePort('output', 'Val');

					let portType = port.feature != null ? port.feature(port.type) : port.type;
					let newPort = node.createPort('output', 'Val', portType);
					newPort.connectPort(port);

					proxyIface.addPort(port, name);
					this._addListener();
					return true;
				};

				// Run when main node is the missing port
				this._waitPortInit = port => {
					delete iPort.onConnect;
					let backup = this.output.Val.cables.map(cable => cable.output);

					node.deletePort('output', 'Val');

					let portType = port.feature != null ? port.feature(port.type) : port.type;
					let newPort = node.createPort('output', 'Val', portType);
					this._addListener();

					for (let i=0; i < backup.length; i++)
						newPort.connectPort(backup[i]);
				}

				proxyIface.once(`_add.${name}`, this._waitPortInit);
			}
			else{
				if(this.output.Val === void 0){
					let port = ports[name];
					let portType = port.feature != null ? port.feature(port.type) : port.type;
					node.createPort('output', 'Val', portType);
				}

				this._addListener();
			}
		}
		_addListener(){
			this._listener = ({ port }) => {
				if(port.iface.node.routes.out != null){
					let { Val } = this.ref.IOutput;
					Val.value = port.value; // Change value without trigger node.update

					let list = Val.cables;
					for (let i=0; i < list.length; i++) {
						let temp = list[i];
						if(temp.hasBranch) continue;

						// Clear connected cable's cache
						temp.input._cache = void 0;
					}
					return;
				}

				this.ref.Output.Val = port.value;
			};

			this._proxyIface.output[this.data.name].on('value', this._listener);
		}
		destroy(){
			super.destroy();

			if(this._listener == null) return;
			this._proxyIface.output[this.data.name].off('value', this._listener);
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
				let iPort = node.createPort('input', 'Val', null); // null = any type
				let proxyIface = this._parentFunc._proxyOutput.iface;

				// Run when this node is being connected with other node
				iPort.onConnect = (cable, port) => {
					delete iPort.onConnect;
					proxyIface.off(`_add.${name}`, this._waitPortInit);

					cable.disconnect();
					node.deletePort('input', 'Val');

					let portType = port.feature != null ? port.feature(port.type) : port.type;
					let newPort = node.createPort('input', 'Val', portType);
					newPort.connectPort(port);

					proxyIface.addPort(port, name);
					return true;
				};

				// Run when main node is the missing port
				this._waitPortInit = port => {
					delete iPort.onConnect;
					let backup = this.input.Val.cables.map(cable => cable.output);

					node.deletePort('input', 'Val');

					let portType = port.feature != null ? port.feature(port.type) : port.type;
					let newPort = node.createPort('input', 'Val', portType);

					for (let i=0; i < backup.length; i++)
						newPort.connectPort(backup[i]);
				}
				proxyIface.once(`_add.${name}`, this._waitPortInit);
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