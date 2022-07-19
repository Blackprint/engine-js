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
	port.structList ??= Object.keys(port.struct);

	let hasSketch = Blackprint.Sketch != null;

	for (let key in struct) {
		let ref = struct[key];
		ref._name ??= port.name + key;

		let newPort = node.createPort('output', ref._name, ref.type);
		newPort._parent = port;
		newPort._structSplitted = true;

		if(hasSketch)
			newPort.classAdd = 'StructSplit ' + newPort.classAdd;
	}

	if(hasSketch)
		port.classAdd = 'BP-Hide ' + port.classAdd;

	port.splitted = true;
	port.disconnectAll();

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

	if(Blackprint.Sketch != null)
		parent.classAdd = parent.classAdd.replace('BP-Hide ', '');
}

BP_Port.StructOf.handle = function(port, data){
	let struct = port.struct;
	let { output } = port.iface.node;

	let structList = port.structList;
	for (let i=0; i < structList.length; i++) {
		let key = structList[i];
		let ref = struct[key];

		if(ref.field != null)
			output[ref._name] = data[ref.field];
		else
			output[ref._name] = ref.handle(data);
	}
}