class OrderedExecution {
	constructor(instance, size=30){
		this.instance = instance;
		this.initialSize = size;
		this.list = new Array(size);
		this.index = 0;
		this.length = 0;
		this.pause = false;
		this.stepMode = false;

		// Pending because stepMode
		this._pRequest = [];
		this._pTrigger = [];
		this._pRoute = [];
		this._hasStepPending = false;

		// Cable who trigger the execution order's update (with stepMode)
		this._tCable = new Map(); // { Node => Set<Cable> }
	}
	isPending(node){
		if(this.index === this.length) return false;
		return this.list.includes(node, this.index);
	}
	clear(){
		let list = this.list;
		for (let i=this.index; i < this.length; i++) {
			list[i] = null;
		}

		this.length = this.index = 0;
	}
	add(node, _cable){
		if(this.isPending(node)) return;
		this._isReachLimit();

		this.list[this.length++] = node;
		if(this.stepMode) {
			if(_cable != null){
				let tCable = this._tCable; // Cable triggerer
				let sets = tCable.get(node);
				if(sets == null) {
					sets = new Set();
					tCable.set(node, sets);
				}
	
				sets.add(_cable);
			}

			this._emitNextExecution();
		}
	}

	_isReachLimit(){
        let i = this.index + 1;
        if(i >= this.initialSize || this.length >= this.initialSize)
            throw new Error("Execution order limit was exceeded");
	}

	_next(){
		if(this.index >= this.length) return;

        let i = this.index;
		let temp = this.list[this.index++];
        this.list[i] = null;

		if(this.index >= this.length)
            this.index = this.length = 0;

		if(this.stepMode) this._tCable.delete(temp);
        return temp;
	}

	_emitPaused(afterNode, beforeNode, triggerSource, cable, cables){
		this.instance._emit('execution.paused', {
			afterNode,
			beforeNode,
			cable,
			cables,

			// 0 = execution order, 1 = route, 2 = trigger port, 3 = request
			// execution priority: 3, 2, 1, 0
			triggerSource,
		});
	}

	_addStepPending(cable, triggerSource){
		// 0 = execution order, 1 = route, 2 = trigger port, 3 = request
		if(triggerSource === 1 && !this._pRoute.includes(cable)) this._pRoute.push(cable);
		if(triggerSource === 2 && !this._pTrigger.includes(cable)) this._pTrigger.push(cable);
		if(triggerSource === 3){
			let hasCable = false;
			let list = this._pRequest;
			for (let i=0; i < list.length; i++) {
				if(list[i].cable === cable){
					hasCable = true;
					break;
				}
			}

			if(hasCable === false){
				let portCall;
				let inputPorts = cable.input.iface.input;

				for (let key in inputPorts) {
					let port = inputPorts[key];
					if(port._calling){
						portCall = port;
						break;
					}
				}

				list.push({
					portCall,
					cable,
				});
			}
		}

		this._hasStepPending = true;
		this._emitNextExecution();
	}

	// For step mode
	_emitNextExecution(afterNode){
		let { _pRequest, _pTrigger, _pRoute } = this;
		let cable, triggerSource = 0;
		let inputNode, outputNode;

		if(_pRequest.length !== 0){
			triggerSource = 3;
			cable = _pRequest[0].cable;
		}
		else if(_pTrigger.length !== 0){
			triggerSource = 2;
			cable = _pTrigger[0];
		}
		else if(_pRoute.length !== 0){
			triggerSource = 1;
			cable = _pRoute[0];
		}

		if(cable != null){
			if(this._lastCable === cable) return; // avoid duplicate event trigger

			inputNode = cable.input.iface.node;
			outputNode = cable.output.iface.node;
		}

		if(triggerSource === 0){
			let beforeNode = this.list[this.index];
			if(this._lastBeforeNode === beforeNode) return; // avoid duplicate event trigger

			let cables = this._tCable.get(beforeNode); // Set<Cables>
			if(cables) cables = Array.from(cables);

			return this._emitPaused(afterNode, beforeNode, 0, null, cables);
		}
		else if(triggerSource === 3)
			return this._emitPaused(inputNode, outputNode, triggerSource, cable);
		else return this._emitPaused(outputNode, inputNode, triggerSource, cable);
	}

	async _checkStepPending(){
		if(!this._hasStepPending) return;
		let { _pRequest, _pTrigger, _pRoute } = this;

		if(_pRequest.length !== 0){
			let { cable, portCall } = _pRequest.shift();
			let currentIface = cable.output.iface;
			let current = currentIface.node;

			// cable.visualizeFlow();
			currentIface._requesting = true;
			current.request(cable);
			currentIface._requesting = false;

			let inpIface = cable.input.iface;

			// Check if the cable was the last requester from a node
			let isLast = true;
			for (let i=0; i < _pRequest.length; i++) {
				if(_pRequest[i].cable.input.iface === inpIface){
					isLast = false;
				}
			}

			if(isLast){
				await inpIface.node.update?.();
				portCall._call();
			}

			this._emitNextExecution();
		}
		else if(_pTrigger.length !== 0){
			let cable = _pTrigger.shift();
			let current = cable.input;

			cable.visualizeFlow();
			current._call(cable);

			this._emitNextExecution();
		}
		else if(_pRoute.length !== 0){
			let cable = _pRoute.shift();

			cable.visualizeFlow();
			cable.input.routeIn(cable, true);

			this._emitNextExecution();
		}
		else return false;

		if(_pRequest.length === 0 && _pTrigger.length === 0 && _pRoute.length === 0)
			this._hasStepPending = false;
		
		return true;
	}

	async next(force){
		if(this.stepMode) this.pause = true;
		if(this.pause && !force) return;
		if(await this._checkStepPending()) return;

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
			if(this.stepMode) this._emitNextExecution(next);
		}
	}
}