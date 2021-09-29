// This port will be used as a trigger or callable input port
// func = callback when the port was being called as a function
BP_Port.Trigger = function(func){
	return {
		portFeature: BP_Port.Trigger,
		default: func
	};
}