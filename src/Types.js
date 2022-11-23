let Types = Blackprint.Types = {
	Any: {name:'Any', any: true},

	// Can only be applicable for output port's type
	Route: {name: 'BP-Route', isRoute: true},
};

Object.seal(Blackprint.Types);

// Deprecation notice if still using 'Blackprint.Port.Route'
// ToDo: remove this if there are no more API or breaking changes until v0.8.10 that will break for other engine too
Object.defineProperty(BP_Port, 'Route', {
	get(){
		console.error("'Blackprint.Port.Route' will be changed to 'Blackprint.Types.Route' in version 0.8.10. Make sure to change it before your app stopped working.");
		return Types.Route;
	}
});