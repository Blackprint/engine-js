let exports = module.exports; // This will be 'window' object on browser
let Blackprint = exports = module.exports = window.Blackprint ??= {};

/**
 * This can be used to import Blackprint JSON without actually loading any nodes modules
 * Every nodes is generated at runtime, nodes will doing nothing even get connected
 * Skeleton node interface will be used by default
 */
Blackprint.Skeleton = class {
	constructor(json){
		this.functions = {};
		this.variables = {};
		this.iface = {};
		var inserted = this.ifaceList = [];

		if(json.constructor === String)
			json = JSON.parse(json);
		else json = JSON.parse(JSON.stringify(json)); // deep copy

		let metadata = json._;
		delete json._;

		let functions = metadata.functions;
		if(functions != null){
			for (let key in functions) this.functions[key] = functions[key];
		}

		let variables = metadata.variables;
		if(variables != null){
			for (let key in variables) this.variables[key] = variables[key];
		}

		let reorderInputPort = [];
		let appendLength = 0; // reserved, if we want to add feature for append nodes in the future
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				let temp = nodes[a];
				temp.i += appendLength;

				let iface = new SkeletonInterface(this, namespace, {
					x: temp.x,
					y: temp.y,
					z: temp.z,
					id: temp.id, // Named ID (if exist)
					i: temp.i, // List Index
					comment: temp.comment,
					data: temp.data, // if exist
					input_d: temp.input_d,
					output_sw: temp.output_sw,
				});

				if(temp.input != null){
					reorderInputPort.push({
						iface: iface,
						config: temp,
					});
				}

				inserted[iface.i] = iface;
			}
		}

		let cableConnects = [];
		let routeConnects = [];
		let branchPrepare = new Map();

		// Create cable only from output and property
		// > Important to be separated from above, so the cable can reference to loaded nodes
		for(var namespace in json){
			var nodes = json[namespace];

			// Every nodes that using this namespace name
			for (var a = 0; a < nodes.length; a++){
				let node = nodes[a];
				var iface = inserted[node.i];

				if(node.route != null)
					routeConnects.push({from: iface, to: inserted[node.route.i + appendLength]});

				// If have output connection
				if(node.output !== void 0){
					var out = node.output;
					var _cableMeta = node._cable;

					// Every output port that have connection
					for(var portName in out){
						var port = out[portName];
						var linkPortA = iface.output[portName] ??= new SkeletonPort(iface, 'output', portName);

						if(_cableMeta)
							branchPrepare.set(linkPortA, _cableMeta[portName])

						// Current output's available targets
						for (var k = 0; k < port.length; k++) {
							var target = port[k];
							target.i += appendLength;
			
							var targetNode = inserted[target.i];

							// Output can only meet input port
							var linkPortB = targetNode.input[target.name] ??= new SkeletonPort(targetNode, 'input', target.name);

							cableConnects.push({
								output: iface.output,
								input: targetNode.input,
								target,
								portName,
								linkPortA,
								linkPortB
							});
						}
					}
				}
			}
		}

		let branchMap = new Map();
		function deepCreate(temp, cable, linkPortA) {
			if(temp.branch !== void 0){
				cable.head2[0] = temp.x;
				cable.head2[1] = temp.y;

				if(temp.overRot != null)
					cable.overrideRot = temp.overRot;

				let list = temp.branch;
				for (let z = 0; z < list.length; z++)
					deepCreate(list[z], cable._createBranch(), linkPortA);

				return;
			}

			if(!branchMap.has(linkPortA))
				branchMap.set(linkPortA, []);

			branchMap.get(linkPortA)[temp.id] = cable;
		}

		// Connect route cable
		for (let i=0; i < routeConnects.length; i++) {
			let { from, to } = routeConnects[i];
			from.node.routes._routeTo(to);
		}

		// Connect ports cable
		for (var i = 0; i < cableConnects.length; i++) {
			// linkPortA = output, linkPortB = input (the port interface)
			let {output, portName, linkPortA, input, target, linkPortB} = cableConnects[i];

			let cable;
			let _cable = branchPrepare.get(linkPortA);
			if(_cable !== void 0){
				if(_cable !== true){
					branchPrepare.set(linkPortA, true);

					// Create branches
					for (let z = 0; z < _cable.length; z++)
						deepCreate(_cable[z], linkPortA._createCable(), linkPortA);
				}

				cable = branchMap.get(linkPortA)[target.parentId];
			}

			// Create cable from NodeA
			if(cable === void 0)
				cable = linkPortA._createCable();

			if(target.overRot != null)
				cable.overrideRot = target.overRot;

			if(linkPortA.isRoute){
				linkPortB._connectCable(cable);
				continue;
			}

			// Connect cables.currentCable to target port on NodeB
			linkPortB._connectCable(cable);
		}

		// Fix input port cable order
		for (let i=0; i < reorderInputPort.length; i++) {
			let { iface, config } = reorderInputPort[i];
			let cInput = config.input;

			for (let key in cInput) {
				let port = iface.input[key];
				let cables = port.cables;
				let temp = new Array(cables.length);

				let conf = cInput[key];
				for (let a=0; a < conf.length; a++) {
					let { i: index, name } = conf[a];
					let targetIface = inserted[index + appendLength];
					
					for (let z=0; z < cables.length; z++) {
						let cable = cables[z];
						if(cable.output.name !== name || cable.output.iface !== targetIface) continue;

						temp[a] = cable;
						break;
					}
				}

				for (let a=0; a < temp.length; a++) {
					if(temp[a] == null) console.error(`Some cable failed to be ordered for (${iface.namespace}: ${key})`);
				}

				port.cables = temp;
			}
		}
	}
}