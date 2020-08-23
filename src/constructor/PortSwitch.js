// Allow many cable connected to a port
// But only the last value that being used as value
Blackprint.PortSwitch = function(type){
	return {
		portFeature: Blackprint.PortSwitch,
		portType: type
	};
}