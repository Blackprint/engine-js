/**
 * Can be used to split a port into multiple port with a different data handler
 * Currently only for output port
 * {
 *   NameA: { type: Number, handle(data){ return data.myNum } },
 *   NameB: { type: String, field: 'myStr' } },
 * }
 */
BP_Port.StructOf = function(type, struct){
	return {
		portFeature: BP_Port.StructOf,
		portType: type,
		default: struct,
	};
}

BP_Port.StructOf.split = function(port){
	if(port.source === 'input')
		throw new Error("Port with feature 'StructOf' only supported for output port");

	let node = port.iface.node;
	let struct = port.struct;
	port.structList ??= Object.keys(struct);

	let hasSketch = Blackprint.Sketch != null;
	let newPort;
	for (let key in struct) {
		let ref = struct[key];
		ref._name ??= port.name + key;

		newPort = node.createPort('output', ref._name, ref.type);
		newPort._parent = port;
		newPort._structSplitted = true;

		if(hasSketch)
		newPort.classAdd = 'BP-StructSplit ' + newPort.classAdd;
	}

	if(hasSketch)
		newPort.classAdd = 'BP-Last ' + newPort.classAdd;

	port.splitted = true;
	port.disconnectAll();

	if(hasSketch){
		port.classAdd = 'BP-Open ' + port.classAdd;
		port.iface._recalculateSize?.();
	}

	let data = node.output[port.name];
	if(data != null) BP_Port.StructOf.handle(port, data);
}

BP_Port.StructOf.unsplit = function(port){
	let parent = port._parent;
	if(parent == null && port.struct != null)
		parent = port;

	parent.splitted = false;

	let struct = parent.struct;
	let node = port.iface.node;

	for (let key in struct) {
		node.deletePort('output', struct[key]._name);
	}

	if(Blackprint.Sketch != null){
		parent.classAdd = parent.classAdd.replace('BP-Open ', '');
		port.iface._recalculateSize?.();
	}
}

BP_Port.StructOf.handle = function(port, data){
	let { struct, structList } = port;
	let { output } = port.iface.node;

	if(data != null){
		for (let i=0; i < structList.length; i++) {
			let ref = struct[structList[i]];

			if(ref.field != null)
				output[ref._name] = data[ref.field];
			else
				output[ref._name] = ref.handle(data);
		}
	}
	else {
		for (let i=0; i < structList.length; i++) {
			output[struct[structList[i]]._name] = null;
		}
	}
}