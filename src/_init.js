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

Blackprint.loadModuleFromURL = async function(url){
	if(url.constructor !== Array) url = [url];

	if(!isBrowser)
		return await Promise.all(url.map(v=> import(v)));

	for (var i = 0; i < url.length; i++) {
		Blackprint._loadingURL = url[i].replace(/\?.*?$/m, '');
		await import(url[i]);
	}

	delete Blackprint._loadingURL;
}