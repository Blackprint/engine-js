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

// ToDo: Migrate some code to Blackprint Sketch
Blackprint.LoadScope = function(options){
	if(!isBrowser) return Blackprint;

	let cleanURL = options.url.replace(/[?#].*?$/gm, '');

	let temp = Object.create(Blackprint);
	let isInterfaceModule = /\.sf\.mjs$/m.test(cleanURL);

	temp._scopeURL = cleanURL.replace(/\.sf\.mjs$/m, '.min.mjs');

	if(Blackprint.loadBrowserInterface && !isInterfaceModule){
		if(window.sf === void 0)
			return console.log("[Blackprint] ScarletsFrame was not found, node interface for Blackprint Editor will not being loaded. You can also set `Blackprint.loadBrowserInterface` to false if you don't want to use node interface for Blackprint Editor.");

		let noStyle = Blackprint.loadBrowserInterface !== 'without-css';
		if(options != null && options.css === false)
			noStyle = false;

		let url = temp._scopeURL.replace(/(|\.min|\.es6)\.(js|mjs|ts)$/m, '');

		console.log(312, noStyle);
		if(!noStyle)
			sf.loader.css([url+'.sf.css']);

		sf.loader.mjs([url+'.sf.mjs'], {noWait: true});
	}

	return temp;
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

	if(!isBrowser)
		return await Promise.all(url.map(v=> import(v)));

	// ToDo: Migrate some code to Blackprint Sketch
	if(options == null) options = {};

	if(options.loadBrowserInterface === false)
		Blackprint.loadBrowserInterface = false;
	if(options.loadBrowserInterface === true)
		Blackprint.loadBrowserInterface = true;

	if(window.sf === void 0 && Blackprint.loadBrowserInterface){
		console.log("[Blackprint] ScarletsFrame was not found, node interface for Blackprint Editor will not being loaded. Please put `{loadBrowserInterface: false}` on second parameter of `Blackprint.loadModuleFromURL`. You can also set `Blackprint.loadBrowserInterface` to false if you don't want to use node interface for Blackprint Editor.");
		return;
	}

	return await Promise.all(url.map(v=> import(v)));
};