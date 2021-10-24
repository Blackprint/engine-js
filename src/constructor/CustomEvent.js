// This class must be initialized first before any extendable

Blackprint.Engine.CustomEvent = class CustomEvent{
	on(eventName, func, options){
		if(this._event === void 0){
			Object.defineProperty(this, '_event', {
				value:{
					$_fallback: {}
				}
			});
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

		if(this._event[eventName] === void 0)
			this._event[eventName] = [];

		this._event[eventName].push(func);
		return this;
	}

	once(eventName, func){
		func.once = true;
		this.on.apply(this, arguments);
		return this;
	}

	off(eventName, func, options){
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

	// Max args = 5
	_trigger(eventName, a,b,c,d,e){
		if(this._event === void 0)
			return false;

		var events = this._event[eventName];
		if(events === void 0 || events.length === 0){
			events = this._event;

			let hasFallback = events.$_fallback[eventName];
			if(hasFallback){
				hasFallback(a,b,c,d,e);

				if(hasFallback.once)
					delete events.$_fallback[eventName];
			}

			return hasFallback !== void 0;
		}

		for (var i = 0; i < events.length; i++){
			var ev = events[i];
			ev.call(this, a,b,c,d,e);

			if(ev.once){
				delete ev.once;
				events.splice(i--, 1);
			}
		}

		if(eventName !== '*' && this._event['*'] !== void 0)
			return this._trigger('*', a,b,c,d,e);

		return true;
	}
}