class Cable{
	constructor(owner, target){
		this.type = owner.type;
		this.owner = owner;
		this.target = target;

		// If false then we assume it's haven't been connected
		this.disabled = false;
		this.connected = false;
	}

	visualizeFlow(){}

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
			this.destroy();
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

		this.owner._trigger('connect', {target: this.target, cable: this});
		this.target._trigger('connect', {target: this.owner, cable: this});

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
				this.owner._trigger('disconnect', this.target);
				this.owner.iface._trigger('cable.disconnect', {
					cable: this,
					port: this.owner,
					target: this.target
				});
			}
			else this.owner.iface._trigger('cable.cancel', {port: this.owner, cable: this});
		}

		// Remove from connected target
		if(this.target && this.connected){
			var i = this.target.cables.indexOf(this);
			if(i !== -1)
				this.target.cables.splice(i, 1);

			this.target._trigger('disconnect', this.owner);
			this.target.iface._trigger('cable.disconnect', {
				cable: this,
				port: this.target,
				target: this.owner
			});
		}
	}
}

Blackprint.Engine.Cable = Cable;