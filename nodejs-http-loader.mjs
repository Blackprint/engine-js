// Modified from https://nodejs.org/api/module.html#import-from-https
import https from 'https';
import http from 'http';
import readline from 'readline';
import fs from 'fs';

function isMatch(url){
	return /^(http:\/\/localhost:|http:\/\/localhost\/|https:\/\/).*?\.(js|mjs)$/m.test(url);
}

export function resolve(specifier, context, nextResolve) {
	const { parentURL = null } = context;

	// Normally Node.js would error on specifiers starting with 'https://', so
	// this hook intercepts them and converts them into absolute URLs to be
	// passed along to the later hooks below.
	if(isMatch(specifier))
		return { shortCircuit: true, url: specifier };
	else if(parentURL && isMatch(parentURL))
		return { shortCircuit: true, url: new URL(specifier, parentURL).href };

	// Let Node.js handle all other specifiers.
	return nextResolve(specifier, context);
}

export function load(url, context, nextLoad) {
	// For JavaScript to be loaded over the network, we need to fetch and return it.
	if (!url.startsWith('file:') && isMatch(url)) {
		let dir = url.replace(/(https|http):\/\//, '').replace(/\/\//, '').replace(/\\/g, '/').replace(/[*"|:<>]/g, '-').replace(/[?#].*?$/m, '');

		if(dir.includes('/../')){
			console.log(dir);
			console.error("/../ currently not allowed");
			throw new Error("Can't import module");
		}

		dir = dir.split('/');
		let fileName = dir.pop();

		if(dir.includes('')){
			console.error("The URL address was invalid");
			throw new Error("Can't import module");
		}

		dir.unshift('.', '.bp_cache', 'modules'); //> ./.bp_cache/modules
		dir = dir.join('/');

		if(fileName.includes('.') === false)
			fileName += '_.js';
		else if(fileName === '')
			fileName = 'index.js';

		return new Promise((resolve, reject) => {
			fs.readFile(dir+`/${fileName}`, (err, data) => {
				if(err){
					return request(url, (res) => {
						let data = '';

						res.on('data', (chunk) => data += chunk)
						.on('error', console.log)
						.on('end', () => {
							if(!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});

							fs.writeFile(dir+`/${fileName}`, data, (err) => {
								if(err)
									console.log("Error writing cache for", url, 'with message:\n', err);
								else{
									readline.clearLine(process.stdout, 0);
									readline.cursorTo(process.stdout, 0, null);
									process.stdout.write(' '.repeat(14+url.length)+`\r`);
								}

								resolve({ format: 'module', shortCircuit: true, source: data });
							});
						});
					});
				}

				resolve({ format: 'module', shortCircuit: true, source: data });
			});
		});
	}

	// Let Node.js handle all other URLs.
	return nextLoad(url, context);
}



export function request(url, callback) {
	readline.clearLine(process.stdout, 0);
	readline.cursorTo(process.stdout, 0, null);
	process.stdout.write(`\x1b[1;32m[Downloading]\x1b[0m ${url}\r`);

	let loader = https;
	if(url.startsWith('http://')){
		if(!isMatch(url)) throw new Error("URL must use https or localhost");
		loader = http;
	}

	loader.get(url, function(response){
		if(response.headers.location)
			request(response.headers.location, callback);
		else callback(response);
	})
	.on('error', function(msg){
		console.error("Get an error when loading", url, ":\n", msg);
	});
}