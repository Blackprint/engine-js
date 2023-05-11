class EntryPointNode extends Blackprint.Code {
	static routeIn = Blackprint.CodeRoute.Optional;
	static routeOut = Blackprint.CodeRoute.MustHave;
}
Blackprint.registerCode('BP/Event/Listen', EntryPointNode);

Blackprint.Code.registerHandler({
	languageName: 'JavaScript',
	languageId: 'js',

	routeFunction: `function bp_route_{{+bp current_route_name }}(){\n{{+bp wrap_code_here }}\n}`,

	// namespace: BP/Event/Listen
	entryPointNode(routes){
		let name = this.iface.data.namespace.replace(/\W/g, '_');

		return {
			type: Blackprint.CodeType.Wrapper,
			begin: `exports.${name} = function(Input){`,
			end: `}`,
		};
	},

	generatePortsStorage({
		functionName, iface, ifaceIndex, ifaceList, variabels, selfRun, sharedData, result
	}){
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

				let targets = [];
				let cables = port.cables;
				for (let i=0; i < cables.length; i++) {
					let inp = cables[i].input;
					if(inp == null) continue;

					let targetIndex = ifaceList.indexOf(inp.iface);
					let propAccessName = /(^[^a-zA-Z]|\W)/m.test(inp.name) ? JSON.stringify(inp.name) : inp.name;

					propAccessName = propAccessName.slice(0, 1) === '"' ? '['+propAccessName+']' : '.'+propAccessName;
					targets.push(`bp_input_${targetIndex + propAccessName}`);
				}

				if(port.type !== Function){
					portIndex++;
					if(targets.length !== 0)
						outputs.push(`set ${portName}(val){ ${targets.join('\n')} = this._${portIndex} = val; }`);

					outputs.push(`get ${portName}(){ return this._${portIndex}; }`);
				}
				else {
					outputs.push(`${portName}(){
						${targets.join('();\t\n')}();
					}`.replace(/^					/gm, ''));
				}
			}
		}

		if(!variabels.has(ifaceIndex))
			variabels.set(ifaceIndex, `let bp_input_${ifaceIndex} = {${inputs.join(', ')}}; let bp_output_${ifaceIndex} = {${outputs.join(', ')}};`);

		if(selfRun){
			result.selfRun += `${functionName}(bp_input_${ifaceIndex}, bp_output_${ifaceIndex}, {Out(){ bp_route_${sharedData.currentRoute}(); }});`;
		}
		else if(iface.type !== 'event'){
			result.codes.push(`${functionName}(bp_input_${ifaceIndex}, bp_output_${ifaceIndex});`.replace(/^			/gm, ''));
		}
	},

	// This will be called everytime code was generated for a node
	onNodeCodeGenerated(result, { data, functionName, routes, ifaceIndex }){
		if(data.type === Blackprint.CodeType.Callback){
			result.code = `function ${functionName}(Input, Output, Route){\n\t${data.code.replace(/\n/g, '\n\t')}\n}`;
			result.selfRun = data.selfRun;

			if(result.selfRun && this.constructor.routeIn === Blackprint.CodeRoute.MustHave)
				throw new Error(`'selfRun' code can't be used for node that using "CodeRoute.MustHave" for input route`);
		}
		else if(data.type === Blackprint.CodeType.Wrapper)
			result.code = `${data.begin}\n\tbp_output_${ifaceIndex} = Input;\n{{+bp wrap_code_here }}\n${data.end}`;

		// Default
		else result.code = `function ${functionName}(Input, Output){ ${data.code} }`;
	},

	// You can wrap the generated code from here
	finalCodeResult(exportName, sharedData, generatedCode){
		if(/(^[^a-zA-Z]|\W)/m.test(exportName)) throw new Error("Export name is a invalid variable name for JavaScript");

		let inits = `let ${exportName} = (function(){`;
		inits += `\n\tlet exports = {};`;
		inits += `\n\t${[...sharedData.variabels.values()].join('\n\t')};`;

		let body = ((Object.values(sharedData.code).join('\n') + '\n\n' + generatedCode).trim()).replace(/\n/g, '\n\t');

		return inits + '\n\n\t' + body + `\n\treturn exports;\n})();`;
	},
});