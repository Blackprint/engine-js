class Cable{
	constructor(owner, target){
		let type = owner.type;

		this.typeName = !type ? 'Any' : type.name; // type from input port
		this.owner = owner; // may be input/output port
		this.target = target;

		// If false then we assume it's haven't been connected
		this.disabled = false;
		this.connected = false;
	}

	visualizeFlow(){}
	get value(){
		if(Blackprint.settings.visualizeFlow)
			this.visualizeFlow();

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
	}

	connecting(){
		var that = this;
		function activate(arg){ that.activation(arg) }

		this._refreshType();

		this.input.emit('connecting', {target: this.output, activate});
		this.output.emit('connecting', {target: this.input, activate});

		if(this.disabled)
			return;

		this._connected();
	}

	_connected(){
		this.connected = true;

		if(this.input === void 0 || this.output === void 0)
			this._refreshType();

		let {input: inp, output: out} = this;

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

		let temp = {target: out, cable: this};

		inp.emit('connect', temp);
		out.emit('connect', {target: inp, cable: this});

		if(inp.iface.node.update)
			inp.iface.node.update(inp, out, this);

		if(out.value !== void 0){
			inp.emit('value', temp);
			inp.iface.emit('port.value', {port: inp, target: out, cable: this});
		}
	}

	disconnect(which){ // which = port
		let {owner, target} = this;
		let hasOwner = false;
		let hasTarget = false;

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
			}
			else owner.iface.emit('cable.cancel', {port: owner, cable: this});

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

			hasTarget = true;
		}

		if(hasOwner || hasTarget) this.connected = false;

		// Remove references after the event was triggered
		if(hasOwner){
			if(owner === this.input) this.input = void 0;
			if(owner === this.output) this.output = void 0;
			this.owner = void 0;
		}
		if(hasTarget){
			if(target === this.input) this.input = void 0;
			if(target === this.output) this.output = void 0;
			this.target = void 0;
		}
	}
}

Blackprint.Engine.Cable = Cable;