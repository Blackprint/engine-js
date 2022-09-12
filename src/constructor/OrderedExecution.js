class OrderedExecution {
	constructor(size=30){
		this.initialSize = size;
		this.list = new Array(size);
		this.index = 0;
		this.length = 0;
	}
	isPending(node){
		return this.list.includes(node, this.index);
	}
	clear(){
		let list = this.list;
		for (let i=this.index; i < this.length; i++) {
			list[i] = null;
		}

		this.length = this.index = 0;
	}
	add(node){
		if(this.isPending(node)) return;

        let i = this.index+1;
        if(i >= this.list.length)
            throw new Error("Execution order limit was exceeded");

		this.list[this.length++] = node;
	}
	_next(){
		if(this.index >= this.length) return;

        let i = this.index;
		let temp = this.list[this.index++];
        this.list[i] = null;

		if(this.index >= this.length)
            this.index = this.length = 0;

        return temp;
	}
	async next(){
		let next = this._next(); // next => node
		if(next == null) return;

		try{
			let portList = next.iface.input._portList;
			next._bpUpdating = true;
			for (let i=0; i < portList.length; i++) {
				let inp = portList[i];
				let inpIface = inp.iface;

				if(inp.feature === BP_Port.ArrayOf){
					if(inp._hasUpdate){
						inp._hasUpdate = false;
						let cables = inp.cables;

						for (let a=0; a < cables.length; a++) {
							let cable = cables[i];
							let temp = { port: inp, target: cable.output, cable };
							inp.emit('value', temp);
							inpIface.emit('port.value', temp);
		
							if(next.partialUpdate) await next.update(cable);
						}
					}
				}
				else if(inp._hasUpdateCable){
					let cable = inp._hasUpdateCable;
					inp._hasUpdateCable = null;

					let temp = { port: inp, target: cable.output, cable };
					inp.emit('value', temp);
					inpIface.emit('port.value', temp);

					if(next.partialUpdate) await next.update(cable);
				}
			}
			next._bpUpdating = false;

			if(!next.partialUpdate) await next._bpUpdate();
		} catch(e){
			this.clear();
			throw e;
		}
	}
}