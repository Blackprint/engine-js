// Wait until function call finish before connecting cable
Blackprint.PortAwait = function(type, callFirst){
	if(!(callFirst instanceof Function))
		throw new Error("Parameter 2 of PortAwait must be a function");

	return {
		portFeature:Blackprint.PortAwait,
		portType:type,
		call:callFirst
	};
}