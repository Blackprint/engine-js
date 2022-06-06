// import { Cable } from "./Cable.js";

// This will be extended if Blackprint Sketch is loaded
Blackprint.RoutePort = class RoutePort {
	constructor(iface){
		this.iface = iface;
		this._scope = iface._scope;

		this.in = []; // Allow incoming route from multiple path
		this.out = null; // Only one route/path
		this.disableOut = false;
		this.disabled = false;
		this._isPaused = false;
	}

	// May be deleted on future
	pause(){
		if(this._isPaused) return;
		this._isPaused = true;
		this._disableOut = this.disableOut;
		this.disableOut = true;
	}

	unpause(){
		if(!this._isPaused) return;
		this._isPaused = false;
		this.disableOut = this._disableOut;
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
		if(this.disableOut) return;
		if(this.out == null){
			if(this.iface.enum === _InternalNodeEnum.BPFnOutput)
				return await this.iface._funcMain.node.routes.routeIn();

			return;
		}

		this.out.visualizeFlow();

		let targetRoute = this.out.input;
		if(targetRoute == null) return;

		let _enum = targetRoute.iface.enum;

		if(_enum === void 0)
			return await targetRoute.routeIn();

		if(_enum === _InternalNodeEnum.BPFnMain)
			return await targetRoute.iface._proxyInput.routes.routeIn();

		if(_enum === _InternalNodeEnum.BPFnOutput){
			await targetRoute.iface.node.update();
			return await targetRoute.iface._funcMain.node.routes.routeOut();
		}

		return await targetRoute.routeIn();
	}
}