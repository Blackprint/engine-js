// Reserved for future
Blackprint.Code = class Code {
	constructor(iface){
		this.iface = iface;
		this.node = iface.node;
	}
};

let handlers = Blackprint.Code.handlers = {};
Blackprint.Code.registerHandler = function(handler){
	if(window.sf?.Obj != null){
		sf.Obj.set(handlers, handler.languageId, handler);
	}
	else handlers[handler.languageId] = handler;

	EntryPointNode.prototype[handler.languageId] = handler.entryPointNode;
}

// Declare function by assigning from the prototype to enjoy hot reload
Blackprint.Code.prototype._generateFor = function(fnName, language, routes, ifaceIndex){
	if(this[language] == null)
		throw new Error(`The registered code for "${this.iface.namespace}" doesn't have handler for "${language}" languange`);

	let data = this[language](routes);
	let ret = {};

	data.code = tidyLines(data.code);
	handlers[language].onNodeCodeGenerated(ret, {
		data, functionName, routes, ifaceIndex
	});

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

	if(handlers[language] == null)
		throw new Error(`Code generation for '${language}' language is not implemented yet`);

	let sharedData = {code: {}, nodes: [], variabels: new Map(), currentRoute: 0};
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

	return handlers[language].finalCodeResult(exportName, sharedData, generated);
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
	let selfRun = '';
	let wrapper = handlers[language].routeFunction || '';
	wrapper = wrapper.replace(/{{\+bp current_route_name }}/g, sharedData.currentRoute);

	let codes = [];
	let variabels = sharedData.variabels;
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
		let result = {codes, selfRun: ''};
		generatePortsStorage({
			functionName: fnName, iface, ifaceIndex,
			ifaceList, variabels, selfRun, sharedData, result,
		});

		selfRun += result.selfRun;

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