// ToDo: Export as module instead to window
if(window.Blackprint === void 0)
	window.Blackprint = {
		settings:function(which, val){
			Blackprint.settings[which] = val;
		}
	};

var Blackprint = window.Blackprint;
Blackprint.Addons = function(name){
	return this.Addons[name] ??= {};
};
