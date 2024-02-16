let fs = require('fs');
fs.mkdirSync('./dist');

function fixDenoExports(distFile, prepend, append){
	let compiled = fs.readFileSync(`../dist/${distFile}.min.js`, 'utf8');

	// Copy file to dist folder
	fs.writeFileSync(`./dist/${distFile}.min.js`, compiled);
	fs.writeFileSync(`./dist/${distFile}.min.js.map`, fs.readFileSync(`../dist/${distFile}.min.js.map`, 'utf8'));

	if(!compiled.includes(' MIT Licensed */'))
		throw new Error("Can't find template when copying the compiled module for '"+distFile+".es6.js'");

	compiled = compiled.replace(' MIT Licensed */', ' MIT Licensed */ ' + prepend);

	if(!compiled.includes('//# sourceMappingURL='+distFile+'.min.js.map'))
		throw new Error("Can't find template when copying the compiled module for '"+distFile+".es6.js'");

	compiled = compiled.replace('//# sourceMappingURL='+distFile+'.min.js.map', `${append}\n//# sourceMappingURL=${distFile}.min.js.map`);

	fs.writeFileSync(`./dist/${distFile}.mjs`, compiled);
}

//> ./dist/engine.min.js
fixDenoExports('engine', 'let module={exports:{}};', `
const {
	// Code,
	// CodeRoute,
	// CodeType,
	Engine,
	Environment,
	InputPort,
	Interface,
	Node,
	OutputPort,
	Port,
	// PuppetNode,
	// RemoteControl,
	// RemoteEngine,
	// RemoteSketch,
	RoutePort,
	// Skeleton,
	// Sketch,
	Types,
	VarScope,
	allowModuleOrigin,
	createContext,
	createVariable,
	deleteModuleFromURL,
	getContext,
	loadModuleFromURL,
	loadScope,
	modulesURL,
	nodes,
	onModuleConflict,
	// registerCode,
	registerEvent,
	registerInterface,
	registerNode,
	settings,
} = module.exports;

export default globalThis.Blackprint;
export {
	// Code,
	// CodeRoute,
	// CodeType,
	Engine,
	Environment,
	InputPort,
	Interface,
	Node,
	OutputPort,
	Port,
	// PuppetNode,
	// RemoteControl,
	// RemoteEngine,
	// RemoteSketch,
	RoutePort,
	// Skeleton,
	// Sketch,
	Types,
	VarScope,
	allowModuleOrigin,
	createContext,
	createVariable,
	deleteModuleFromURL,
	getContext,
	loadModuleFromURL,
	loadScope,
	modulesURL,
	nodes,
	onModuleConflict,
	// registerCode,
	registerEvent,
	registerInterface,
	registerNode,
	settings,
};`);



//> ./dist/skeleton.min.js
fixDenoExports('skeleton', 'let module={exports:{}};', `
const {
	Skeleton,
} = module.exports;

export default globalThis.Blackprint;
export {
	Skeleton,
};`);

//> ./dist/code-generation.min.js
fixDenoExports('code-generation', 'let module={exports:{}};', `
const {
	Code, CodeType, CodeRoute, registerCode, PuppetNode,
} = module.exports;

export default globalThis.Blackprint;
export {
	Code, CodeType, CodeRoute, registerCode, PuppetNode,
};`);