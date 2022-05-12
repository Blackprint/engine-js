// Global Shared Interface Enviroment
// Environment map can be accessed with 'iface.env' on Sketch or Engine

Blackprint.Environment = {
	list: [], // This shouldn't being used (ToDo: change this to private)
	map: {}, // Use this instead
	_map: {}, // Use this instead

	loadFromURL: false,
	isBrowser: false,
	isNode: false,
	isDeno: false,

	_noEvent: false,

	// obj = {KEY: "value"}
	import(obj){
		var map = this.map;
		this._noEvent = true;
	
		for(let key in obj)
			this.set(key, obj[key]);

		this._noEvent = false;
		Blackprint.emit('environment-imported');
	},

	set(key, value){
		if(/[^A-Z_][^A-Z0-9_]/.test(key))
			throw new Error("Environment must be uppercase and not contain any symbol except underscore, and not started by a number. But got: "+key);

		if(value?.constructor !== String)
			throw new Error(`Environment value must be a string (found "${value}" in ${key})`);

		let list = this.list;
		let temp = list[key];

		if(temp == null){
			temp = {key, value};
			list.push(temp);
			this._map[key] = temp;
		}

		// Add reactivity for Sketch only
		if(Blackprint.Sketch != null){
			if(!(key in this.map)){
				let val;
				Object.defineProperty(this.map, key, {
					configurable: true,
					enumerable: true,
					get(){return val},
					set(v){
						val = v;
						temp.value = v;
						Blackprint.emit('environment-changed', temp);
					},
				});
			}
		}

		this.map[key] = value;

		if(!this._noEvent)
			Blackprint.emit('environment-added', temp);
	},

	_rename(keyA, keyB){
		let { _map, map } = this;
		let temp = _map[keyA];
		if(temp == null) throw new Error(`${keyA} was not defined in the environment`);

		_map[keyB] = temp;
		delete _map[keyA];

		temp.key = keyB;
		Object.defineProperty(map, keyB, Object.getOwnPropertyDescriptor(map, keyA));
		delete map[keyA];
	},

	delete(key){
		let { list, _map, map } = this;

		let i = list.indexOf(_map[key]);
		key = key.key;

		if(i !== -1)
			list.splice(i, 1);

		delete _map[key];
		delete map[key];
		Blackprint.emit('environment-deleted', {key});
	}
};

if(window.HTMLVideoElement !== void 0){
	Blackprint.Environment.isBrowser = true;
	Blackprint.Environment.loadFromURL = true;
}
else if(typeof process !== "undefined" && process.execPath !== void 0)
	Blackprint.Environment.isNode = true;
else{
	Blackprint.Environment.isDeno = true;
	Blackprint.Environment.loadFromURL = true;
}
