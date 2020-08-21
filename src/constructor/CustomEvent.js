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

	_trigger(eventName){
		if(this._event === void 0 || this._event[eventName] === void 0)
			return;

		var args = new Array(arguments.length);
		for(var i=1; i < arguments.length; i++)
			args[i-1] = arguments[i];

		var events = this._event[eventName];
		for (var i = 0; i < events.length; i++){
			events[i].apply(this, args);

			if(events[i].once){
				delete events[i].once;
				events.splice(i--, 1);
			}
		}
	}
}