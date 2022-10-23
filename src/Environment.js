// Global Shared Interface Enviroment

Blackprint.Environment = {
	map: {}, // Use this instead
	_map: {},
	_list: [],
	_rules: {},

	loadFromURL: false,
	isBrowser: false,
	isNode: false,
	isDeno: false,

	_noEvent: false,

	// obj = {KEY: "value"}
	import(obj){
		this._noEvent = true;

		for(let key in obj)
			this.set(key, obj[key]);

		this._noEvent = false;
		Blackprint.emit('environment.imported');
	},

	set(key, value){
		if(/[^A-Z_][^A-Z0-9_]/.test(key))
			throw new Error("Environment must be uppercase and not contain any symbol except underscore, and not started by a number. But got: "+key);

		if(value?.constructor !== String)
			throw new Error(`Environment value must be a string (found "${value}" in ${key})`);

		let temp = this._map[key];
		if(temp == null){
			temp = this._map[key] = { key, value };
			this._list.push(temp);
		}

		// Add reactivity for Sketch only
		if(Blackprint.Sketch != null){
			if(!(key in this.map)){
				Object.defineProperty(this.map, key, {
					configurable: true,
					enumerable: true,
					get(){return temp.value},
					set(v){
						temp.value = v;
						Blackprint.emit('environment.changed', temp);
					},
				});
			}
		}

		this.map[key] = value;

		if(!this._noEvent)
			Blackprint.emit('environment.added', temp);
	},

	_rename(keyA, keyB){
		if(!keyB) return;

		let { _map, map } = this;
		let temp = _map[keyA];
		if(temp == null) throw new Error(`${keyA} was not defined in the environment`);

		_map[keyB] = temp;
		delete _map[keyA];

		temp.key = keyB;
		Object.defineProperty(map, keyB, Object.getOwnPropertyDescriptor(map, keyA));
		delete map[keyA];

		Blackprint.emit('environment.renamed', {old: keyA, now: keyB});
	},

	delete(key){
		let { _list, _map, map } = this;

		let i = _list.indexOf(_map[key]);
		if(i !== -1)
			_list.splice(i, 1);

		delete _map[key];
		delete map[key];
		Blackprint.emit('environment.deleted', {key});
	},

	/**
	 * options = {allowGet: {}, allowSet: {}}
	 */
	rule(name, options){
		if(this.map[name] == null)
			throw new Error(`'${name}' was not found on Blackprint.Environment, maybe it haven't been added or imported`);

		if(this._rules[name] != null)
			throw new Error("'rule' only allow first registration");

		if(options == null)
			throw new Error("Second parameter is required");

		this._rules[name] = options;
	},
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
