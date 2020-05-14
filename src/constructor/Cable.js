class Cable{
	visualizeFlow(){}

	constructor(owner, target){
		this.type = owner.type;
		this.owner = owner;
		this.target = target;
	}
}

Blackprint.Interpreter.Cable = Cable;