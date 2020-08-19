Blackprint.PortArrayOf = function(type){
	if(type.constructor === Array)
		type.name = 'Array '+type[0].constructor.name;

	return {
		portFeature:Blackprint.PortArrayOf,
		portType:type
	};
}

Blackprint.PortArrayOf.validate = function(type, data, deep){
	if(data === null || data === void 0)
		throw new Error("One of the cable's value was not an "+type.name);

	if(type === data.constructor && !deep)
		return;

	if(data.constructor === Array){
		for (var i = 0; i < data.length; i++) {
			if(type.constructor === Array && !type.includes(data[i].constructor))
				throw new Error("One of the cable's value was not an "+type);

			if(data[i].constructor !== type)
				throw new Error("One of the cable's value was not an "+type.name);
		}

		return;
	}

	throw new Error("One of the cable's value was not an "+type.name);
}