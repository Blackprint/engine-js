Blackprint.nodes.BP.FnVar = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/FnVar/Input');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {name: ''};
			iface.title = 'FnInput';

			iface._enum = _InternalNodeEnum.BPFnVarInput;
			iface._dynamicPort = true; // Port is initialized dynamically
		}
		imported(){
			this.routes.disabled = true;
		}
		request(cable){
			let iface = this.iface;

			// This will trigger the port to request from outside and assign to this node's port
			this.output.Val = iface._funcMain.node.input[iface.data.name];
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

			iface._enum = _InternalNodeEnum.BPFnVarOutput;
			iface._dynamicPort = true; // Port is initialized dynamically
		}
		update(){
			let id = this.iface.data.name;
			this.refOutput[id] = this.ref.Input.Val;

			// Also update the cache on the proxy node
			this.iface._funcMain._proxyOutput.ref.IInput[id]._cache = this.ref.Input.Val;
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
			this._funcMain = this.node.instance._funcMain;
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
			let ports = this._funcMain.ref.IInput;
			let node = this.node;

			this._proxyIface = this._funcMain._proxyInput.iface;

			// Create temporary port if the main function doesn't have the port
			let name = data.name;
			if(!(name in ports)){
				let iPort = node.createPort('output', 'Val', Types.Slot);
				let proxyIface = this._proxyIface;

				// Run when this node is being connected with other node
				iPort.onConnect = (cable, port) => {
					// Skip port with feature: ArrayOf
					if(port.feature === BP_Port.ArrayOf) return;

					delete iPort.onConnect;
					proxyIface.off(`_add.${name}`, this._waitPortInit);
					delete this._waitPortInit;

					let portName = {name};
					let portType = getFnPortType(port, 'input', this._funcMain, portName);
					iPort.assignType(portType);
					iPort._name = portName;

					proxyIface.addPort(port, name);
					(cable.owner === iPort ? port : iPort).connectCable(cable);

					this._addListener();
					return true;
				};

				// Run when main node is the missing port
				this._waitPortInit = port => {
					// Skip port with feature: ArrayOf
					if(port.feature === BP_Port.ArrayOf) return;

					delete iPort.onConnect;
					delete this._waitPortInit;

					let portType = getFnPortType(port, 'input', this._funcMain, port._name);
					iPort.assignType(portType);
					this._addListener();
				}

				proxyIface.once(`_add.${name}`, this._waitPortInit);
			}
			else{
				if(this.output.Val === void 0){
					let port = ports[name];
					let portType = getFnPortType(port, 'input', this._funcMain, port._name);
					node.createPort('output', 'Val', portType);
				}

				this._addListener();
			}
		}
		_addListener(){
			let port = this._proxyIface.output[this.data.name];
			if(port.feature === BP_Port.Trigger){
				this._listener = () => {
					this.ref.Output.Val();
				};

				port.on('call', this._listener);
			}
			else{
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

				port.on('value', this._listener);
			}
		}
		destroy(){
			// super.destroy();
			if(this._listener == null) return;

			let port = this._proxyIface.output[this.data.name];
			if(port.feature === BP_Port.Trigger)
				port.off('call', this._listener);
			else port.off('value', this._listener);
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
			let ports = this._funcMain.ref.IOutput;
			let node = this.node;

			node.refOutput = this._funcMain.ref.Output;

			// Create temporary port if the main function doesn't have the port
			let name = data.name;
			if(!(name in ports)){
				let iPort = node.createPort('input', 'Val', Types.Slot);
				let proxyIface = this._funcMain._proxyOutput.iface;

				// Run when this node is being connected with other node
				iPort.onConnect = (cable, port) => {
					// Skip port with feature: ArrayOf
					if(port.feature === BP_Port.ArrayOf) return;

					delete iPort.onConnect;
					proxyIface.off(`_add.${name}`, this._waitPortInit);
					delete this._waitPortInit;

					let portName = {name};
					let portType = getFnPortType(port, 'output', this._funcMain, portName);
					iPort.assignType(portType);
					iPort._name = portName;

					proxyIface.addPort(port, name);
					(cable.owner === iPort ? port : iPort).connectCable(cable);

					return true;
				};

				// Run when main node is the missing port
				this._waitPortInit = port => {
					// Skip port with feature: ArrayOf
					if(port.feature === BP_Port.ArrayOf) return;

					delete iPort.onConnect;
					delete this._waitPortInit;

					let portType = getFnPortType(port, 'output', this._funcMain, port._name);
					iPort.assignType(portType);
				}
				proxyIface.once(`_add.${name}`, this._waitPortInit);
			}
			else {
				let port = ports[name];
				let portType = getFnPortType(port, 'output', this._funcMain, port._name);
				node.createPort('input', 'Val', portType);
			}
		}
	});
}

function getFnPortType(port, which, parentNode, ref){
	let portType;
	if(port.feature === BP_Port.Trigger){
		if(which === 'input') // Function Input (has output port inside, and input port on main node)
			portType = Function;
		else portType = BP_Port.Trigger(parentNode.output[ref.name]._callAll);
	}
	else portType = port.feature != null ? port.feature(port.type) : port.type;

	return portType;
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPFnVarInit);
else BPFnVarInit();