class OrderedExecution {
	constructor(size=30){
		this.initialSize = size;
		this.list = new Array(size);
		this.index = 0;
		this.length = 0;
		this.pause = false;
		this.stepMode = false;
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
        if(i >= this.initialSize || this.length >= this.initialSize)
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
		if(this.pause) return;
		if(this.stepMode) this.pause = true;

		let next = this._next(); // next => node
		if(next == null) return;

		let skipUpdate = next.routes.in.length !== 0;
		let nextIface = next.iface;
		next._bpUpdating = true;

		if(next.partialUpdate && next.update == null)
			next.partialUpdate = false;

		let _proxyInput = null;
		if(nextIface._enum === _InternalNodeEnum.BPFnMain){
			_proxyInput = nextIface._proxyInput;
			_proxyInput._bpUpdating = true;
		}

		try{
			if(next.partialUpdate){
				let portList = nextIface.input._portList;
				for (let i=0; i < portList.length; i++) {
					let inp = portList[i];
	
					if(inp.feature === BP_Port.ArrayOf){
						if(inp._hasUpdate){
							inp._hasUpdate = false;
	
							if(!skipUpdate) {
								let cables = inp.cables;
								for (let a=0; a < cables.length; a++) {
									let cable = cables[a];
		
									if(!cable._hasUpdate) continue;
									cable._hasUpdate = false;
		
									await next.update(cable);
								}
							}
						}
					}
					else if(inp._hasUpdateCable){
						let cable = inp._hasUpdateCable;
						inp._hasUpdateCable = null;
	
						if(!skipUpdate) await next.update(cable);
					}
				}
			}

			next._bpUpdating = false;
			if(_proxyInput != null) _proxyInput._bpUpdating = false;

			if(!next.partialUpdate && !skipUpdate) await next._bpUpdate();
		} catch(e){
			if(_proxyInput != null) _proxyInput._bpUpdating = false;

			this.clear();
			throw e;
		} finally {
			if(this.stepMode) this.pause = false;
		}
	}
}