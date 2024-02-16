import { plugin } from "bun";
import fs from "node:fs";
import readline from 'readline';

let instanceJS = `
let Blackprint = globalThis.Blackprint;
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
	ref: Ports,
} = instance;

export {
	instance,
	Variables,
	Events,
	Ports,
};

await instance.ready();
`;

// https://github.com/oven-sh/bun/blob/bfaf095c2ed2ba1f0cd35f1658e2babee8b51985/test/js/bun/plugin/plugins.test.ts#L16-L34
plugin({
	name: "HTTPS module loader",
	setup(builder) {
		builder.onResolve({ namespace: "http", filter: /.*\.(js|mjs)($|\?|#)/m }, ({ path }) => {
			return { path, namespace: "url" };
		});

		builder.onLoad({ namespace: "url", filter: /.*\.(js|mjs)($|\?|#)/m }, async ({ path, namespace }) => {			
			let dir = path.replace(/(https|http):\/\//, '').replace(/\/\//, '').replace(/\\/g, '/').replace(/[*"|:?<>]/g, '-');
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
				fs.readFile(dir+`/${fileName}`, {encoding: 'utf8'}, async (err, data) => {
					if(err){
						if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});

						// readline.clearLine(process.stdout, 0);
						// readline.cursorTo(process.stdout, 0, null);
						// process.stdout.write(`\x1b[1;32m[Downloading]\x1b[0m ${path}\r`);
						console.log(`\x1b[1;32m[Downloading]\x1b[0m ${path}`);

						let res;
						if(path.startsWith('//localhost:') || path.startsWith('//localhost/'))
							res = await fetch("http:" + path);
						else res = await fetch("https://" + path);

						data = await res.text();
						fs.writeFile(dir+`/${fileName}`, data, (err) => {
							if(err)
								console.log("Error writing cache for", url, 'with message:\n', err);
							else{
								// readline.clearLine(process.stdout, 0);
								// readline.cursorTo(process.stdout, 0, null);
								// process.stdout.write(' '.repeat(14+url.length)+`\r`);
							}

							resolve({ contents: data, loader: "js" });
						});
					}
					else resolve({ contents: data, loader: "js" });
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
						contents: instanceJS.replace('%json_here%', JSON.stringify(json)),
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