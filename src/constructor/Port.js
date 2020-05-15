Blackprint.Interpreter.Port = class Port{
	constructor(name, type, def, source, node){
		this.name = name;
		this.type = type;
		this.cables = [];
		this.source = source;
		this.node = node;

		// this.value;
		this.default = def;

		// this.feature == PortListener | PortValidator
	}

	// Set for the linked port (Handle for ScarletsFrame)
	// ex: linkedPort = node.outputs.portName
	createLinker(){
		var port = this;

		// Only for outputs
		if(this.type === Function){
			// Disable sync
			port.sync = false;

			return function(){
				var cables = port.cables;
				for (var i = 0; i < cables.length; i++) {
					var target = cables[i].owner === port ? cables[i].target : cables[i].owner;
					if(target === void 0)
						continue;

					if(Blackprint.settings.visualizeFlow)
						cables[i].visualizeFlow();

					target.node.handle.inputs[target.name](port, cables[i]);
				}
			};
		}

		var prepare = {
			enumerable:true,
			get:function(){
				// This port must use values from connected outputs
				if(port.source === 'inputs'){
					if(port.cables.length === 0)
						return port.default;

					// Flag current node is requesting value to other node
					port.node._requesting = true;

					// Return single data
					if(port.cables.length === 1){
						var target = port.cables[0].owner === port ? port.cables[0].target : port.cables[0].owner;
						if(target === void 0)
							return;

						// Request the data first
						if(target.node.handle.request){
							if(target.node.handle.request(target, port.node) !== false && Blackprint.settings.visualizeFlow)
								port.cables[0].visualizeFlow();
						}

						port.node._requesting = void 0;
						return target.value || target.default;
					}

					// Return multiple data as an array
					var cables = port.cables;
					var data = [];
					for (var i = 0; i < cables.length; i++) {
						var target = cables[i].owner === port ? cables[i].target : cables[i].owner;
						if(target === void 0)
							continue;

						// Request the data first
						if(target.node.handle.request){
							if(target.node.handle.request(target, port.node) !== false && Blackprint.settings.visualizeFlow)
								cables[i].visualizeFlow();
						}

						data.push(target.value || target.default);
					}

					port.node._requesting = void 0;
					return data;
				}

				return port.value;
			}
		};

		// Can only obtain data when accessing input port
		if(port.source !== 'inputs'){
			prepare.set = function(val){
				if(val === void 0){
					port.value = port.default;
					return;
				}

				// Data type validation
				if(val.constructor !== port.type){
					if(port.type === String || port.type === Number){
						if(val.constructor === Number)
							val = String(val);
						else if(val.constructor === String){
							if(isNaN(val) === true)
								throw new Error(val + " is not a Number");

							val = Number(val);
						}
						else throw new Error(JSON.stringify(val) + " can't be converted as a " + port.type.name);
					}
				}

				port.value = val;
				port.sync();
			}
		}

		// Disable sync
		else port.sync = false;

		return prepare;
	}

	sync(){
		// Check all connected cables, if any node need to synchronize
		var cables = this.cables;
		for (var i = 0; i < cables.length; i++) {
			var target = cables[i].owner === this ? cables[i].target : cables[i].owner;
			if(target === void 0)
				continue;

			if(target.feature === Blackprint.PortListener){
				target._call(cables[i].owner === this ? cables[i].owner : cables[i].target, this.value);

				if(Blackprint.settings.visualizeFlow)
					cables[i].visualizeFlow();
			}

			if(target.node._requesting === void 0 && target.node.handle.update){
				target.node.handle.update(cables[i]);

				if(Blackprint.settings.visualizeFlow)
					cables[i].visualizeFlow();
			}
		}
	}
}