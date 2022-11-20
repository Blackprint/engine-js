class SkeletonPort {
	constructor(iface, source, name){
		this.iface = iface;
		this.name = name;
		this.source = source;
		this.cables = [];
	}

	_createCable(){
		let cable = new SkeletonCable();

		if(this.source === 'input')
			cable.input = this;
		else cable.output = this;

		return cable;
	}

	_connectCable(cable){
		if(cable.input != null)
			cable.output = this;
		else cable.input = this;

		cable.input.cables.push(cable);
		cable.output.cables.push(cable);
	}
};