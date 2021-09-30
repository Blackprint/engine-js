// This port can allow multiple different types
// like an 'any' port, but can only contain one value
BP_Port.Union = function(types){
	var names;

	if(types.constructor === Object){
		names = Object.keys(types);
		types = Object.values(types);
	}
	else{
		names = [];

		for (var i = 0; i < types.length; i++){
			let temp = types[i].name;
			names.push(temp.length > 2 ? temp : '?');
		}
	}

	types.name = names.join(' ');
	return {
		portFeature: BP_Port.Union,
		portType: types
	};
}

BP_Port.Union.validate = function(types, target){
	return types.includes(target);
}