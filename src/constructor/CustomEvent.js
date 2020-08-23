// This class must be initialized first before any extendable

Blackprint.Interpreter.CustomEvent = class CustomEvent{
	on(eventName, func){
		if(this._event === void 0)
			Object.defineProperty(this, '_event', {value:{}});

		if(eventName.includes(' ')){
			eventName = eventName.split(' ');
			for (var i = 0; i < eventName.length; i++)
				this.on(eventName[i], func);

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

	off(eventName, func){
		if(eventName.includes(' ')){
			eventName = eventName.split(' ');
			for (var i = 0; i < eventName.length; i++)
				this.off(eventName[i], func);

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
		if(events === void 0 || events.length === 0)
			return false;

		for (var i = 0; i < events.length; i++){
			var ev = events[i];
			ev.call(this, a,b,c,d,e);

			if(ev.once){
				delete ev.once;
				events.splice(i--, 1);
			}
		}

		return true;
	}
}