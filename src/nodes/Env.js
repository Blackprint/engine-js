// Environment variable data type will always be a string
Blackprint.nodes.BP.Env = {
	Get: class extends Blackprint.Node {
		static output = {Val: String};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Env/Get');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {name: ''};
			iface.title = 'EnvGet';
			iface.type = 'bp-env-get';

			iface._enum = _InternalNodeEnum.BPEnvGet;
		}
		destroy(){ this.node.destroyListener() }
	},
	Set: class extends Blackprint.Node {
		static input = {Val: String};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/Env/Set');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {name: ''};
			iface.title = 'EnvSet';
			iface.type = 'bp-env-set';

			iface._enum = _InternalNodeEnum.BPEnvSet;
		}
		update(){
			Blackprint.Environment.set(this.iface.data.name, this.input.Val);
		}
		destroy(){ this.node.destroyListener() }
	},
};

// ==== Interface ====
// Register when ready
function BPEnvInit(){
	class BPEnvGetSet extends Blackprint.Interface {
		imported(data){
			if(!data.name) throw new Error("Parameter 'name' is required");
			this.title = this.data.name = data.name;

			// Create new environment if not exist
			if(!(data.name in Blackprint.Environment._map)){
				Blackprint.Environment.import({ [data.name]: '' });
			}

			// Listen for name change, only if Blackprint.Sketch was exist
			if(Blackprint.Sketch != null){
				this._nameListener = ({ old, now }) => {
					if(this.data.name !== old) return;
					this.data.name = now;
				};

				Blackprint.on('environment.renamed', this._nameListener);
			}

			let name = this.data.name;
			let rules = Blackprint.Environment._rules[name];

			// Only allow connection to certain node namespace
			if(rules != null){
				if(this._enum === _InternalNodeEnum.BPEnvGet && rules.allowGet != null){
					let Val = this.output.Val;
					Val.onConnect = function(cable, targetPort){
						if(!rules.allowGet.includes(targetPort.iface.namespace)){
							Val._cableConnectError('cable.rule.disallowed', {cable, port: Val, target: targetPort});
							cable.disconnect();
							return true; // Disconnect cable or disallow connection
						}
					}
				}
				else if(this._enum === _InternalNodeEnum.BPEnvSet && rules.allowSet != null){
					let Val = this.input.Val;
					Val.onConnect = function(cable, targetPort){
						if(!rules.allowSet.includes(targetPort.iface.namespace)){
							Val._cableConnectError('cable.rule.disallowed', {cable, port: Val, target: targetPort});
							cable.disconnect();
							return true; // Disconnect cable or disallow connection
						}
					}
				}
			}
		}
		destroyListener(){
			if(this._nameListener == null) return;
			Blackprint.off('environment.renamed', this._nameListener);
		}
	};

	Blackprint.registerInterface('BPIC/BP/Env/Get',
	class extends BPEnvGetSet {
		imported(data){
			super.imported(data);

			this._listener = v => {
				if(v.key !== this.data.name) return; // use full this.data.name
				this.ref.Output.Val = v.value;
			};

			Blackprint.on('environment.changed environment.added', this._listener);
			this.ref.Output.Val = Blackprint.Environment.map[this.data.name];
		}
		destroyListener(){
			this.destroyListener();

			if(this._listener == null) return;
			Blackprint.off('environment.changed environment.added', this._listener);
		}
	});

	Blackprint.registerInterface('BPIC/BP/Env/Set',
	class extends BPEnvGetSet { });
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPEnvInit);
else BPEnvInit();