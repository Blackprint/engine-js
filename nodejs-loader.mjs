import * as es6Loader from "./es6-https-loader.mjs";
import fs from 'fs';

let instanceJS = `
let allowedDomain = process.env.BLACKPRINT_ALLOWED_MODULE_ORIGIN;
if(!!allowedDomain){
	if(allowedDomain.includes('|'))
		Blackprint.allowModuleOrigin(allowedDomain.split('|'));
	else Blackprint.allowModuleOrigin(allowedDomain);
}

let instance = new Blackprint.Engine();
instance.importJSON(%json_here%);
export default instance;

let {
	variables: Variables,
	events: Events,
	ref: Refs,
} = instance;

export {
	instance,
	Variables,
	Events,
	Refs,
};

await instance.ready();
`;

export function resolve(specifier, context, nextResolve) {
	return es6Loader.resolve(specifier, context, function() {
		if(/.*\.(bpi)($|\?|#)$/m.test(specifier)) return { shortCircuit: true, url: 'bpi://'+specifier };
		return nextResolve(specifier, context);
	});
}

export function load(url, context, nextLoad) {
	return es6Loader.load(url, context, function() {
		if(/.*\.(bpi)($|\?|#)$/m.test(url)) {
			return new Promise((resolve, reject) => {
				function buildInstance(json){
					let temp = JSON.parse(json);
					if(temp.instance == null) throw new Error("Blackprint instance file is not valid: " + url);

					resolve({
						format: 'module',
						shortCircuit: true,
						source: instanceJS.replace('%json_here%', JSON.stringify(json)),
					});
				}
				
				url = url.replace('bpi://', '');
				if(url.includes('//')){
					return es6Loader.request(url, (res) => {
						let data = '';

						res.on('data', (chunk) => data += chunk)
							.on('error', console.log)
							.on('end', () => { buildInstance(data) });
					});
				}

				fs.readFile(url, 'utf8', (err, data) => {
					if(err) throw err;
					buildInstance(data);
				});
			});
		}

		return nextLoad(url, context);
	});
}