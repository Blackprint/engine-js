// Wait until function call finish before connecting cable
Blackprint.PortAsync = function(type, callFirst){
	if(!(callFirst instanceof Function))
		throw new Error("Parameter 2 of PortAsync must be a function");

	return {
		portFeature:Blackprint.PortAsync,
		portType:type,
		call:callFirst
	};
}