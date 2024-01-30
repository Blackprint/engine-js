// This class must be initialized first before any extendable

class CustomEvent {
	on(eventName, func, options){
		if(this._event === void 0){
			Object.defineProperty(this, '_event', {
				enumerable: false,
				configurable: true,
				writable: true,
				value:{ }
			});
		}
		if(this._eventLen === void 0){
			Object.defineProperty(this, '_eventLen', {
				enumerable: false,
				configurable: true,
				writable: true,
				value: 0
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
		else if(eventName === '*') eventName = '$_all'; // For optimize performance for JS

		if(options && options.asFallback){
			let fallback = this._event.$_fallback;
			if(fallback == null)
				fallback = this._event.$_fallback = {};

			fallback[eventName] = func;
			return this;
		}

		let eventList = this._event[eventName];
		if(eventList === void 0){
			eventList = this._event[eventName] = [];
			this._eventLen++;
		}

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

	waitOnce(eventName){
		return new Promise(resolve => {
			resolve.once = true;
			this.once(eventName, resolve);
		});
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
		else if(eventName === '*') eventName = '$_all'; // For optimize performance for JS

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

		if(this._event[eventName].length === 0){
			delete this._event[eventName];

			// Small performance improvement by removing `_event`
			if(--this._eventLen <= 0 && this._event.$_fallback == null)
				delete this._event;
		}
		return this;
	}

	emit(eventName, obj){
		if(this._event === void 0) return false;
		if(obj != null && obj.constructor !== Object)
			throw new Error("Event object must be an Object, but got:" + obj.constructor.name);

		var events = this._event[eventName];
		if(events === void 0 || events.length === 0){
			events = this._event;

			let hasFallback = events.$_fallback?.[eventName];
			if(hasFallback){
				hasFallback(obj);

				if(hasFallback.once)
					delete events.$_fallback[eventName];
			}

			if(this._event.$_all !== void 0 && eventName !== '$_all'){
				obj ??= {};
				obj.eventName = eventName;
				return this.emit('$_all', obj);
			}

			return hasFallback !== void 0;
		}

		for (var i = 0; i < events.length; i++){
			var ev = events[i];
			if(ev.once){
				delete ev.once;
				events.splice(i--, 1);
			}

			ev(obj, eventName);
		}

		if(this._event.$_all !== void 0 && eventName !== '$_all'){
			obj ??= {};
			obj.eventName = eventName;
			return this.emit('$_all', obj);
		}

		return true;
	}
}