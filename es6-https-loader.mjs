// Modified from https://nodejs.org/api/esm.html#esm_https_loader
import https from 'https';
import readline from 'readline';
import fs from 'fs';

export function resolve(specifier, context, defaultResolve) {
	const { parentURL = null } = context;

	// Normally Node.js would error on specifiers starting with 'https://', so
	// this hook intercepts them and converts them into absolute URLs to be
	// passed along to the later hooks below.
	if(specifier.startsWith('https://'))
		return { url: specifier };
	else if(parentURL && parentURL.startsWith('https://'))
		return { url: new URL(specifier, parentURL).href };

	// Let Node.js handle all other specifiers.
	return defaultResolve(specifier, context, defaultResolve);
}

export function getFormat(url, context, defaultGetFormat) {
	// This loader assumes all network-provided JavaScript is ES module code.
	if(url.startsWith('https://'))
		return { format: 'module' };

	// Let Node.js handle all other URLs.
	return defaultGetFormat(url, context, defaultGetFormat);
}

function request(url, callback) {
	readline.clearLine(process.stdout, 0);
	readline.cursorTo(process.stdout, 0, null);
	process.stdout.write(`[Downloading] ${url}\r`);

	https.get(url, function(response){
		if(response.headers.location)
			request(response.headers.location, callback);
		else callback(response);
	})
	.on('error', function(msg){
		console.error("Get an error when loading", url, ":\n", msg);
	});
}

export function getSource(url, context, defaultGetSource) {
	// For JavaScript to be loaded over the network, we need to fetch and return it.
	if (url.startsWith('https://')) {
		let dir = url.slice(8).replace(/\\/g, '/').replace(/[*"|:?<>]/g, '-');

		if(dir.includes('/../')){
			console.error("/../ currently not allowed");
			throw new Error("Can't import module");
		}

		dir = dir.split('/');
		let fileName = dir.pop();

		if(dir.includes('')){
			console.error("The URL address was invalid");
			throw new Error("Can't import module");
		}

		dir.unshift('.', 'node_modules'); //> ./node_modules/
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
							if(!fs.existsSync(dir))
								fs.mkdirSync(dir, {recursive: true});

							fs.writeFile(dir+`/${fileName}`, data, (err) => {
								if(err)
									console.log("Error writing cache for", url, 'with message:\n', err);

								resolve({ source: data });
							});
						});
					});
				}

				resolve({ source: data });
			});
		});
	}

	// Let Node.js handle all other URLs.
	return defaultGetSource(url, context, defaultGetSource);
}