// This class must be initialized first before any extendable

class CustomEvent {
	on(eventName, func, options){
		if(this._event === void 0){
			Object.defineProperty(this, '_event', {
				value:{ $_fallback: {} }
			});
		}

		if(func.constructor === Object){
			let temp = options;
			options = func;
			func = temp;
		}

		if(eventName.includes(' ')){
			eventName = eventName.split(' ');
			for (var i = 0; i < eventName.length; i++)
				this.on(eventName[i], func, options);

			return this;
		}

		if(options && options.asFallback){
			this._event.$_fallback[eventName] = func;
			return this;
		}

		let eventList = this._event[eventName];
		if(eventList === void 0)
			eventList = this._event[eventName] = [];

		if(options && options.slot !== void 0){
			for (var i = 0; i < eventList.length; i++) {
				if(eventList[i].slot === options.slot){
					eventList.splice(i, 1);
					break;
				}
			}

			func.slot = options.slot;
		}

		eventList.push(func);
		return this;
	}

	once(eventName, func, options){
		if(func.constructor === Object){
			let temp = options;
			options = func;
			func = temp;
		}

		func.once = true;
		this.on.apply(this, arguments);
		return this;
	}

	off(eventName, func, options){
		if(func !== void 0 && func.constructor === Object){
			let temp = options;
			options = func;
			func = temp;
		}

		if(eventName.includes(' ')){
			eventName = eventName.split(' ');
			for (var i = 0; i < eventName.length; i++)
				this.off(eventName[i], func);

			return this;
		}

		if(options && options.asFallback){
			delete this._event.$_fallback[eventName];
			return this;
		}

		if(this._event === void 0 || this._event[eventName] === void 0)
			return this;

		if(func === void 0){
			delete this._event[eventName];
			return this;
		}
		else{
			var i = this._event[eventName].indexOf(func);
			if(i === -1)
				return this;

			this._event[eventName].splice(i, 1);
		}

		if(this._event[eventName].length === 0)
			delete this._event[eventName];
		return this;
	}

	emit(eventName, obj){
		if(this._event === void 0)
			return false;

		if(arguments.length > 2)
			throw new Error(".emit only accept 2 parameter, please wrap the others on a object");

		var events = this._event[eventName];
		if(events === void 0 || events.length === 0){
			events = this._event;

			let hasFallback = events.$_fallback[eventName];
			if(hasFallback){
				hasFallback(obj);

				if(hasFallback.once)
					delete events.$_fallback[eventName];
			}

			if(eventName !== '*' && this._event['*'] !== void 0){
				obj.eventName = eventName;
				return this.emit('*', obj);
			}

			return hasFallback !== void 0;
		}

		for (var i = 0; i < events.length; i++){
			var ev = events[i];
			ev.call(this, obj);

			if(ev.once){
				delete ev.once;
				events.splice(i--, 1);
			}
		}

		if(eventName !== '*' && this._event['*'] !== void 0){
			obj.eventName = eventName;
			return this.emit('*', obj);
		}

		return true;
	}
}