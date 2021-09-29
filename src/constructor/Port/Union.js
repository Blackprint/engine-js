// This port can allow multiple different types
// like an 'any' port, but can only contain one value
BP_Port.Union = function(types){
	var names = [];
	for (var i = 0; i < types.length; i++)
		names.push(types[i].constructor.name);

	types.name = names.join(' ');
	return {
		portFeature: BP_Port.Union,
		portType: types
	};
}

BP_Port.Union.validate = function(types, target){
	return types.includes(target);
}