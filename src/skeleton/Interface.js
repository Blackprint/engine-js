class SkeletonInterface {
	constructor(instance, namespace, options){
		this.namespace = namespace;

		this.input = {};
		this.output = {};
		this.ref = {
			IInput: this.input,
			IOutput: this.output,
		};

		this.x = options.x || 0;
		this.y = options.y || 0;
		this.z = options.z || 0;
		this.id = options.id; // Named ID (if exist)
		this.i = options.i; // List Index
		this.comment = options.comment || null;
		this.data = options.data; // if exist

		if(this.id != null)
			instance.iface[this.id] = this;

		this._input_d = options.input_d || null;
		this._output_sw = options.output_sw || null;

		this.node = {
			instance: instance,
			routes: new SkeletonRoutePort(this),
			iface: this,
		};
	}
};