// import { Cable } from "./Cable.js";

// This will be extended if Blackprint Sketch is loaded
Blackprint.RoutePort = class RoutePort extends CustomEvent {
	constructor(iface){
		super();

		this.iface = iface;
		this._scope = iface._scope;

		this.in = []; // Allow incoming route from multiple path
		this.out = null; // Only one route/path
		this._outTrunk = null; // If have branch
		this.disableOut = false;
		this.disabled = false;
		this._isPaused = false;
		this.isRoute = true;
		this.name = 'BPRoute';
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
		this._outTrunk?.disconnect();
		this._outTrunk = null;

		cable = this.out = cable || new Cable(this);
		cable.isRoute = true;
		cable.output = this;

		return cable;
	}

	// Connect other route port (this .out to other .in port)
	routeTo(iface){
		let cable = this.createCable();

		if(iface != null)
			iface.node.routes.connectCable(cable);
		else {
			// route to nothing == route ended
		}
	}

	// Connect to input route
	connectCable(cable){
		if(!cable.isRoute) throw new Error("Cable must be created from route port before can be connected to other route port. Please use .routeTo(interface) instead if possible.");
		if(this.in.includes(cable)) return false;
		if(this.iface.node.update === void 0){
			cable.disconnect();
			throw new Error("node.update() was not defined for this node");
		}

		this.in.push(cable);
		cable.target = cable.input = this;
		cable.isRoute = true;
		cable._connected();

		return true;
	}

	async routeIn(_cable, _force){
		let node = this.iface.node;
		if(node.disablePorts) return;
		// console.log('routeIn', this.iface.id || this.iface.title);

		let executionOrder = node.instance.executionOrder;
		if(executionOrder.stop || executionOrder._rootExecOrder.stop) return;

		// Add to execution list if the ExecutionOrder is in Step Mode
		if(executionOrder.stepMode && _cable && !_force){
			executionOrder._addStepPending(_cable, 1);
			return;
		}

		if(!node.instance._pendingRender)
			_cable.visualizeFlow();

		if(this.iface._enum !== _InternalNodeEnum.BPFnInput)
			await node._bpUpdate();
		else await node.routes.routeOut();
	}

	async routeOut(){
		if(this.disableOut) return;

		if(this.iface.node.disablePorts) return;
		if(this.out == null){
			if(this.iface._enum === _InternalNodeEnum.BPFnOutput)
				return await this.iface.parentInterface.node.routes.routeIn();

			return;
		}

		let targetRoute = this.out.input;
		if(targetRoute == null) return;

		let _enum = targetRoute.iface._enum;
		if(_enum === void 0)
			return await targetRoute.routeIn(this.out);

		// if(_enum === _InternalNodeEnum.BPFnMain)
		// 	return await targetRoute.iface._proxyInput.routes.routeIn(this.out);

		// if(_enum === _InternalNodeEnum.BPFnOutput){
		// 	let temp = targetRoute.iface.node._bpUpdate();
		// 	if(temp?.constructor === Promise) await temp; // Performance optimization
		// 	return await targetRoute.iface.parentInterface.node.routes.routeOut();
		// }

		return await targetRoute.routeIn(this.out);
	}
}