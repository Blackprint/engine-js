// This port can allow multiple different types
// like an 'any' port, but can only contain one value
BP_Port.Union = function(types){
	if(types.constructor !== Array)
		throw new Error("Blackprint.Port.Union parameter must be an array of types");

	var names = [];
	for (var i = 0; i < types.length; i++){
		let temp = types[i].name;
		names.push(temp.length > 2 ? temp : '?');
	}

	types.name = 'BP-Union '+names.join(' ');
	return {
		portFeature: BP_Port.Union,
		portType: types
	};
}

BP_Port.Union.validate = function(types, target){
	return target.any || types.includes(target);
}