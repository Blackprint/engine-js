import { plugin } from "bun";
import fs from "node:fs";
import json5 from "json5";
import readline from 'readline';

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
await instance.importJSON(%json_here%);
export default instance;

let {
	variables,
	events,
	functions,
	ref,
} = instance;

export {
	instance,
	variables,
	events,
	functions,
	ref,
};

await instance.ready();
`;

// https://github.com/oven-sh/bun/blob/bfaf095c2ed2ba1f0cd35f1658e2babee8b51985/test/js/bun/plugin/plugins.test.ts#L16-L34
plugin({
	name: "HTTPS module loader",
	setup(builder) {
		let notHttps = [];
		builder.onResolve({ namespace: "http", filter: /.*\.(js|mjs)($|\?|#)/m }, ({ path }) => {
			notHttps.push(path);
			return { path, namespace: "url" };
		});
		builder.onResolve({ namespace: "https", filter: /.*\.(js|mjs)($|\?|#)/m }, ({ path }) => {
			return { path, namespace: "url" };
		});

		builder.onLoad({ namespace: "url", filter: /.*\.(js|mjs)($|\?|#)/m }, async ({ path: url, namespace }) => {			
			let dir = url.replace(/(https|http):\/\//, '').replace(/\/\//, '').replace(/\\/g, '/').replace(/[*"|:?<>]/g, '-');
			if(dir.includes('/../')){
				console.log(dir);
				console.error("/../ currently not allowed");
				throw new Error("Can't import module");
			}

			dir = dir.split('/');
			let fileName = dir.pop();

			if(dir.includes('')){
				console.error("The URL address was invalid:", dir);
				throw new Error("Can't import module");
			}

			dir.unshift('.', '.bp_cache', 'modules'); //> ./.bp_cache/modules
			dir = dir.join('/');

			if(fileName.includes('.') === false)
				fileName += '_.js';
			else if(fileName === '')
				fileName = 'index.js';

			return await new Promise((resolve, reject) => {
				function downloaded(data){
					if(!data.includes('export default')){
						data = 'export default 1;' + data;
					}

					resolve({ contents: data, loader: 'js' });
				}

				let path = dir + `/${fileName}`;
				fs.readFile(path, {encoding: 'utf8'}, async (err, data) => {
					if(err){
						if(!url.startsWith('http')){
							if(notHttps.includes(url))
								url = "http:" + url;
							else url = "https:" + url;
						}

						if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});

						readline.clearLine(process.stdout, 0);
						readline.cursorTo(process.stdout, 0, null);
						process.stdout.write(`\x1b[1;32m[Downloading]\x1b[0m ${path}\r`);
						// console.log(`\x1b[1;32m[Downloading]\x1b[0m ${url} => ${path}`);
						if(!url) {
							return reject(new Error("Can't download module: " + path));
						}

						let data = await (await fetch(url)).text();
						fs.writeFile(path, data, (err) => {
							if(err)
								console.log("Error writing cache for", url, 'with message:\n', err);
							else{
								readline.clearLine(process.stdout, 0);
								readline.cursorTo(process.stdout, 0, null);
								process.stdout.write(' '.repeat(14+url.length)+`\r`);
							}

							downloaded(data);
						});
					}
					else downloaded(data);
				});
			});
		});
	},
});

plugin({
	name: "Blackprint instance loader",
	setup(builder) {
		builder.onLoad({ filter: /.*?\.(bpi)($|\?|#)/m }, ({ path }) => {
			return new Promise(async resolve => {
				function buildInstance(json){
					let temp = JSON.parse(json);
					if(temp.instance == null) throw new Error("Blackprint instance file is not valid: " + url);

					resolve({
						loader: "js",
						contents: instanceJS.replace('%json_here%', json5.stringify(json)),
					});
				}

				if(path.includes('//')){
					if(path.startsWith('//localhost:') || path.startsWith('//localhost/'))
						buildInstance(await fetch("http:" + path));
					else buildInstance(await fetch("https://" + path));
				}
				else buildInstance(await Bun.file(path).text());
			});
		});
	},
});