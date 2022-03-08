let fs = require('fs');

let compiled = fs.readFileSync('../dist/engine.min.js', 'utf8');

fs.mkdirSync('./dist');

// Copy file to dist folder
fs.writeFileSync('./dist/engine.min.js', compiled);
fs.writeFileSync('./dist/engine.min.js.map', fs.readFileSync('../dist/engine.min.js.map', 'utf8'));

if(!compiled.includes(' MIT Licensed */'))
	throw new Error("Can't find template when copying the compiled module for 'engine.es6.js'");

compiled = compiled.replace(' MIT Licensed */', ' MIT Licensed */ let module={exports:{}};');

if(!compiled.includes('//# sourceMappingURL=engine.min.js.map'))
	throw new Error("Can't find template when copying the compiled module for 'engine.es6.js'");

compiled = compiled.replace('//# sourceMappingURL=engine.min.js.map', `
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

export default window.Blackprint;
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
};

//# sourceMappingURL=engine.min.js.map`);

fs.writeFileSync('./dist/engine.es6.js', compiled);