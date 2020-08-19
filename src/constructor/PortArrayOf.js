Blackprint.PortArrayOf = function(type){
	if(type.constructor === Array)
		type.name = 'Array '+type[0].constructor.name;

	return {
		portFeature:Blackprint.PortArrayOf,
		portType:type
	};
}

Blackprint.PortArrayOf.validate = function(type, target){
	if(type === target)
		return true;

	if(type.constructor === Array)
		if(type.includes(target))
			return true;

	console.log("One of the cable's value was not an "+type.name);
}