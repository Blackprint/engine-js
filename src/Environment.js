// Global Shared Interface Enviroment
// Environment map can be accessed with 'iface.env' on Sketch or Engine

Blackprint.Environment = {
	list: [], // This shouldn't being used
	map: {}, // Use this instead

	isBrowser: false,
	isNodeJS: false,
	isDeno: false,

	import(arr){
		var map = this.map;
		if(arr.constructor !== Array)
			return this.map = Object.assign(arr, map);

		let temp = new Set();

		// Reassign the value to the map
		for (var i = 0; i < arr.length; i++) {
			let item = arr[i];

			if(/[^A-Z_][^A-Z0-9_]/.test(item.key)){
				console.log("Environment to be imported:", item);
				throw new Error("Environment must be uppercase and not contain any symbol except underscore, and not started by a number. But got: "+item.key);
			}

			map[item.key] = item.value;
			temp.add(item.key);
		}

		// Delete everything in the array but don't remake the Array object
		this.list.splice(0);
		this.list.push(...arr);

		// Delete key in the map that was not exist on the imported list
		for(var key in map){
			if(temp.has(key)) continue;
			this.delete(key, true);
		}
	},

	set(key, value, refObject){
		if(/[^A-Z_][^A-Z0-9_]/.test(key))
			throw new Error("Environment must be uppercase and not contain any symbol except underscore, and not started by a number. But got: "+key);

		this.map[key] = value;

		if(refObject === void 0){
			let list = this.list;
			for (var i = 0; i < list.length; i++) {
				if(list[i].key === key){
					list[i].value = value;
					break;
				}
			}

			if(i === list.length)
				this.list.push({key, value});
		}
		else if(refObject !== false)
			refObject.value = value;
	},

	delete(key, withoutList){
		let { list, map } = this;

		if(withoutList === void 0){
			if(key.constructor === String){
				for (var i = 0; i < list.length; i++) {
					if(list[i].key === key){
						list.splice(i, 1);
						break;
					}
				}
			}
			else{
				let i = list.indexOf(key);
				key = key.key;

				if(i !== -1)
					list.splice(i, 1);
			}
		}

		// Don't delete field that has getter/setter
		let desc = Object.getOwnPropertyDescriptor(map, key);
		if(desc && desc.set !== void 0){
			map[key] = void 0;
			return;
		}

		delete map[key];
	}
};

if(window.HTMLVideoElement !== void 0)
	Blackprint.Environment.isBrowser = true;
else if(typeof process !== "undefined" && process.execPath !== void 0)
	Blackprint.Environment.isNodeJS = true;
else
	Blackprint.Environment.isDeno = true;