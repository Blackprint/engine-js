let exports = module.exports; // This will be 'window' object on browser

// Use the existing Blackprint Engine from window, or create the polyfill
var Blackprint = window.Blackprint || {
	settings(which, val){
		Blackprint.settings[which] = val;
	}
};

if(Blackprint._utils === void 0)
	Blackprint._utils = {};

let isBrowser = window.HTMLVideoElement !== void 0;
if(exports.Blackprint === void 0){
	if(!isBrowser) // as Node.js/Deno module
		Blackprint = Object.assign(module.exports, Blackprint);

	// Wrap exports in 'Blackprint' object for Browser
	else exports.Blackprint = Blackprint;
}

Blackprint.classMerge = function(main, ...sources){
	let temp = {};
	for (var i = 0; i < sources.length; i++)
		Object.assign(temp, Object.getOwnPropertyDescriptors(sources[i].prototype));

	delete temp.constructor;
	delete temp.prototype;
	Object.defineProperties(main.prototype, temp);
}

Blackprint.getContext = function(name){
	if(!(name in this.getContext))
		return this.getContext[name] = {};
	return this.getContext[name];
};

// This function will be replaced when using browser and have loaded Blackprint Sketch
Blackprint.loadScope = options=> Blackprint;

Blackprint.loadBrowserInterface = true;
Blackprint.loadModuleFromURL = async function(url, options){
	if(url.constructor !== Array) url = [url];

	// Do security check, block insecure URL
	for (var i = 0; i < url.length; i++){
		let temp = url[i];
		if(temp.indexOf('http:') === 0 && /^http:\/\/localhost[:\/]/m.test(temp) === false){
			throw "Remote URL must use https to avoid security issues, but got: "+temp;
		}
	}

	if(Blackprint.loadModuleFromURL.browser === void 0)
		return await Promise.all(url.map(v=> import(v)));

	return Blackprint.loadModuleFromURL.browser(url, options);
};