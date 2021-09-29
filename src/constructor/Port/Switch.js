// Allow many cable connected to a port
// But only the last value that will used as value
BP_Port.Switch = function(type){
	return {
		portFeature: BP_Port.Switch,
		portType: type
	};
}