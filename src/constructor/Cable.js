class Cable{
	constructor(owner, target){
		let type = owner.type;

		this.typeName = !type ? 'Any' : type.name; // type from input port
		this.owner = owner; // may be input/output port
		this.target = target;

		// If false then we assume it's haven't been connected
		this.disabled = false;
		this.connected = false;
		this.isRoute = false;
		this._calling = false;
		this._disconnecting = false;
	}

	visualizeFlow(){
		if(Blackprint.settings._remoteEngine)
			this.owner.iface.node.instance._emit('_flowEvent', {cable: this});
	}
	get value(){
		if(Blackprint.settings.visualizeFlow)
			this.visualizeFlow();

		if(this._disconnecting) return this.input.default;
		return this.output.value;
	}

	activation(enable){
		if(enable === void 0){ // Async mode
			this.disabled = true;
			return;
		}

		if(enable === true){
			this.disabled = false;
			this._connected();
			return;
		}

		if(enable === false){
			this.disconnect();
			return;
		}
	}

	_refreshType(){
		var out, inp;
		if(this.target.source === 'input'){
			inp = this.target;
			out = this.owner;
		}
		else{
			out = this.target;
			inp = this.owner;
		}

		this.typeName = out.type.name;
		this.input = inp;
		this.output = out;

		if(this.source !== 'output'){
			this.owner = out;
			this.target = inp;
			this.source = this.owner.source;

			if(this._scope !== void 0 && !Blackprint.settings.windowless){
				let temp1 = this.head1.slice(0);
				this.head1 = this.head2.slice(0);
				this.head2 = temp1;

				let cables = this._scope('cables');
				let list = cables.list;
				list.move(list.indexOf(this), 0);
			}
		}

		delete this.branch;
		this.hasBranch = false;
	}

	connecting(){
		let activate = arg => this.activation(arg);
		this._refreshType();

		let { input, output } = this;

		input.emit('connecting', {target: output, activate});
		output.emit('connecting', {target: input, activate});

		if(this.disabled || input.type === Types.Slot || output.type === Types.Slot){
			// inp.iface.node.instance.emit('cable.connecting', {
			// 	port: input, target: output
			// });
			return;
		}

		this._connected();
	}

	_connected(){
		this.connected = true;

		if(this.input === void 0 || this.output === void 0)
			this._refreshType();

		let {input: inp, output: out} = this;

		inp._cache = void 0;
		inp.iface.emit('cable.connect', {
			cable: this,
			port: inp,
			target: out,
		});
		out.iface.emit('cable.connect', {
			cable: this,
			port: out,
			target: inp,
		});

		let temp = {port: inp, target: out, cable: this};
		inp.iface.node.instance.emit('cable.connect', temp);

		inp.emit('connect', temp);
		out.emit('connect', {port: out, target: inp, cable: this});

		if(out.value != null){
			inp.emit('value', temp);
			inp.iface.emit('port.value', temp);

			let node = inp.iface.node;
			if(node.update != null) {
				if(node.instance._importing)
					node.instance.executionOrder.add(node, this);
				else if(node.routes.in.length === 0) {
					node._bpUpdate(this);
				}
			}
		}
	}

	disconnect(which){ // which = port
		let {owner, target} = this;
		if(this.isRoute){ // ToDo: simplify, use 'which' instead of check all
			let { input, output } = this;

			if(output.out === this) output.out = null;
			else if(input?.out === this) input.out = null;

			let i = output.in ? output.in.indexOf(this) : -1;
			if(i !== -1){
				output.in.splice(i, 1);
			}
			else if(input != null) {
				let i = input.in.indexOf(this);
				if(i !== -1)
					input.in.splice(i, 1);
			}

			this.connected = false;

			if(target == null) return; // Skip disconnection event emit

			let temp1 = {
				cable: this,
				port: owner,
				target: target
			};

			owner.emit('disconnect', temp1);
			owner.iface.emit('cable.disconnect', temp1);
			owner.iface.node.instance.emit('cable.disconnect', temp1);

			if(target == null) return;
			let temp2 = {
				cable: this,
				port: target,
				target: owner
			};
			target.emit('disconnect', temp2);
			target.iface.emit('cable.disconnect', temp2);

			return;
		}

		let hasOwner = false;
		let hasTarget = false;
		let alreadyEmitToInstance = false;
		this._disconnecting = true;

		let inputPort = this.input;
		if(inputPort !== void 0){
			let oldVal = this.output.value;
			inputPort._cache = void 0;

			let defaultVal = inputPort.default;
			if(defaultVal != null && defaultVal !== oldVal){
				let iface = inputPort.iface;
				let node = iface.node;
				let routes = node.routes; // PortGhost's node may not have routes

				if(iface._bpDestroy !== true && routes != null && routes.in.length === 0){
					let temp = { port: inputPort, target: this.output, cable: this };
					inputPort.emit('value', temp);
					iface.emit('port.value', temp);
					node.instance.executionOrder.add(node);
				}
			}

			if(inputPort._hasUpdateCable === this)
				inputPort._hasUpdateCable = null;
		}

		// Remove from cable owner
		if(owner && (!which || owner === which)){
			var i = owner.cables.indexOf(this);
			if(i !== -1)
				owner.cables.splice(i, 1);

			if(this.connected){
				let temp = {
					cable: this,
					port: owner,
					target: target
				};

				owner.emit('disconnect', temp);
				owner.iface.emit('cable.disconnect', temp);
				owner.iface.node.instance.emit('cable.disconnect', temp);

				alreadyEmitToInstance = true;
			}
			else{
				let temp = {port: owner, cable: this};
				owner.iface.emit('cable.cancel', temp);
				// owner.iface.node.instance.emit('cable.cancel', temp);
			}

			hasOwner = true;
		}

		// Remove from connected target
		if(target && this.connected && (!which || target === which)){
			var i = target.cables.indexOf(this);
			if(i !== -1)
				target.cables.splice(i, 1);

			let temp = {
				cable: this,
				port: target,
				target: owner
			};

			target.emit('disconnect', temp);
			target.iface.emit('cable.disconnect', temp);

			if(!alreadyEmitToInstance)
				target.iface.node.instance.emit('cable.disconnect', temp);

			hasTarget = true;
		}

		if(hasOwner || hasTarget) this.connected = false;
		this._disconnecting = false;
	}
}

Blackprint.Engine.Cable = Cable;