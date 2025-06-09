import * as httpLoader from "./nodejs-http-loader.mjs";
import fs from 'fs';

let instanceJS = `
import "@blackprint/engine";
let Blackprint = globalThis.Blackprint;

let allowedDomain = process.env.BLACKPRINT_ALLOWED_MODULE_ORIGIN;
if(!!allowedDomain){
	if(allowedDomain.includes('|'))
		Blackprint.allowModuleOrigin(allowedDomain.split('|'));
	else Blackprint.allowModuleOrigin(allowedDomain);
}
else Blackprint.allowModuleOrigin('*'); // Allow all origin

let instance = new Blackprint.Engine();
instance.importJSON(%json_here%);
export default instance;

let {
	variables,
	functions,
	events,
	ref,
} = instance;

export {
	instance,
	variables,
	functions,
	events,
	ref,
};

await instance.ready();
`;

export function resolve(specifier, context, nextResolve) {
	return nextResolve(specifier, context);
	if(/.*\.(bpi)($|\?|#)$/m.test(specifier)) return { shortCircuit: true, url: specifier };
	return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
	if(/.*\.(bpi)($|\?|#)$/m.test(url)) {
		return new Promise((resolve, reject) => {
			function buildInstance(json){
				let temp = JSON.parse(json);
				if(temp.instance == null) throw new Error("Blackprint instance file is not valid: " + url);

				resolve({
					format: 'module',
					shortCircuit: true,
					source: instanceJS.replace('%json_here%', JSON.stringify(json)),
					responseURL: url,
				});
			}

			if(!url.startsWith('file://')){
				return httpLoader.request(url, (res) => {
					let data = '';

					res.on('data', (chunk) => data += chunk)
						.on('error', console.log)
						.on('end', () => { buildInstance(data) });
				});
			}

			fs.readFile(new URL(url), 'utf8', (err, data) => {
				if(err) throw err;
				buildInstance(data);
			});
		});
	}
	else return nextLoad(url, context);
}