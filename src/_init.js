let exports = module.exports; // This will be 'window' object on browser

// Use the existing Blackprint Sketch, or create the polyfill
var Blackprint = exports.Blackprint || {
	settings(which, val){
		Blackprint.settings[which] = val;
	}
};

if(exports.Blackprint === void 0){
	if(window.HTMLVideoElement === void 0 || window.Deno !== void 0) // as Node.js/Deno module
		Blackprint = Object.assign(exports, Blackprint);

	// Wrap exports in 'Blackprint' object for Browser
	else exports.Blackprint = Blackprint;
}

Blackprint.Addons = function(name){
	if(!(name in this.Addons))
		return this.Addons[name] = {};
	return this.Addons[name];
};
