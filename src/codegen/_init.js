// Reserved for future
Blackprint.Code ??= class Code {
	constructor(iface){
		this.iface = iface;
		this.node = iface.node;
	}
};

// Declare function by assigning from the prototype to enjoy hot reload
Blackprint.Code.prototype._generateFor = function(fnName, language, routes, ifaceIndex){
	if(this[language] == null)
		throw new Error(`The registered code for "${this.iface.namespace}" doesn't have handler for "${language}" languange`);

	let data = this[language](routes);
	let ret = {};

	data.code = tidyLines(data.code);
	if(language === 'js'){
		if(data.type === Blackprint.CodeType.Callback){
			ret.code = `function ${fnName}(Input, Output, Route){\n\t${data.code.replace(/\n/g, '\n\t')}\n}`;
			ret.selfRun = data.selfRun;

			if(ret.selfRun && this.constructor.routeIn === Blackprint.CodeRoute.MustHave)
				throw new Error(`'selfRun' code can't be used for node that using "CodeRoute.MustHave" for input route`);
		}
		else if(data.type === Blackprint.CodeType.Wrapper)
			ret.code = `${data.begin}\n\tbp_output_${ifaceIndex} = Input;\n{{+bp wrap_code_here }}\n${data.end}`;

		// Default
		else ret.code = `function ${fnName}(Input, Output){ ${data.code} }`;
	}

	return ret;
}

let codesHandler = Blackprint.Code.codesHandler ??= {};
Blackprint.registerCode = function(namespace, clazz){
	if(!(clazz.prototype instanceof Blackprint.Code))
		throw new Error("Class must be instance of Blackprint.Code");

	// Set default routes
	if(clazz.routeRules == null){
		if(clazz.routeIn == null) clazz.routeIn = Blackprint.CodeRoute.MustHave;
		if(clazz.routeOut == null) clazz.routeOut = Blackprint.CodeRoute.Optional;
	}

	codesHandler[namespace] = clazz;
}

// The generated code may not self execute, and you may need to trigger the execution
// You will also need to have an event node as the entrypoint
// The event node mustn't have input route to be automatically marked as entrypoint
// Some nodes may get skipped if it's not routed from the event node's route
let codesCache;
Blackprint.Code.generateFrom = function(node, language, exportName){
	if(language == null) throw new Error("Target language is required to be specified on parameter 2");
	if(!exportName) throw new Error("Export name is required to be specified on parameter 3");
	codesCache = new Map();

	let sharedData = {code: {}, nodes: [], varInits: new Map(), currentRoute: 0};
	let generated;

	if(node instanceof Blackprint.Engine)
		generated = fromInstance(node, language, sharedData);
	else if(node instanceof Blackprint.Interface){
		// Scan for input node that was event node type
		let stopUntil = null;
		// ToDo: scan for branching input and separate to different route for simplify the generated code
		generated = fromNode(node, language, sharedData, stopUntil);
	}
	else throw new Error("First parameter must be instance of Engine or Interface");

	if(language === 'js'){
		if(/(^[^a-zA-Z]|\W)/m.test(exportName)) throw new Error("Export name is a invalid variable name for JavaScript");

		let inits = `let ${exportName} = (function(){`;
		inits += `\n\tlet exports = {};`;
		inits += `\n\t${[...sharedData.varInits.values()].join('\n\t')};`;

		let body = ((Object.values(sharedData.code).join('\n') + '\n\n' + generated).trim()).replace(/\n/g, '\n\t');

		return inits + '\n\n\t' + body + `\n\treturn exports;\n})();`;
	}
	else throw new Error(`Code generation for '${language}' language is not implemented yet`);
}

// This method will scan for nodes that was event node type as the entrypoint
// As event node can self-trigger or triggered by an external event
function fromInstance(instance, language, sharedData){
	let CodeRoute = Blackprint.CodeRoute;
	let entrypoint = instance.ifaceList.filter(iface => {
		let handler = codesHandler[iface.namespace];
		let { routeIn } = handler.routeRules?.(iface) || handler;

		if(routeIn === CodeRoute.Optional || routeIn === CodeRoute.None)
			return true;

		if(routeIn === CodeRoute.MustHave){
			if(iface.node.routes.in.length === 0) throw new Error(`Node '${iface.namespace}' must have input route`);

			// Node that have input route can't be the entrypoint
			return false;
		}

		throw new Error("Unrecognized CodeRoute configuration for: " + iface.namespace);
	});

	let codes = [];
	for (let i=0; i < entrypoint.length; i++)
		codes.push(fromNode(entrypoint[i], language, sharedData));

	// Assign function index and merge the codes into a string
	let sharedCode = sharedData.code;
	for (let key in sharedCode) {
		let list = sharedCode[key];
		for (let i=0; i < list.length; i++)
			list[i] = list[i].replace('_bp_INDEX___', i);

		sharedCode[key] = sharedCode[key].join('\n\n');
	}

	return codes.join('\n\n');
}

function fromNode(iface, language, sharedData, stopUntil){
	let routes = {
		traceRoute: [],
		routeIn: null,
		routeOut: null,
	};

	let ifaceList = iface.node.instance.ifaceList;

	// let scanner = iface;
	// while(scanner != null){
	// 	sharedData.nodes.push(scanner);
	// 	scanner = scanner.node.routes.out?.input.iface;
	// 	if(stopUntil == scanner) break;
	// }

	sharedData.currentRoute++;
	let wrapper = `function bp_route_${sharedData.currentRoute}(){\n{{+bp wrap_code_here }}\n}`;
	let selfRun = '';

	let codes = [];
	let varInits = sharedData.varInits;
	while(iface != null){
		let namespace = iface.namespace;
		let code = codesCache.get(iface);
		let ifaceIndex = ifaceList.indexOf(iface);

		if(code == null){
			let clazz = codesHandler[namespace];
			if(clazz == null)
				throw new Error(`Code generation haven't been registered for: ${namespace}`);

			code = new clazz(iface);
			codesCache.set(iface, code);
		}

		routes.routeOut = iface.node.routes.out?.input.iface;

		let fnName = iface.namespace.replace(/\W/g, '_') + '_bp_INDEX___';
		let shared = sharedData.code[namespace] ??= [];
		let temp = code._generateFor(fnName, language, routes, ifaceIndex); // _bp_INDEX___ will be replaced after all code was generated
		let i = shared.indexOf(temp.code);

		if(temp.code.includes('{{+bp wrap_code_here }}')) wrapper = temp.code;
		else {
			if(i === -1){
				i = shared.length;
				shared.push(temp.code);
			}
			fnName = fnName.replace('_bp_INDEX___', i);
		}

		// All input data will be available after a value was outputted by a node at the end of execution
		// 'bp_input' is raw Object, 'bp_output' also raw Object that may have property of callable function
		if(language === 'js'){
			let inputs = [], outputs = [];
			let { IInput, IOutput } = iface.ref;

			if(IInput != null){
				for (let key in IInput) {
					let def = IInput[key].default;
					let portName = /(^[^a-zA-Z]|\W)/m.test(key) ? JSON.stringify(key) : key;

					if(def == null)
						inputs.push(`${portName}: null`);
					else {
						let typed = typeof def;
						let feature = IInput[key].feature;

						if(feature === Blackprint.Port.Trigger) def = null;
						else if(feature === Blackprint.Port.ArrayOf) def = [];
						else if(typed !== 'string' && typed !== 'number' && typed !== 'boolean')
							throw new Error(`Can't use default type of non-primitive type for "${key}" input port in "${iface.namespace}"`);

						inputs.push(`${portName}: ${JSON.stringify(def)}`);
					}
				}
			}

			if(IOutput != null){
				let portIndex = 0;
				for (let key in IOutput) {
					let portName = /(^[^a-zA-Z]|\W)/m.test(key) ? JSON.stringify(key) : key;
					let port = IOutput[key];

					if(port.feature !== Blackprint.Port.Trigger){
						let resyncer = [];
						let cables = port.cables;
						for (let i=0; i < cables.length; i++) {
							let inp = cables[i].input;
							if(inp == null) continue;

							let targetIndex = ifaceList.indexOf(inp.iface);
							let propAccessName = /(^[^a-zA-Z]|\W)/m.test(inp.name) ? JSON.stringify(inp.name) : inp.name;

							propAccessName = propAccessName.slice(0, 1) === '"' ? '['+propAccessName+']' : '.'+propAccessName;
							resyncer.push(`bp_input_${targetIndex + propAccessName}`);
						}

						portIndex++;
						if(resyncer.length !== 0)
							outputs.push(`set ${portName}(val){ ${resyncer.join('\n')} = this._${portIndex} = val; }`);

						outputs.push(`get ${portName}(){ return this._${portIndex}; }`);
					}
					else {
						outputs.push(`${portName}(){
							throw "ToDo: call other node";
						}`.replace(/^					/gm, ''));
					}
				}
			}

			if(!varInits.has(ifaceIndex))
				varInits.set(ifaceIndex, `let bp_input_${ifaceIndex} = {${inputs.join(', ')}}; let bp_output_${ifaceIndex} = {${outputs.join(', ')}};`);

			if(temp.selfRun){
				selfRun += `${fnName}(bp_input_${ifaceIndex}, bp_output_${ifaceIndex}, {Out(){ bp_route_${sharedData.currentRoute}(); }});`;
			}
			else if(iface.type !== 'event'){
				codes.push(`${fnName}(bp_input_${ifaceIndex}, bp_output_${ifaceIndex});`.replace(/^			/gm, ''));
			}
		}
		else throw new Error(`Code generation for '${language}' language is not implemented yet`);

		routes.routeIn = iface;
		routes.traceRoute.push(iface);

		iface = routes.routeOut;
		if(stopUntil == iface) break;
	}

	return selfRun + '\n' + wrapper.replace('{{+bp wrap_code_here }}', '\t'+codes.join('\n\t'));
}

function tidyLines(str){
	str = str.trim();
	let pad = str.split('\n').pop().match(/^[\t ]+/m);
	if(pad == null || pad.index !== 0) return str;
	return str.replace(RegExp('^'+pad[0], 'gm'), '');
}