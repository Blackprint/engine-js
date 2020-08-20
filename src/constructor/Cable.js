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
			that.connected = true;
			that.triggerConnected();
		});
	}

	triggerConnected(){
		this.target.node._trigger('cable.connect', this.target, this.owner, this);
		this.owner.node._trigger('cable.connect', this.owner, this.target, this);
	}

	destroy(){
		// Remove from cable owner
		if(this.owner){
			var i = this.owner.cables.indexOf(this);
			if(i !== -1)
				this.owner.cables.splice(i, 1);

			if(this.target)
				this.owner.node._trigger('cable.disconnect', this.owner, this.target);
			else this.owner.node._trigger('cable.cancel', this.owner, this);
		}

		// Remove from connected target
		if(this.target){
			var i = this.target.cables.indexOf(this);
			if(i !== -1)
				this.target.cables.splice(i, 1);

			this.target.node._trigger('cable.disconnect', this.target, this.owner);
		}
	}
}

Blackprint.Interpreter.Cable = Cable;