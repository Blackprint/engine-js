Blackprint.PortArrayOf = function(type){
	if(type !== null && type.constructor === Array)
		type.name = 'Array '+type[0].constructor.name;

	return {
		portFeature:Blackprint.PortArrayOf,
		portType:type
	};
}

Blackprint.PortArrayOf.validate = function(type, target){
	if(type.any || type === target)
		return true;

	if(type.constructor === Array)
		if(type.includes(target))
			return true;

	return false;
}