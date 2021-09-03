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

Blackprint.loadModuleFromURL = async function(url, options){
	if(url.constructor !== Array) url = [url];

	if(!isBrowser)
		return await Promise.all(url.map(v=> import(v)));

	let _loadBrowserInterface = Blackprint.loadBrowserInterface;
	if(options != null && options.loadBrowserInterface === false)
		Blackprint.loadBrowserInterface = false;

	for (var i = 0; i < url.length; i++) {
		Blackprint._loadingURL = url[i].replace(/\?.*?$/m, '');

		// Let's expect it's nodes.sf.mjs related with nodes.min.mjs
		if(/\.sf\.mjs$/m.test(Blackprint._loadingURL)){
			let temp = Blackprint._loadingURL.replace(/\.sf\.mjs$/m, '.min.mjs');

			if(!(temp in Blackprint.modulesURL))
				throw `"${temp}" should be loaded before "${Blackprint.modulesURL}"`;

			Blackprint._loadingURL = temp;
		}

		await import(url[i]);
	}

	Blackprint.loadBrowserInterface = _loadBrowserInterface;
	delete Blackprint._loadingURL;
};

Blackprint.loadBrowserInterface = true;
Blackprint.hasBrowserInterface = async function(options){
	if(!isBrowser || !Blackprint.loadBrowserInterface || !Blackprint._loadingURL)
		return;

	let noStyle = Blackprint.loadBrowserInterface !== 'without-css';
	if(options != null && options.css === false)
		noStyle = false;

	let url = Blackprint._loadingURL.replace(/(|\.min|\.es6)\.(js|mjs|ts)$/m, '');

	if(!noStyle)
		sf.loader.css([url+'.sf.css']);

	await sf.loader.mjs([url+'.sf.js']);
}