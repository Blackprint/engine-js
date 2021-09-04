let exports = module.exports; // This will be 'window' object on browser

// Use the existing Blackprint Sketch, or create the polyfill
var Blackprint = exports.Blackprint = window.Blackprint || {
	settings(which, val){
		Blackprint.settings[which] = val;
	}
};

let isBrowser = window.HTMLVideoElement !== void 0;
if(exports.Blackprint === void 0){
	if(isBrowser) // as Node.js/Deno module
		Blackprint = Object.assign(exports, Blackprint);

	// Wrap exports in 'Blackprint' object for Browser
	else exports.Blackprint = Blackprint;
}

Blackprint.Addons = function(name){
	if(!(name in this.Addons))
		return this.Addons[name] = {};
	return this.Addons[name];
};

Blackprint.LoadScope = function(options){
	if(!isBrowser) return;

	let temp = Object.create(Blackprint);
	let isInterfaceModule = /\.sf\.mjs$/m.test(options.url);

	temp._scopeURL = options.url
		.replace(/\?.*?$/m, '')
		.replace(/\.sf\.mjs$/m, '.min.mjs');

	if(Blackprint.loadBrowserInterface && !isInterfaceModule){
		if(window.sf === void 0)
			return console.log("[Blackprint] ScarletsFrame was not found, node interface for Blackprint Editor will not being loaded. You can also set `Blackprint.loadBrowserInterface` to false if you don't want to use node interface for Blackprint Editor.");

		let noStyle = Blackprint.loadBrowserInterface !== 'without-css';
		if(options != null && options.css === false)
			noStyle = false;

		let url = Blackprint._scopeURL.replace(/(|\.min|\.es6)\.(js|mjs|ts)$/m, '');

		if(!noStyle)
			sf.loader.css([url+'.sf.css']);

		sf.loader.mjs([url+'.sf.js']);
	}

	return temp;
}

Blackprint.loadBrowserInterface = true;
Blackprint.loadModuleFromURL = async function(url, options){
	if(url.constructor !== Array) url = [url];

	if(!isBrowser)
		return await Promise.all(url.map(v=> import(v)));

	if(options == null) options = {};
	if(options.loadBrowserInterface === false)
		Blackprint.loadBrowserInterface = false;

	if(window.sf === void 0 && Blackprint.loadBrowserInterface){
		console.log("[Blackprint] ScarletsFrame was not found, node interface for Blackprint Editor will not being loaded. Please put `{loadBrowserInterface: false}` on second parameter of `Blackprint.loadModuleFromURL`. You can also set `Blackprint.loadBrowserInterface` to false if you don't want to use node interface for Blackprint Editor.");
		return;
	}

	return await Promise.all(url.map(v=> import(v)));
};