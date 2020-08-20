Blackprint.Interpreter.Port = class Port{
	constructor(name, type, def, source, node){
		this.name = name;
		this.type = type;
		this.cables = [];
		this.source = source;
		this.node = node;
		this.classAdd ='';

		// this.value;
		this.default = def;

		// this.feature == PortListener | PortArrayOf | PortAwait
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
			configurable:true,
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
						var cable = port.cables[0];
						var target = cable.owner === port ? cable.target : cable.owner;

						if(target === void 0 || cable.connected === false){
							if(port.feature === Blackprint.PortArrayOf)
								return [];
							return target.default;
						}

						// Request the data first
						if(target.node.handle.request){
							if(target.node.handle.request(target, port.node) !== false && Blackprint.settings.visualizeFlow)
								cable.visualizeFlow();
						}

						port.node._requesting = void 0;
						if(port.feature === Blackprint.PortArrayOf)
							return [target.value];

						return target.value || target.default;
					}

					// Return multiple data as an array
					var cables = port.cables;
					var data = [];
					for (var i = 0; i < cables.length; i++) {
						var cable = cables[i];
						var target = cable.owner === port ? cable.target : cable.owner;

						if(target === void 0 || cable.connected === false)
							continue;

						// Request the data first
						if(target.node.handle.request){
							if(target.node.handle.request(target, port.node) !== false && Blackprint.settings.visualizeFlow)
								cable.visualizeFlow();
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
								throw new Error(port.node.title+"> "+val + " is not a Number");

							val = Number(val);
						}
						else throw new Error(port.node.title+"> "+getDataType(val) + " can't be converted as a " + port.type.name);
					}
					else if(!(val instanceof port.type))
						throw new Error(port.node.title+"> "+getDataType(val) + " is not instance of "+port.type.name);
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

function getDataType(which){
	return which.constructor.name;
}