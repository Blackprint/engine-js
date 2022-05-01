let exports = module.exports; // This will be 'window' object on browser

// Use the existing Blackprint Engine from window, or create the polyfill
var Blackprint = window.Blackprint || {
	settings(which, val){
		if(which === 'windowless' && val){
			window.DOMRect ??= class{};
			window.ResizeObserver ??= class{};
		}

		Blackprint.settings[which] = val;
	}
};

if(Blackprint._utils === void 0)
	Blackprint._utils = {};

let isBrowser = window.HTMLVideoElement !== void 0;
if(exports.Blackprint === void 0){
	if(window !== exports)
		Object.assign(exports, Blackprint);

	if(window.Blackprint === void 0)
		Blackprint = window.Blackprint = (window !== exports ? exports : Blackprint);
}

// Blackprint must be initialized once
if(Blackprint.Engine !== void 0) return;

Object.setPrototypeOf(Blackprint, CustomEvent.prototype);

// Will  be used for `Blackprint.registerNode`
Blackprint.modulesURL = {};
Blackprint._modulesURL = [];

let _getContextWait = {};
let _getContextWaitPromise = {};
Blackprint.getContext = async function(name){
	if(!(name in _Context)){
		_getContextWaitPromise[name] ??= new Promise(resolve => _getContextWait[name] = resolve);
		return await _getContextWaitPromise[name];
	}

	return _Context[name];
};

let _Context = Blackprint.getContext._context = {};
Blackprint.createContext = function(name){
	if(name in _Context) return _Context[name];

	let temp = _Context[name] = {IFace:{}};
	if(name in _getContextWait){
		setTimeout(function(){
			_getContextWait[name](temp);
		}, 1);
	}

	return temp;
};

// This function will be replaced when using browser and have loaded Blackprint Sketch
Blackprint.loadScope = function(options){
	let cleanURL = options.url.replace(/#.*?$/gm, '');
	let temp = Object.create(Blackprint);

	temp._scopeURL = cleanURL.replace(/\.sf\.mjs$/m, '.min.mjs');
	return temp;
};

let allowModuleOrigin = null;
Blackprint.allowModuleOrigin = function(list){
	if(allowModuleOrigin !== null) return;

	if(list.constructor === String && list !== '*')
		allowModuleOrigin = [list];
	else allowModuleOrigin = list;

	if(allowModuleOrigin === false || allowModuleOrigin === '*')
		return;

	list = allowModuleOrigin;
	for (var i = 0; i < list.length; i++) {
		let temp = list[i];

		if(temp.startsWith('localhost')){
			list[i] = 'http://'+temp+'/';
			list[i] = 'https://'+temp+'/';
		}

		if(temp.startsWith('https:'))
			continue;

		list[i] = 'https://'+temp+'/';
	}
}

Blackprint.loadBrowserInterface = true;
Blackprint.loadModuleFromURL = async function(url, options){
	if(url.constructor !== Array) url = [url];
	else url = url.slice(0);

	if(!allowModuleOrigin)
		throw new Error("Load from URL is not allowed for any origin");

	// Check allowed URL origin to avoid suspicious module load
	if(allowModuleOrigin !== '*'){
		let list = allowModuleOrigin;
		for (var i = 0; i < url.length; i++) {
			let check = url[i];
			let found = false;

			for (var a = 0; a < list.length; a++) {
				if(check.startsWith(list[a])){
					found = true;
					break;
				}
			}

			if(found === false)
				throw new Error("Load from URL is not allowed for this origin: "+check);
		}
	}

	let loadedList = Object.values(Blackprint.modulesURL).map(v=> v._url);
	for (var i = url.length-1; i >= 0; i--){
		let temp = url[i];

		// Do security check, block insecure URL
		if(temp.indexOf('http:') === 0 && /^http:\/\/localhost[:\/]/m.test(temp) === false)
			throw "Remote URL must use https to avoid security issues, but got: "+temp;

		// Remove loaded module from the list
		if(loadedList.includes(temp))
			url.splice(i, 1);
	}

	// Remove old version if exist
	if(loadedList.length !== 0 && url.length !== 0){
		let hasUpdate = false;
		let { packageIsNewer } = Blackprint.utils;

		// ToDo: make this more efficient
		that: for (var i = 0; i < loadedList.length; i++) {
			let tempOld = loadedList[i];
			for (var a = url.length - 1; a >= 0; a--) {
				let tempNew = url[a];

				if(packageIsNewer(tempOld, tempNew)){
					Blackprint.deleteModuleFromURL(tempOld);
					continue that;
				}

				if(packageIsNewer(tempNew, tempOld)){
					url.splice(a, 1);
					continue that;
				}

				hasUpdate = true;
			}
		}

		if(hasUpdate) Blackprint.emit('moduleUpdate');
	}

	if(Blackprint.loadModuleFromURL.browser === void 0)
		return await Promise.all(url.map(v=> import(v)));

	return await Blackprint.loadModuleFromURL.browser(url, options);
};

Blackprint.deleteModuleFromURL = function(url){
	url = url.replace(/[?#].*?$/m, '').replace(/@[0-9.\-]+/m, '');
	let modules = Blackprint.modulesURL;

	for(let key in modules){
		if(url === key.replace(/[?#].*?$/m, '').replace(/@[0-9.\-]+/m, '')){
			url = key;
			break;
		}
	}

	let recheckList = new Set();
	let nodes = Blackprint.nodes;
	Blackprint.utils.diveModuleURL(modules[url], function(deepObject, deepProp, keys, bubble){
		delete deepObject[deepProp];

		// Bubbling check if the parent has no child anymore
		for (var i = bubble.length-1; i >= 0; i--) {
			let ref = bubble[i];

			if(i === 0){
				recheckList.add(keys[0]);
				break;
			}

			if(--ref.val._length <= 0){
				let parent = bubble[i-1];
				delete parent.val[ref.key];
			}
			else break;
		}
	});

	that:for(let val of recheckList){
		let nodeList = nodes[val];

		for(let key in nodeList)
			continue that;

		delete nodes[val];
	}

	if(modules[url] != null) Blackprint.emit('moduleDelete', { url });
	delete modules[url];
}