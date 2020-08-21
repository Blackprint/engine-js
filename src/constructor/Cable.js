class Cable{
	visualizeFlow(){}

	// If false then we assume it's haven't been connected
	await = false;
	connected = false;

	constructor(owner, target){
		this.type = owner.type;
		this.owner = owner;
		this.target = target;
	}

	awaiting(func, otherCallback){
		this.await = true;
		var that = this;
		func(function(success){
			otherCallback && otherCallback(success);

			if(success === false){
				that.target = void 0;
				return that.destroy();
			}

			that.await = false;
			that.triggerConnected();
		});
	}

	connecting(){
		if(this.owner.source === 'inputs'){
			if(this.owner.feature === Blackprint.PortAsync)
				return this.awaiting(this.owner.default);
		}
		else if(this.target.source === 'inputs'){
			if(this.target.feature === Blackprint.PortAsync)
				return this.awaiting(this.target.default);
		}

		this.triggerConnected();
	}

	triggerConnected(){
		this.connected = true;

		this.target.iface._trigger('cable.connect', this.target, this.owner, this);
		this.owner.iface._trigger('cable.connect', this.owner, this.target, this);

		var out, inp;
		if(this.target.source === 'inputs'){
			inp = this.target;
			out = this.owner;
		}
		else{
			out = this.target;
			inp = this.owner;
		}

		if(inp.iface.node.update)
			inp.iface.node.update(inp, out, this);
	}

	destroy(){
		// Remove from cable owner
		if(this.owner){
			var i = this.owner.cables.indexOf(this);
			if(i !== -1)
				this.owner.cables.splice(i, 1);

			if(this.connected)
				this.owner.iface._trigger('cable.disconnect', this.owner, this.target);
			else this.owner.iface._trigger('cable.cancel', this.owner, this);
		}

		// Remove from connected target
		if(this.target && this.connected){
			var i = this.target.cables.indexOf(this);
			if(i !== -1)
				this.target.cables.splice(i, 1);

			this.target.iface._trigger('cable.disconnect', this.target, this.owner);
		}
	}
}

Blackprint.Interpreter.Cable = Cable;