Blackprint.Engine.Port = class Port extends Blackprint.Engine.CustomEvent{
	constructor(name, type, def, source, iface){
		super();

		this.name = name;
		this.type = type;
		this.cables = [];
		this.source = source;
		this.iface = iface;
		this.classAdd ='';

		// this.value;
		this.default = def;

		// this.feature == BP_Port.Listener | BP_Port.ArrayOf | BP_Port.Async
	}

	disconnectAll(){
		var cables = this.cables;
		for (var i = cables.length - 1; i >= 0; i--)
			cables[i].disconnect();
	}

	// Set for the linked port (Handle for ScarletsFrame)
	// ex: linkedPort = node.output.portName
	createLinker(){
		var port = this;

		// Only for output
		if(this.source === 'output' && this.type === Function){
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

					target.iface.input[target.name].default(port, cables[i]);
				}
			};
		}

		var prepare = {
			configurable:true,
			enumerable:true,
			get(){
				// This port must use values from connected output
				if(port.source === 'input'){
					if(port.cables.length === 0)
						return port.default;

					// Flag current node is requesting value to other node
					port.iface._requesting = true;

					// Return single data
					if(port.cables.length === 1){
						var cable = port.cables[0];
						var target = cable.owner === port ? cable.target : cable.owner;

						if(target === void 0 || cable.connected === false || cable.disabled){
							port.iface._requesting = void 0;
							if(port.feature === BP_Port.ArrayOf)
								return [];

							// console.log(34, cable);
							return target.default;
						}

						// Request the data first
						if(target.iface.node.request){
							if(target.iface.node.request(target, port.iface) !== false && Blackprint.settings.visualizeFlow)
								cable.visualizeFlow();
						}

						port.iface._requesting = void 0;
						if(port.feature === BP_Port.ArrayOf)
							return [target.value];

						return target.value || target.default;
					}

					// Return multiple data as an array
					var cables = port.cables;
					var data = [];
					for (var i = 0; i < cables.length; i++) {
						var cable = cables[i];
						var target = cable.owner === port ? cable.target : cable.owner;

						if(target === void 0 || cable.connected === false || cable.disabled)
							continue;

						// Request the data first
						if(target.iface.node.request){
							if(target.iface.node.request(target, port.iface) !== false && Blackprint.settings.visualizeFlow)
								cable.visualizeFlow();
						}

						data.push(target.value || target.default);
					}

					port.iface._requesting = void 0;
					if(port.feature !== BP_Port.ArrayOf)
						return data[0];

					return data;
				}

				return port.value;
			}
		};

		// Can only obtain data when accessing input port
		if(port.source !== 'input'){
			prepare.set = function(val){
				if(val === void 0 || val === null){
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
								throw new Error(port.iface.title+"> "+val + " is not a Number");

							val = Number(val);
						}
						else throw new Error(port.iface.title+"> "+getDataType(val) + " can't be converted as a " + port.type.name);
					}
					else if(!(val instanceof port.type))
						throw new Error(port.iface.title+"> "+getDataType(val) + " is not instance of "+port.type.name);
				}

				port.value = val;
				port.emit('value', { target: port });
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
			var target, owner;
			var cable = cables[i];

			if(cable.owner === this){
				owner = this;
				target = cable.target;

				if(target === void 0)
					continue;
			}
			else{
				target = this;
				owner = cable.target;
			}

			if(target.iface._requesting === void 0 && target.iface.node.update)
				target.iface.node.update(target, owner, cable);

			target.emit('value', { target: this, cable });
			target.iface.emit('port.value', { port: target, target: this, cable });

			if(Blackprint.settings.visualizeFlow)
				cable.visualizeFlow();
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
}

function getDataType(which){
	return which.constructor.name;
}