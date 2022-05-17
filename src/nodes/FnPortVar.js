Blackprint.nodes.BP.FnVar = {
	Input: class extends Blackprint.Node {
		static output = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/FnVar/Input');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {name: ''};
			iface.title = 'FnInput';

			iface.enum = _InternalNodeEnum.BPFnVarInput;
		}
	},
	Output: class extends Blackprint.Node {
		static input = {};
		constructor(instance){
			super(instance);

			let iface = this.setInterface('BPIC/BP/FnVar/Output');

			// Specify data field from here to make it enumerable and exportable
			iface.data = {name: ''};
			iface.title = 'FnOutput';

			iface.enum = _InternalNodeEnum.BPFnVarOutput;
		}
		update(){
			let id = this.iface.data.name;
			this.node.refOutput[id] = this.ref.Input[id];
		}
	},
};

// ==== Interface ====
// Register when ready
function BPFnVarInit(){
	class BPFnVarInOut extends Blackprint.Interface {
		imported(data){
			if(!data.name) throw new Error("Parameter 'name' is required");
			this.data.name = data.name;
			this._parentFunc = this.node._instance._funcMain;
		}
	};

	Blackprint.registerInterface('BPIC/BP/FnVar/Input',
	class extends BPFnVarInOut {
		constructor(node){
			super(node);
			this.type = 'bp-fnvar-input';
		}
		imported(data){
			super.imported(data);
			this._listener = v => {
				if(v.key !== this.data.name) return;
				this.ref.Output.Val = v.value;
			};

			this._parentFunc.input[data.name].on('value', this._listener);
		}
		destroy(){
			super.destroy();

			if(this._listener == null) return;
			this._parentFunc.input[this.data.name].off('value', this._listener);
		}
	});

	Blackprint.registerInterface('BPIC/BP/FnVar/Output',
	class extends BPFnVarInOut {
		constructor(node){
			super(node);
			this.type = 'bp-fnvar-output';
		}
		imported(data){
			super.imported(data);
			this.node.refOutput = this._parentFunc.ref.Output;
		}
	});
}

if(globalThis.sf && globalThis.sf.$)
	globalThis.sf.$(BPFnVarInit);
else BPFnVarInit();