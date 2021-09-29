// This port can have default value if no cable was connected
// type = Type Data that allowed for the Port
// value = default value for the port
BP_Port.Default = function(type, value){
	return {
		portFeature: BP_Port.Default,
		portType: type,
		default: value
	};
}