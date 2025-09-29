Blackprint.Engine.Port = class Port extends Blackprint.Engine.CustomEvent{
	constructor(name, type, def, source, iface, haveFeature){
		super();

		this.name = name;
		this.type = type;
		this.cables = [];
		this.source = source;
		this.iface = iface;
		this._node = iface.node;
		this.classAdd = '';
		this.splitted = false;
		this._isSlot = type === Types.Slot;
		this.disabled = false; // for output port
		this._hasUpdate = false;
		this._calling = false;
		this.allowResync = false; // Retrigger connected node's .update when the output value is similar

		// this.value;
		if(haveFeature === BP_Port.Trigger){
			if(def === this._callAll) throw new Error("Logic error");

			this._callDef = def;
			this.default = this._call.bind(this);
		}
		else if(haveFeature === BP_Port.StructOf){
			if(Blackprint.Sketch != null)
				this.classAdd = 'BP-StructOf ';

			this.struct = def;
		}
		else this.default = def;

		// this.feature == BP_Port.Listener | BP_Port.ArrayOf | BP_Port.Async

		if(haveFeature){
			this.feature = haveFeature;

			if(haveFeature === BP_Port.ArrayOf && Blackprint.Sketch != null)
				this.classAdd = 'ArrayOf ';
		}
	}

	disconnectAll(hasRemote){
		var cables = this.cables;
		for (var i = cables.length - 1; i >= 0; i--){
			let cable = cables[i];

			if(hasRemote)
				cable._evDisconnected = true;

			cable.disconnect();
		}
	}

	_call(cable){
		let iface = this.iface;

		if(cable == null){
			cable = this._cable ??= {
				input: this,
				output: this,
			};
		}

		if(this._calling){
			let { input, output } = cable;
			throw new Error(`Circular call stack detected:\nFrom: ${output.iface.title}.${output.name}\nTo: ${input.iface.title}.${input.name})`);
		}

		this._calling = cable._calling = true;
		try {
			this._callDef(this);
		}
		finally {
			this._calling = cable._calling = false;
		}

		if(iface._enum !== _InternalNodeEnum.BPFnMain)
			iface.node.routes.routeOut();
	}

	async _callAll(){
		if(this.type === Types.Route){
			let cables = this.cables;
			var cable = cables[0];

			if(cable === void 0) return;
			if(cable.hasBranch) cable = cables[1];

			if(cable.input == null) return;
			await cable.input.routeIn(cable);
		}
		else {
			let node = this.iface.node;
			if(node.disablePorts) return;
			let executionOrder = node.instance.executionOrder;

			if(executionOrder.stop || executionOrder._rootExecOrder.stop) return;

			var cables = this.cables;
			for (var i = 0; i < cables.length; i++) {
				var cable = cables[i];

				var target = cable.input;
				if(target === void 0)
					continue;

				if(Blackprint.settings.visualizeFlow && !executionOrder.stepMode)
					cable.visualizeFlow();

				if(target._name != null)
					target.iface.parentInterface.node.iface.output[target._name.name]._callAll();
				else {
					if(executionOrder.stepMode){
						executionOrder._addStepPending(cable, 2);
						continue;
					}

					target.iface.input[target.name]._call(cable);
				}
			}

			this.emit('call');
		}
	}

	// Set for the linked port (Handle for ScarletsFrame)
	// ex: linkedPort = node.output.portName
	createLinker(){
		// Only for output (type: trigger)
		if(this.source === 'output' && (this.type === Types.Trigger || this.type === Types.Route)){
			// Disable sync
			this.sync = false;

			if(this.type !== Types.Trigger){
				this.isRoute = true;
				this.iface.node.routes.disableOut = true;
			}

			return {configurable: true, enumerable:true, writable:false, value: () => this._callAll()};
		}

		var port = this;
		var prepare = {
			configurable:true,
			enumerable:true,
			get(){
				// This port must use values from connected output
				if(port.source === 'input'){
					if(port._cache !== void 0) return port._cache;
					if(port.cables.length === 0) return port.default;

					let portIface = port.iface;

					// Flag current node is requesting value to other node
					portIface._requesting = true;

					// Return single data
					if(port.cables.length === 1){
						var cable = port.cables[0];

						if(cable.connected === false || cable.disabled){
							portIface._requesting = false;
							if(port.feature === BP_Port.ArrayOf)
								return port._cache = [];

							return port._cache = port.default;
						}

						var output = cable.output;

						// Request the data first
						if(output.value == null){
							let node = output.iface.node;
							let executionOrder = node.instance.executionOrder;
							if(executionOrder.stop || executionOrder._rootExecOrder.stop) return;

							if(executionOrder.stepMode && node.request != null){
								executionOrder._addStepPending(cable, 3);
								return;
							}

							node.request?.(cable);
						}

						if(Blackprint.settings.visualizeFlow)
							cable.visualizeFlow();

						portIface._requesting = false;
						if(port.feature === BP_Port.ArrayOf)
							return port._cache = [output.value];

						return port._cache = output.value ?? port.default;
					}

					let isNotArrayPort = port.feature !== BP_Port.ArrayOf;

					// Return multiple data as an array
					var cables = port.cables;
					var data = new Array(cables.length);
					for (var i = 0; i < cables.length; i++) {
						var cable = cables[i];
						if(cable.connected === false || cable.disabled)
							continue;

						var output = cable.output;

						// Request the data first
						if(output.value == null){
							let node = output.iface.node;
							let executionOrder = node.instance.executionOrder;
							if(executionOrder.stop || executionOrder._rootExecOrder.stop) return;

							if(executionOrder.stepMode && node.request != null){
								executionOrder._addStepPending(cable, 3);
								continue;
							}

							node.request?.(cable);
						}

						if(Blackprint.settings.visualizeFlow)
							cable.visualizeFlow();

						if(isNotArrayPort){
							portIface._requesting = false;
							return port._cache = output.value ?? port.default;
						}

						data[i] = output.value;
					}

					portIface._requesting = false;
					return port._cache = data;
				}

				// This may get called if the port is lazily assigned with Slot port feature
				if(port.type === Types.Trigger)
					return port.__call ??= () => port._callAll();

				// else type: output port, let's just return the value
				return port.value;
			}
		};

		// Can only obtain data when accessing input port
		if(port.source !== 'input'){
			prepare.set = function(val){ // for output/property port
				if(port.iface.node.disablePorts || (!(port.splitted || port.allowResync) && port.value === val) || port.disabled)
					return;

				let isNoConnection = port._node.instance._locked_ && port.cables === 0 && !port.splitted;
				if(isNoConnection && port._event?.value == null) return;

				if(val == null)
					val = port.default;

				// Data type validation
				else if(val.constructor !== port.type){
					if(port.type === Types.Any); // Pass
					else if(port.type === Types.Slot) throw new Error("Port type need to be assigned before giving any value");
					else if(port.type.union && port.type.includes(val.constructor)); // Pass
					else if(!(val instanceof port.type))
						throw new Error(port.iface.title+"> "+getDataType(val) + " is not instance of "+port.type.name);
				}

				port.value = val;
				port.emit('value', { port });

				if(isNoConnection) return;

				if(port.feature === BP_Port.StructOf && port.splitted){
					let node = port._node;
					let oldStatus = node._bpUpdating;

					node._bpUpdating = true;
					BP_Port.StructOf.handle(port, val);
					node._bpUpdating = oldStatus;

					if(oldStatus === false)
						node.instance.executionOrder.next();

					return;
				}

				port.sync(); // emit event to all input port connected to this port
			}
		}

		// Disable sync
		else port.sync = false;

		return prepare;
	}

	// this= output/property, target=input
	sync(){
		// Check all connected cables, if any node need to synchronize
		let cables = this.cables;
		let thisNode = this._node;
		let skipSync = thisNode.routes.out !== null;
		let instance = thisNode.instance;

		let singlePortUpdate = false;
		if(!thisNode._bpUpdating){
			singlePortUpdate = true;
			thisNode._bpUpdating = true;
		}

		if(thisNode.routes.out !== null
		   && thisNode.iface._enum === _InternalNodeEnum.BPFnMain
		   && thisNode.iface.bpInstance.executionOrder.length !== 0){
			skipSync = true;
		}

		for (var i = 0; i < cables.length; i++) {
			var cable = cables[i];
			if(cable.hasBranch) continue;

			var inp = cable.input;
			if(inp === void 0) continue;
			if(inp._cache != null && instance.executionOrder.stepMode)
				inp._oldCache = inp._cache;

			inp._cache = void 0;

			let inpIface = inp.iface;
			let inpNode = inpIface.node;
			let temp = { port: inp, target: this, cable };
			inp.emit('value', temp);
			inpIface.emit('port.value', temp);

			let nextUpdate = inpIface._requesting === false && inpNode.routes.in.length === 0;
			if(skipSync === false && thisNode._bpUpdating){
				if(inpNode.partialUpdate){
					if(inp.feature === BP_Port.ArrayOf){
						inp._hasUpdate = true;
						cable._hasUpdate = true;
					}
					else inp._hasUpdateCable = cable;
				}

				if(nextUpdate)
					instance.executionOrder.add(inpNode, cable);
			}

			// Skip sync if the node has route cable
			if(skipSync || thisNode._bpUpdating) continue;

			if(inpNode.update && nextUpdate)
				inpNode._bpUpdate(cable);
		}

		if(singlePortUpdate){
			thisNode._bpUpdating = false;
			thisNode.instance.executionOrder.next();
		}
	}

	disableCables(enable=false){
		var cables = this.cables;
		var i = 0;

		if(enable.constructor === Number) for(; i < cables.length; i++)
			cables[i].disabled += enable;
		else if(enable) for(; i < cables.length; i++)
			cables[i].disabled = 1;
		else for(; i < cables.length; i++)
			cables[i].disabled = 0;
	}

	_cableConnectError(name, obj){
		let msg = `Cable notify: ${name}`;
		if(obj.iface) msg += `\nIFace: ${obj.iface.namespace}`;

		if(obj.port)
			msg += `\nFrom port: ${obj.port.name} (iface: ${obj.port.iface.namespace})\n - Type: ${obj.port.source} (${obj.port.type.name})`;

		if(obj.target)
			msg += `\nTo port: ${obj.target.name} (iface: ${obj.target.iface.namespace})\n - Type: ${obj.target.source} (${obj.target.type.name})`;

		obj.message = msg;
		this.iface.node.instance._emit(name, obj);
	}

	assignType(type){
		if(type == null) throw new Error("Can't set type with undefined");

		if(this.type !== Blackprint.Types.Slot)
			throw new Error("Can only assign type to port with 'Slot' type");

		// Skip if the assigned type is also Slot type
		if(type === Blackprint.Types.Slot) return;

		// Check current output value type
		if(this.value != null && !(this.value instanceof type))
			throw new Error(`The output value of this port is not instance of type that will be assigned: ${this.value.constructor.name} is not instance of ${type.name}`);

		// Check connected cable's type
		let cables = this.cables;
		for (let i=0; i < cables.length; i++) {
			let inputPort = cables[i].input;
			if(inputPort == null) continue;

			let portType = inputPort.type;
			if(portType !== Blackprint.Types.Any
			   && (portType.prototype instanceof (type.portType == null ? type : type.portType)))
				throw new Error(`The target port's connection of this port is not instance of type that will be assigned: ${this.value.constructor.name} is not instance of ${type.name}`);
		}

		if(this.source === 'output' && type.portFeature != null){
			if(type.portFeature === BP_Port.Union)
				type = Types.Any;
			else if(type.portFeature === BP_Port.Trigger)
				type = type.portType;
			else if(type.portFeature === BP_Port.ArrayOf)
				type = Array;
			else if(type.portFeature === BP_Port.Default)
				type = type.portType;
		}

		if(type.portFeature != null){
			if(type.virtualType != null)
				this.virtualType = type.virtualType;

			if(type.portType == null) throw new Error("Missing type for port feature");

			this.feature = type.portFeature;
			this.type = type.portType;

			if(type.portFeature === BP_Port.StructOf){
				this.struct = type.default;
				this.classAdd += "BP-StructOf ";
			}
		}
		else this.type = type;

		// Trigger `connect` event for every connected cable
		for (let i=0; i < cables.length; i++) {
			let cable = cables[i];
			if(cable.disabled || cable.target == null) continue;
			cable._connected();
		}

		this._config = type;
		this.emit('type.assigned');
	}

	connectCable(cable){
		if(this._node.instance._locked_)
			throw new Error("This instance was locked");

		if(cable === void 0 && this._scope !== void 0)
			cable = this._scope('cables').currentCable;

		// It's not a cable might
		if(cable === void 0) return;
		let cableOwner = cable.owner;

		if(this.onConnect?.(cable, cableOwner) || cableOwner.onConnect?.(cable, this))
			return;

		if(cable.branch != null && cable.branch.length !== 0)
			throw new Error("Can't attach cable that have branch to this port");

		if(cable.isRoute){
			this._cableConnectError('cable.not_route_port', {cable, port: this, target: cableOwner});
			cable.disconnect();
			return;
		}

		if(cableOwner === this) // It's referencing to same port
			return cable.disconnect();

		// Remove cable if ...
		if((cable.source === 'output' && this.source !== 'input') // Output source not connected to input
			|| (cable.source === 'input' && this.source !== 'output')  // Input source not connected to output
			|| (cable.source === 'property' && this.source !== 'property')  // Property source not connected to property
		){
			this._cableConnectError('cable.wrong_pair', {cable, port: this, target: cableOwner});
			cable.disconnect();
			return;
		}

		if(cableOwner.source === 'output'){
			if((this.feature === BP_Port.ArrayOf && !BP_Port.ArrayOf.validate(this.type, cableOwner.type))
			   || (this.feature === BP_Port.Union && !BP_Port.Union.validate(this.type, cableOwner.type))){
				this._cableConnectError('cable.wrong_type', {cable, iface: this.iface, port: cableOwner, target: this});
				return cable.disconnect();
			}
		}

		else if(this.source === 'output'){
			if((cableOwner.feature === BP_Port.ArrayOf && !BP_Port.ArrayOf.validate(cableOwner.type, this.type))
			   || (cableOwner.feature === BP_Port.Union && !BP_Port.Union.validate(cableOwner.type, this.type))){
				this._cableConnectError('cable.wrong_type', {cable, iface: this.iface, port: this, target: cableOwner});
				return cable.disconnect();
			}
		}

		// ToDo: recheck why we need to check if the constructor is a function
		var isInstance = true;
		if(cableOwner.type !== this.type
		   && cableOwner.type.constructor === Function
		   && this.type.constructor === Function){
			if(cableOwner.source === 'output')
				isInstance = cableOwner.type.prototype instanceof this.type;
			else isInstance =  this.type.prototype instanceof cableOwner.type;
		}

		// Remove cable if type restriction
		if(!isInstance || (
			   cableOwner.type === Types.Trigger && this.type !== Types.Trigger
			|| cableOwner.type !== Types.Trigger && this.type === Types.Trigger
		)){
			this._cableConnectError('cable.wrong_type_pair', {cable, port: this, target: cableOwner});
			cable.disconnect();
			return;
		}

		// Check if the virtual type was mismatched (for engine-js only)
		// Emit warning only and still allow connection if the original type is matched
		if(!BP_Port.VirtualType.validate(this, cableOwner)){
			this._cableConnectError('cable.virtual_type_mismatch', {
				cable, port: this, target: cableOwner,
			});
		}

		// Restrict connection between function input/output node with variable node
		// Connection to similar node function IO or variable node also restricted
		// These port is created on runtime dynamically
		if(this.iface._dynamicPort && cableOwner.iface._dynamicPort){
			this._cableConnectError('cable.unsupported_dynamic_port', {cable, port: this, target: cableOwner});
			cable.disconnect();
			return;
		}

		var sourceCables = cableOwner.cables;

		// Remove cable if there are similar connection for the ports
		for (var i = 0; i < sourceCables.length; i++) {
			if(this.cables.includes(sourceCables[i])){
				this._cableConnectError('cable.duplicate_removed', {cable, port: this, target: cableOwner});
				cable.disconnect();
				return;
			}
		}

		// Put port reference to the cable
		cable.target = this;

		let inp, out;
		if(cable.target.source === 'input'){
			inp = cable.target;
			out = cableOwner;
		}
		else {
			inp = cableOwner;
			out = cable.target;
		}

		// Remove old cable if the port not support array
		if(inp.feature !== BP_Port.ArrayOf && inp.type !== Types.Trigger){
			let cables = inp.cables; // Cables in input port

			if(cables.length !== 0){
				let temp = cables[0];

				if(temp === cable)
					temp = cables[1];

				if(temp !== void 0){
					inp._cableConnectError('cable.replaced', {cable, oldCable: temp, port: inp, target: out});
					temp.disconnect();
				}
			}
		}

		// Connect this cable into port's cable list
		this.cables.push(cable);
		cable.connecting();

		return true;
	}

	connectPort(port){
		if(this._node.instance._locked_)
			throw new Error("This instance was locked");

		if(port instanceof Engine.Port){
			let cable = createPortCable(port);
			if(port._ghost) cable._ghost = true;

			port.cables.push(cable);
			if(this.connectCable(cable))
				return true;

			return false;
		}
		else if(port instanceof Blackprint.RoutePort){
			if(this.source === 'output'){
				let cable = createPortCable(this);
				this.cables.push(cable);
				return port.connectCable(cable);
			}
			throw new Error("Unhandled connection for RoutePort");
		}
		throw new Error("First parameter must be instance of Port or RoutePort");
	}
}

function createPortCable(port){
	if(port._scope != null)
		return port.createCable(null, true);
	return new Engine.Cable(port);
}

function getDataType(which){
	return which.constructor.name;
}