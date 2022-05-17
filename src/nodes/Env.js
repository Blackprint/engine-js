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

			iface.enum = _InternalNodeEnum.BPEnvGet;
		}
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

			iface.enum = _InternalNodeEnum.BPEnvSet;
		}
		update(){
			Blackprint.Environment.set(this.iface.data.name, this.input.Val);
		}
	},
};

// ==== Interface ====
// Register when ready
function BPEnvInit(){
	class BPEnvGetSet extends Blackprint.Interface {
		imported(data){
			if(!data.name) throw new Error("Parameter 'name' is required");
			this.data.name = data.name;

			// Listen for name change, only if Blackprint.Sketch was exist
			if(Blackprint.Sketch != null){
				this._nameListener = ({ old, now }) => {
					if(this.data.name !== old) return;
					this.data.name = now;
				};

				Blackprint.on('environment-renamed', this._nameListener);
			}
		}
		destroy(){
			if(this._nameListener == null) return;
			Blackprint.off('environment-renamed', this._nameListener);
		}
	};

	Blackprint.registerInterface('BPIC/BP/Env/Get',
	class extends BPEnvGetSet {
		imported(data){
			super.imported(data);
			this._listener = v => {
				if(v.key !== this.data.name) return;
				this.ref.Output.Val = v.value;
			};

			Blackprint.on('environment-changed environment-added', this._listener);
			this.ref.Output.Val = Blackprint.Environment.map[this.data.name];
		}
		destroy(){
			super.destroy();

			if(this._listener == null) return;
			Blackprint.off('environment-changed environment-added', this._listener);
		}
	});

	Blackprint.registerInterface('BPIC/BP/Env/Set',
	class extends BPEnvGetSet { });
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPEnvInit);
else BPEnvInit();