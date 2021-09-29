// This port will allow any value to be passed to a function
// then you can write custom data validation in the function
// the value returned by your function will be used as the input value
BP_Port.Validator = function(type, func){
	if(func === void 0){
		type.portFeature = BP_Port.Validator;
		return type;
	}

	func.portFeature = BP_Port.Validator;
	func.portType = type;
	return func;
}