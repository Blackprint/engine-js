Blackprint.PortUnion = function(types){
	var names = [];
	for (var i = 0; i < types.length; i++)
		names.push(types[i].constructor.name);

	types.name = names.join(' ');
	return {
		portFeature:Blackprint.PortUnion,
		portType:types
	};
}

Blackprint.PortUnion.validate = function(types, target){
	return types.includes(target);
}