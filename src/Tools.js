Blackprint.Tools ??= {};
Blackprint.Tools.extractSkeleton = function(){
	let docs = Blackprint._docs;
	let nodes = {};
	let virtualType = [];

	function vType(type){
		if(type.virtualType) return type.virtualType.map(v => v.name).join(',');
		if(type.portType) type = type.portType;

		if(type === Number) return 'Number';
		else if(type === String) return 'String';
		else if(type === Object) return 'Object';
		else if(type === Array) return 'Array';
		else if(type === Boolean) return 'Boolean';
		else if(type === Blackprint.Types.Any) return 'BP.Any';
		else if(type === Blackprint.Types.Trigger) return 'BP.Trigger';
		else if(type === Blackprint.Types.Route) return 'BP.Route';

		if(type.constructor === Array){
			let types = [];
			for (let i=0; i < type.length; i++) {
				types[i] = vType(type[i]);
			}

			return types.join(',');
		}

		let existIndex = virtualType.indexOf(type);
		if(existIndex === -1){
			existIndex = virtualType.length;
			virtualType.push(type);
		}

		return type.name + '.' + existIndex;
	}

	function deep(nest, save){
		for (let key in nest) {
			let ref = nest[key];
			if(ref.hidden) continue;
			if(ref.constructor === Object){
				deep(ref, save[key] ??= {});
				continue;
			}
			// else .. ref == class

			let temp = save[key] ??= {};
			temp.input = {};
			temp.output = {};

			for (let which in temp) {
				let target = ref[which];
				for (let name in target) {
					let type = target[name];
					let savePort = temp[which];

					if(type.portFeature != null){
						if(type.portFeature === Blackprint.Port.ArrayOf)
							savePort[name] = 'BP.ArrayOf<' + vType(type) + '>';
						else if(type.portFeature === Blackprint.Port.StructOf)
							savePort[name] = 'BP.StructOf<' + vType(type) + '>';
						else if(type.portFeature === Blackprint.Port.Trigger)
							savePort[name] = 'BP.Trigger';
						else if(type.portFeature === Blackprint.Port.Union)
							savePort[name] = 'BP.Union<' + vType(type) + '>';
						else if(type.portFeature === Blackprint.Port.VirtualType)
							savePort[name] = 'VirtualType<' + vType(type) + '>';
					}
					else if(type === Number) savePort[name] = 'Number';
					else if(type === String) savePort[name] = 'String';
					else if(type === Object) savePort[name] = 'Object';
					else if(type === Array) savePort[name] = 'Array';
					else if(type === Boolean) savePort[name] = 'Boolean';
					else if(type === Blackprint.Types.Any) savePort[name] = 'BP.Any';
					else if(type === Blackprint.Types.Trigger) savePort[name] = 'BP.Trigger';
					else if(type === Blackprint.Types.Route) savePort[name] = 'BP.Route';

					else savePort[name] = 'VirtualType<' + vType(type) + '>';
				}
			}

			// Rename
			temp.$input = temp.input;
			temp.$output = temp.output;

			delete temp.input;
			delete temp.output;
		}
	}

	deep(Blackprint.nodes, nodes);

	return JSON.stringify({
		nodes,
		docs,
	});
}