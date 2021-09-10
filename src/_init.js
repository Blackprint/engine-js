let exports = module.exports; // This will be 'window' object on browser

// Use the existing Blackprint Engine from window, or create the polyfill
var Blackprint = window.Blackprint || {
	settings(which, val){
		Blackprint.settings[which] = val;
	}
};

let isBrowser = window.HTMLVideoElement !== void 0;
if(exports.Blackprint === void 0){
	if(!isBrowser) // as Node.js/Deno module
		Blackprint = Object.assign(module.exports, Blackprint);

	// Wrap exports in 'Blackprint' object for Browser
	else exports.Blackprint = Blackprint;
}

Blackprint.ModuleContext = function(name){
	if(!(name in this.ModuleContext))
		return this.ModuleContext[name] = {};
	return this.ModuleContext[name];
};

// This function will be replaced when using browser and have loaded Blackprint Sketch
Blackprint.LoadScope = function(options){
	return Blackprint;
}

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