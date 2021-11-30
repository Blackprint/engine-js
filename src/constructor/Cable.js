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
		this.visualizeFlow();
		return this.owner.value;
	}

	activation(enable){
		if(enable === void 0){ // Async mode
			this.disabled = true;
			return;
		}

		if(enable === true){
			this.disabled = false;
			this.triggerConnected();
			return;
		}

		if(enable === false){
			this.disconnect();
			return;
		}
	}

	connecting(){
		var that = this;
		function activate(arg){ that.activation(arg) }

		this.owner._trigger('connecting', {target: this.target, activate});
		this.target._trigger('connecting', {target: this.owner, activate});

		if(this.disabled)
			return;

		this.triggerConnected();
	}

	triggerConnected(){
		this.connected = true;

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

		this.target.iface._trigger('cable.connect', {
			cable: this,
			port: this.target,
			target: this.owner,
		});
		this.owner.iface._trigger('cable.connect', {
			cable: this,
			port: this.owner,
			target: this.target,
		});

		let temp = {target: out, cable: this};

		inp._trigger('connect', temp);
		out._trigger('connect', {target: inp, cable: this});

		// ToDo: recheck why we need to check if the constructor is not a function
		if(inp.iface.node.update && inp.type.constructor !== Function)
			inp.iface.node.update(inp, out, this);

		if(out.value !== void 0 && inp._trigger('value', temp) && Blackprint.settings.visualizeFlow)
			this.visualizeFlow();
	}

	disconnect(which){ // which = port
		let found = false;

		// Remove from cable owner
		if(this.owner && (!which || this.owner === which)){
			var i = this.owner.cables.indexOf(this);
			if(i !== -1)
				this.owner.cables.splice(i, 1);

			if(this.connected){
				let temp = {
					cable: this,
					port: this.owner,
					target: this.target
				};

				this.owner._trigger('disconnect', temp);
				this.owner.iface._trigger('cable.disconnect', temp);
			}
			else this.owner.iface._trigger('cable.cancel', {port: this.owner, cable: this});

			if(this.owner === this.input) this.input = void 0;
			if(this.owner === this.output) this.output = void 0;
			this.owner = void 0;

			found = true;
		}

		// Remove from connected target
		if(this.target && this.connected && (!which || this.target === which)){
			var i = this.target.cables.indexOf(this);
			if(i !== -1)
				this.target.cables.splice(i, 1);

			let temp = {
				cable: this,
				port: this.target,
				target: this.owner
			};

			this.target._trigger('disconnect', temp);
			this.target.iface._trigger('cable.disconnect', temp);

			if(this.target === this.input) this.input = void 0;
			if(this.target === this.output) this.output = void 0;
			this.target = void 0;

			found = true;
		}

		if(found) this.connected = false;
	}
}

Blackprint.Engine.Cable = Cable;