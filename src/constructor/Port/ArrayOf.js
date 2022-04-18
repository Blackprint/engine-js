// This port can contain multiple cable as input
// and the value will be array of 'type'
// it's only one type, not union
// for union port, please split it to different port to handle it
BP_Port.ArrayOf = function(type){
	if(type !== null && type.constructor === Array)
		throw new Error("Currently Blackprint.Port.ArrayOf only accept one types");

	return {
		portFeature: BP_Port.ArrayOf,
		portType: type
	};
}

BP_Port.ArrayOf.validate = function(type, target){
	if(type.any || target.any || type === target)
		return true;

	if(type.constructor === Array)
		if(type.includes(target))
			return true;

	return false;
}