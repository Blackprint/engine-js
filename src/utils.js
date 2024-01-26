Blackprint._utils.setDeepProperty = setDeepProperty;
Blackprint._utils.getDeepProperty = getDeepProperty;
function setDeepProperty(obj, path, value, onCreate){
	var temp;
	for(var i = 0, n = path.length-1; i < n; i++){
		temp = path[i];

		// Disallow diving into internal JavaScript property
		if(temp === "constructor" || temp === "__proto__" || temp === "prototype")
			return;

		if(obj[temp] === void 0){
			obj[temp] = {};
			onCreate && onCreate(obj[temp]);
		}

		obj = obj[temp];
	}

	temp = path[i];
	if(temp === "constructor" || temp === "__proto__" || temp === "prototype")
		return;

	obj[temp] = value;
	return;
}

function getDeepProperty(obj, path, reduceLen=0){
	for(var i = 0, n = path.length-reduceLen; i < n; i++){
		if((obj = obj[path[i]]) === void 0)
			return;
	}

	return obj;
}

function NoOperation(){}

// Experimental
// obj = Array of object that will be linked
function ObjectLinker(obj, key, val){
	if(obj.push === void 0)
		throw new Error("Parameter one of sf.link should be an array of object that would be linked.");

	const createScope = value => ({
		configurable:true, enumerable:true,
		get(){return value},
		set: val => value = val,
	});

	var candidate = false;
	function check(temp){
		if(temp === void 0)
			return;

		if(temp.set !== void 0){
			// Can we handle it?
			if(candidate !== false && temp.set !== candidate.set)
				throw new Error("There are more than one object that have different set descriptor");

			candidate = temp;
			return;
		}

		if(candidate === false && val === void 0)
			val = temp.value;
	}

	if(obj.constructor === Array)
		for (var i = 0; i < obj.length; i++)
			check(Object.getOwnPropertyDescriptor(obj[i], key));

	if(candidate === false)
		candidate = createScope(val);

	if(obj.constructor === Array)
		for (var i = 0; i < obj.length; i++)
			Object.defineProperty(obj[i], key, candidate);
}

const isClass = Blackprint._utils.isClass = (function(){
  const classDefaultProp = {
	_scopeURL:true, // Private data when using Blackprint modules
	input:true,
	output:true,
	property:true,

  	name:true,
  	length:true,
  	prototype:true,
  	arguments:true,
  	caller:true,
  };

  return function(func){
    // Class constructor is also a function
    if(!(func && func.constructor === Function) || func.prototype === undefined)
      return false;

    // This is a class that extends other class
    if(Function.prototype !== Object.getPrototypeOf(func))
      return true;

    // Usually a function will only have 'constructor' in the prototype
    if(Object.getOwnPropertyNames(func.prototype).length > 1)
      return true;

    // Check if at least have one static property
    let props = Object.getOwnPropertyNames(func);
    for(let i=0; i < props.length; i++){
      let prop = props[i];
      if(!(prop in classDefaultProp) && prop.slice(0, 1) !== '_')
        return true;
    }

    // Not recognized as a class object
    return false;
  }
})();

Blackprint.utils ??= {};
Blackprint.utils.renameTypeName = function(obj, minimumChar=0){
	for(let key in obj){
		if(minimumChar !== 0 && obj[key].name.length > minimumChar)
			continue;

		Object.defineProperty(obj[key], 'name', {
			configurable: true, value: key
		});
	}
}

Blackprint.utils.packageIsNewer = function(old, now){
	if(old === now) return false;

	let oldVer = old.split(/@([^~>=<][0-9.-]+)/);
	let nowVer = now.split(/@([^~>=<][0-9.-]+)/);
	if(oldVer.length === 1 && nowVer.length === 1) return false;
	if(oldVer.length === 1) return false; // If old is using latest

	// Check if different packages/url
	if(oldVer[0] !== nowVer[0]) // URL
		return false;

	if(oldVer[2] !== nowVer[2]) // Package name
		return false;

	// Compare the version
	oldVer = oldVer[1].replace(/-/g, '.').replace(/\.\.+/, '.');
	nowVer = nowVer[1].replace(/-/g, '.').replace(/\.\.+/, '.');

	return oldVer.localeCompare(nowVer, void 0, { numeric: true, sensitivity: 'base' }) === -1;
}

Blackprint.utils.diveModuleURL = function(moduleInfo, onBubbling){
	that: for(let key in moduleInfo){
		if(key.slice(0, 1) === '_')
			continue;

		key = key.split('/');
		let prop = key.pop();

		// Dive
		let obj = Blackprint.nodes;
		let bubble = new Array(key.length);
		for (var i = 0; i < key.length; i++){
			let k = key[i];
			obj = obj[k];
			bubble[i] = {key:k, val:obj};
			if(obj == null) continue that;
		}

		onBubbling(obj, prop, key, bubble);
	}
}

Blackprint.utils.setEnumerablePrototype = function(clazz, props){
	let temp = clazz.prototype;
	let desc = Object.getOwnPropertyDescriptors(temp);

	for(let key in props){
		let ref = desc[key];
		if(ref == null){
			console.error("Error:", key, desc);
			throw new Error(`"${key}" property was not found on the prototype`);
		}
		ref.enumerable = props[key];
	}

	Object.defineProperties(temp, desc);
}

function _combineArray(A, B){
	let list = [];
	if(A != null) list.push(...A);
	if(B != null) list.push(...B);
	return list;
}