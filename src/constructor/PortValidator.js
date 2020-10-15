// Port that allow any value to be passed to a function
// maybe for type converter or other validation
Blackprint.PortValidator = function(type, func){
	if(func === void 0){
		type.portFeature = Blackprint.PortValidator;
		return type;
	}

	func.portFeature = Blackprint.PortValidator;
	func.portType = type;
	return func;
}