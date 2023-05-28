class SkeletonRoutePort {
	constructor(iface){
		this.iface = iface;
		this.in = [];
		this.out = null;
		this.isRoute = true;
	}

	_routeTo(iface){
		let cable = this.out = new SkeletonCable();
		cable.isRoute = true;
		cable.output = this;
		cable.input = iface.node.routes;
		iface.node.routes.in.push(cable);
	}

	// Connect to input route
	_connectCable(cable){
		if(this.in.includes(cable)) return false;
		this.in.push(cable);

		if(cable.input != null)
			cable.output = this;
		else cable.input = this;

		cable.output.cables.push(cable);
		return true;
	}
};