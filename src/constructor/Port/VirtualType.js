// This only exist on JavaScript, just like a typed string or other typed primitives
// Mostly can be useful for Blackprint Sketch as a helper/shortcut when creating nodes
BP_Port.VirtualType = function(originalType, virtualName, context){
	if(Blackprint.Sketch === null) return originalType;

	if(virtualName.constructor !== Array)
		virtualName = [virtualName];

	for (let i=0; i < virtualName.length; i++) {
		virtualName[i] = (context.__virtualTypes[virtualName[i]] ??= {name: virtualName[i]});
	}

	if(originalType.portFeature){
		originalType.virtualType = virtualName;
		return originalType;
	}

	return {
		portFeature: BP_Port.VirtualType,
		portType: originalType,
		virtualType: virtualName,
	};
}

BP_Port.VirtualType.validate = function(types, target){
	if((types.source === 'input' && types.virtualType == null)
		|| (target.source === 'input' && target.virtualType == null)){
			return true; // true if the input port didn't accept virtual type
	}

	if(types.virtualType == null && target.virtualType == null)
		return true; // true if no virtual type

	if(types.virtualType == null || target.virtualType == null)
		return false;

	let A = types.virtualType;
	let B = types.virtualType;

	for (let i=0; i < A.length; i++) {
		if(B.includes(A[i])) return true;
	}

	for (let i=0; i < B.length; i++) {
		if(A.includes(B[i])) return true;
	}

	return false;
}