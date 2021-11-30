// Constructor cycle
// CreateNode = Blackprint.Node then Blackprint.Interface
Blackprint.Node = class Node extends Blackprint.Engine.CustomEvent {
	constructor(instance){
		if(instance === void 0)
			throw new Error("First parameter was not found, did you forget 'super(instance)' when extending Blackprint.Node?");

		super();
		this._instance = instance;
		this._scope = instance.scope; // Only in Blackprint.Sketch
	}
	setInterface(path='BP/default'){
		if(this.iface !== void 0)
			throw new Error('node.setInterface() can only be called once');

		let isSketch = this._scope !== void 0;

		// Get the requested iface after initialize the node
		let ifaceFunc = (isSketch ? Blackprint.Sketch._iface : Blackprint._iface)[path];
		if(ifaceFunc === void 0)
			throw new Error('Node interface for '+path+" was not found, maybe .registerInterface() haven't being called?" + (isSketch ? "(for Sketch Interface)" : ""));

		// Initialize for interface
		let iface;
		if(isClass(ifaceFunc))
			iface = new ifaceFunc(this);
		else{
			// Check for options
			if(ifaceFunc._extend !== void 0)
				iface = new ifaceFunc._extend(this);
			else iface = new Blackprint.Interface(this);

			// If it was for Sketch, it will being handled by framework on Blackprint/src/page.sf
			if(!isSketch)
				ifaceFunc(iface);
		}

		if(iface.data !== void 0){
			let desc = Object.getOwnPropertyDescriptor(iface, 'data');
			if(desc.set === void 0){
				let data = iface.data;
				Object.defineProperty(iface, 'data', {
					enumerable: true,
					configurable: true,
					get:()=> data,
					set:v=> Object.assign(data, v),
				});
			}
		}

		iface.interface = path;
		return this.iface = iface;
	}
};