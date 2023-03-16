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
	settings,
	createContext,
	getContext,
	loadScope,
	allowModuleOrigin,
	Sketch,
	Port,
	loadModuleFromURL,
	nodes,
	Node,
	registerNode,
	registerInterface,
	Interface,
	Engine,
	Environment,
	utils,
	OutputPort,
	InputPort,
} = module.exports;

export default globalThis.Blackprint;
export {
	settings,
	createContext,
	getContext,
	loadScope,
	allowModuleOrigin,
	Sketch,
	Port,
	loadModuleFromURL,
	nodes,
	Node,
	registerNode,
	registerInterface,
	Interface,
	Engine,
	Environment,
	OutputPort,
	InputPort,
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

//> ./dist/codegen.min.js
fixDenoExports('codegen', 'let module={exports:{}};', `
const {
	Code, CodeType, CodeRoute, registerCode,
} = module.exports;

export default globalThis.Blackprint;
export {
	Code, CodeType, CodeRoute, registerCode,
};`);