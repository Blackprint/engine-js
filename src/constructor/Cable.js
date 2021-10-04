class Cable{
	constructor(owner, target){
		this.type = owner.type;
		this.owner = owner;
		this.target = target;

		// If false then we assume it's haven't been connected
		this.disabled = 0;
		this.connected = false;
	}

	visualizeFlow(){}

	activation(enable){
		if(enable === void 0){ // Async mode
			this.disabled++;
			return;
		}

		if(enable === true){
			if(--this.disabled !== 0)
				return;

			this.triggerConnected();
			return;
		}

		if(enable === false){
			this.destroy();
			return;
		}
	}

	connecting(){
		var that = this;
		function activation(arg){
			that.activation(arg);
		}

		this.owner._trigger('connecting', this.target, activation);
		this.target._trigger('connecting', this.owner, activation);

		if(this.disabled !== 0)
			return;

		this.triggerConnected();
	}

	triggerConnected(){
		this.connected = true;

		this.target.iface._trigger('cable.connect', this.target, this.owner, this);
		this.owner.iface._trigger('cable.connect', this.owner, this.target, this);

		this.target._trigger('connect', this.owner, this);
		this.owner._trigger('connect', this.target, this);

		var out, inp;
		if(this.target.source === 'input'){
			inp = this.target;
			out = this.owner;
		}
		else{
			out = this.target;
			inp = this.owner;
		}

		if(inp.iface.node.update && inp.type.constructor !== Function)
			inp.iface.node.update(inp, out, this);

		if(out.value !== void 0 && inp._trigger('value', out) && Blackprint.settings.visualizeFlow)
			this.visualizeFlow();
	}

	destroy(){
		// Remove from cable owner
		if(this.owner){
			var i = this.owner.cables.indexOf(this);
			if(i !== -1)
				this.owner.cables.splice(i, 1);

			if(this.connected){
				this.owner.iface._trigger('cable.disconnect', this.owner, this.target);
				this.owner._trigger('disconnect', this.target);
			}
			else this.owner.iface._trigger('cable.cancel', this.owner, this);
		}

		// Remove from connected target
		if(this.target && this.connected){
			var i = this.target.cables.indexOf(this);
			if(i !== -1)
				this.target.cables.splice(i, 1);

			this.target.iface._trigger('cable.disconnect', this.target, this.owner);
			this.target._trigger('disconnect', this.owner);
		}
	}
}

Blackprint.Engine.Cable = Cable;