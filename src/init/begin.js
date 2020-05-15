;(function(global, factory){
  if(typeof exports === 'object' && typeof module !== 'undefined')
  	return module.exports = factory(global);
  factory(global);
}(typeof window !== "undefined" ? window : this, (function(window){

if(window.Blackprint === void 0)
	window.Blackprint = {
		settings:function(which, val){
			Blackprint.settings[which] = val;
		}
	};

var Blackprint = window.Blackprint;

