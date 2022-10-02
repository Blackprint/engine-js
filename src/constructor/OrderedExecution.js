class OrderedExecution {
	constructor(size=30){
		this.initialSize = size;
		this.list = new Array(size);
		this.index = 0;
		this.length = 0;
		this.pause = false;
		this.stepMode = false;
		this._onceComplete = [];
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
	onceComplete(func){
		if(this.length === 0) return func?.();

		// Only for JavaScript, return promise if no callback provided
		if(func == null){
			this._promiseWait ??= new Promise(resolve => {
				this._onceComplete.push(()=> {
					this._promiseResolve = this._promiseWait = null;
					resolve();
				});
			});

			return this._promiseWait;
		}

		if(this._onceComplete.includes(func)) return;
		this._onceComplete.push(func);
	}
	_next(){
		if(this.index >= this.length){
			let temp = this._onceComplete;
			for (let i=0; i < temp.length; i++) {
				temp[i]();
			}

			temp.length = 0;
			return;
		}

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
		let portList = nextIface.input._portList;
		next._bpUpdating = true;

		if(next.partialUpdate && next.update == null)
			next.partialUpdate = false;

		let fnInstance = false;
		if(nextIface._enum === _InternalNodeEnum.BPFnMain){
			fnInstance = true;
			nextIface._proxyInput._bpUpdating = true;
		}

		try{
			for (let i=0; i < portList.length; i++) {
				let inp = portList[i];
				let inpIface = inp.iface;

				if(inp.feature === BP_Port.ArrayOf){
					if(inp._hasUpdate){
						inp._hasUpdate = false;
						let cables = inp.cables;

						for (let a=0; a < cables.length; a++) {
							let cable = cables[a];

							if(!cable._hasUpdate) continue;
							cable._hasUpdate = false;

							let temp = { port: inp, target: cable.output, cable };
							inp.emit('value', temp);
							inpIface.emit('port.value', temp);

							if(next.partialUpdate && !skipUpdate) await next.update(cable);
						}
					}
				}
				else if(inp._hasUpdateCable){
					let cable = inp._hasUpdateCable;
					inp._hasUpdateCable = null;

					let temp = { port: inp, target: cable.output, cable };
					inp.emit('value', temp);
					inpIface.emit('port.value', temp);

					if(next.partialUpdate && !skipUpdate) await next.update(cable);
				}
			}

			next._bpUpdating = false;
			if(fnInstance) nextIface._proxyInput._bpUpdating = false;

			if(!next.partialUpdate && !skipUpdate) await next._bpUpdate();
		} catch(e){
			if(fnInstance) nextIface._proxyInput._bpUpdating = false;

			this.clear();
			throw e;
		} finally {
			if(this.stepMode) this.pause = false;
		}
	}
}