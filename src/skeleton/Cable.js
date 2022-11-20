class SkeletonCable {
	constructor(){
		this.input = null;
		this.output = null;
		this.isRoute = false;
		this.hasBranch = false;
		this.overrideRot = false;
		// this.disabled = false;
	}

	_createBranch(cable){
		this.hasBranch = true;
		this.cableTrunk ??= this;
		this.branch ??= [];

		let newCable = cable || new SkeletonCable();
		newCable.cableTrunk = this.cableTrunk; // copy reference
		newCable.output = this.output;
		newCable.input = this.input;

		this.branch.push(newCable);
		newCable.parentCable = this;

		return newCable;
	}
};