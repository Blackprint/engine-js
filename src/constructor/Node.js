// Constructor cycle
// CreateNode = Blackprint.Node then Blackprint.Interface
Blackprint.Node = class Node extends Blackprint.Engine.CustomEvent {
	constructor(instance){
		super();
		if(instance === void 0)
			throw new Error("First parameter was not found, did you forget 'super(instance)' when extending Blackprint.Node?");

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
			throw new Error('Node interface for', path, "was not found, maybe .registerInterface() haven't being called?");

		// Initialize for interface
		let iface;
		if(isClass(ifaceFunc))
			iface = new ifaceFunc(this);
		else{
			// Check for options
			if(ifaceFunc._extend !== void 0)
				iface = new ifaceFunc._extend(this);
			else iface = new (isSketch ? Blackprint.Sketch.Interface: Blackprint.Interface)(this);

			// If it was for Sketch, it will being handled by framework on Blackprint/src/page.sf
			if(!isSketch){
				// function argument = 2
				if(ifaceFunc.length === 2){
					ifaceFunc(iface, function bindingFunction(bind, target = iface){
						var temp = Object.getOwnPropertyDescriptors(bind);
						Object.defineProperties(target, temp);

						for(var key in temp){
							let val = temp[key].value; // don't have getter/setter property?
							if(!val || val.constructor !== Object)
								continue; // If also not an object

							bindingFunction(val, val);
							Object.defineProperty(target, key, {
								get:()=> val,
								set:v=> Object.assign(val, v)
							});
						}
					});
				}
				else ifaceFunc(iface);
			}
		}

		iface.interface = path;
		return this.iface = iface;
	}
};