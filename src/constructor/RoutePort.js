// import { Cable } from "./Cable.js";

// This will be extended if Blackprint Sketch is loaded
Blackprint.RoutePort = class RoutePort {
	constructor(iface){
		this.iface = iface;
		this._scope = iface._scope;

		this.in = []; // Allow incoming route from multiple path
		this.out = null; // Only one route/path
		this.disableOut = false;
		this._isPaused = false;
	}

	pause(){
		if(this._isPaused) return;
		this._isPaused = true;
		this._disabled = this.disableOut;
		this.disableOut = true;
	}

	unpause(){
		if(!this._isPaused) return;
		this._isPaused = false;
		this.disableOut = this._disabled;
	}

	// For creating output cable
	createCable(cable){
		this.out?.disconnect();
		cable = this.out = cable || new Cable(this);
		cable.isRoute = true;
		cable.output = this;

		return cable;
	}

	// Connect to input route
	connectCable(cable){
		if(this.in.includes(cable)) return false;
		if(this.iface.node.update === void 0){
			cable.disconnect();
			throw new Error("node.update() was not defined for this node");
		}

		this.in.push(cable);
		cable.target = cable.input = this;
		cable.connected = true;

		return true;
	}

	async routeIn(){
		let node = this.iface.node;
		await node.update();
		await node.routes.routeOut();
	}

	async routeOut(){
		if(this.out == null || this.disableOut) return;
		this.out.visualizeFlow();

		await this.out.input?.routeIn();
	}
}