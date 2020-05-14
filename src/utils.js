function deepProperty(obj, path, value){
	if(value !== void 0){
		for(var i = 0, n = path.length-1; i < n; i++){
			if(obj[path[i]] === void 0)
				obj[path[i]] = {};

			obj = obj[path[i]];
		}

		obj[path[i]] = value;
		return;
	}

	for(var i = 0; i < path.length; i++){
		obj = obj[path[i]];

		if(obj === void 0)
			return;
	}

	return obj;
}

function NoOperation(){}