class SkeletonRoutePort {
	constructor(iface){
		this.iface = iface;
		this.in = [];
		this.out = null;
	}

	_routeTo(iface){
		let cable = this.out = new SkeletonCable();
		cable.isRoute = true;
		cable.output = this;
		cable.input = iface;
		iface.node.routes.in.push(cable);
	}
};