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
		}
		imported(){
			this.routes.disabled = true;
		}
		request(cable){
			let iface = this.iface;

			// This will trigger the port to request from outside and assign to this node's port
			this.output.Val = iface.parentInterface.node.input[iface.data.name];
		}
		destroy(){
			let iface = this.iface;
			if(iface._listener == null) return;

			let port = iface._proxyIface.output[iface.data.name];
			if(port.feature === BP_Port.Trigger)
				port.off('call', iface._listener);
			else port.off('value', iface._listener);
		}
	},

	// [Deleted] Delete this node notice on v1.0
	Output: class extends Blackprint.Node {
		static input = {Val: Blackprint.Types.Any};
		constructor(instance){
			super(instance);
			console.error("Function Output Variable node is removed. Use BP/Fn/Output instead.");

			let iface = this.setInterface();
			iface.data = {name: ''};
			iface.title = 'Function Output Variable';
			iface.description = 'This will be removed in the future. Use BP/Fn/Output instead.';
			iface._enum = _InternalNodeEnum.BPFnVarOutput;
		}
		update(){}
	}
};

// ==== Interface ====
// Register when ready
function BPFnVarInit(){
	class BPFnVarInOut extends Blackprint.Interface {
		constructor(node){
			super(node);
			this._dynamicPort = true; // Port is initialized dynamically
		}
		imported(data){
			if(!data.name) throw new Error("Parameter 'name' is required");
			this.data.name = data.name;
			this.parentInterface = this.node.instance.parentInterface;
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
			let ports = this.parentInterface.ref.IInput;
			let node = this.node;

			this._proxyIface = this.parentInterface._proxyInput.iface;

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
					let portType = getFnPortType(port, 'input', this, portName);
					iPort.assignType(portType);
					iPort._name = portName;

					proxyIface.createPort(port, name);
					(cable.owner === iPort ? port : iPort).connectCable(cable);

					this._addListener();
					return true;
				};

				// Run when main node is the missing port
				this._waitPortInit = ({ port }) => {
					// Skip port with feature: ArrayOf
					if(port.feature === BP_Port.ArrayOf) return;

					delete iPort.onConnect;
					delete this._waitPortInit;

					let portType = getFnPortType(port, 'input', this, port._name);
					iPort.assignType(portType);
					iPort._name = port._name;

					this._addListener();
				}

				proxyIface.once(`_add.${name}`, this._waitPortInit);
			}
			else{
				if(this.output.Val === void 0){
					let port = this.parentInterface._proxyInput.iface.output[name];
					let portType = getFnPortType(port, 'input', this, port._name);

					let newPort = node.createPort('output', 'Val', portType);
					newPort._name = port._name ??= {name};
				}

				this._addListener();
			}
		}
		_addListener(){
			let port = this._proxyIface.output[this.data.name];
			if(port.type === Types.Trigger){
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
	});
}

let PortTriggerDummy = BP_Port.Trigger(()=> { throw new Error("This can't be called"); });
function getFnPortType(port, which, forIface, ref){
	let portType;
	if(port.feature === BP_Port.Trigger || port.type === Types.Trigger){
		// Function Input (has output port inside, and input port on main node)
		if(which === 'input')
			portType = Types.Trigger;
		else
			portType = PortTriggerDummy;
	}
	// Skip ArrayOf port feature, and just use the type
	else if(port.feature === BP_Port.ArrayOf){
		portType = port.type;
	}
	else if(port._isSlot){
		throw new Error("Function node's input/output can't use port from an lazily assigned port type (Types.Slot)");
	}
	else portType = port._config;

	return portType;
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPFnVarInit);
else BPFnVarInit();