Blackprint.DepsLoader ??= {
	// can be override if needed
	async NodeModulesResolver(name, type){
		if(type === 'js') return await import(name);
		return false; // Can't handle this
	},

	// can be override if needed
	async URLResolver(url, type){ return url; },

	async WindowResolver(name, recheck=false){
		return Blackprint._utils.getDeepProperty(globalThis, name.split('.'));
	},

	/**
	 * Prioritize window first, if exist then skip
	 * if not exist then check local, if not exist then try to access from CDN
	 */
	async js({ window: window_, local, cdn, optional = false }){
		let resolved = [];
		let unresolved = [];

		if(window_ != null) for (let i=0; i < window_.length; i++) {
			resolved[i] ??= await this.WindowResolver(window_[i]);
			if(!resolved[i]) unresolved[i] = window_[i];
		}

		if(Blackprint.Environment.loadFromNodeModules && local != null){
			for (let i=0; i < local.length; i++) {
				try {
					resolved[i] ??= await this.NodeModulesResolver(local[i], 'js');
					unresolved[i] = null;
				} catch(e) {
					unresolved[i] = local[i];
				}
			}
		}

		if(Blackprint.Environment.loadFromURL && cdn != null){
			let refCopy = {};
			let copy = [];
			for (let i=0; i < cdn.length; i++) {
				if(resolved[i]) continue;
				refCopy[copy.length] = i;

				let url = await this.URLResolver(cdn[i], 'js');
				if(!url) continue;

				copy.push(url);
			}

			let resolves = [];
			if(globalThis.sf != null)
				resolves = await sf.loader.mjs(copy, {ordered: true});
			else for (let i=0; i < copy.length; i++) {
				try {
					resolves[i] ??= await import(copy[i]);
					resolves[i] ??= true; // set to true if imported but has no value
				} catch (e) {
					unresolved[i] = copy;
				}
			}

			for (let i=0; i < resolves.length; i++) {
				let actualIndex = refCopy[i];
				resolved[actualIndex] = resolves[i] ?? await this.WindowResolver(window_[actualIndex]);
				if(resolved[actualIndex]) unresolved[actualIndex] = null;
			}
		}

		unresolved = unresolved.filter(v => v != null);
		if(unresolved.length && !optional) {
			console.error("Unable to resolve module from: " + JSON.stringify(unresolved, null, 2));
		}

		for (let i=0; i < resolved.length; i++) {
			let isEmpty = true;
			let temp = resolved[i];
			for (let key in temp) { isEmpty = false; break; }

			if(isEmpty) resolved[i] = temp = await this.WindowResolver(window_[i]);
			if(temp && temp.default != null) resolved[i] = temp.default;
		}

		return resolved;
	},
	css({ local, cdn }){
		cdn = cdn.slice(0);

		// We don't need to load CSS for non-browser environment
		if(!Blackprint.Environment.isBrowser) return;

		setTimeout(async () => {
			if(Blackprint.Environment.loadFromNodeModules && local != null){
				for (let i=0; i < local.length; i++) {
					let resolved = await this.NodeModulesResolver(local[i], 'css');
					if(resolved) cdn.splice(i, 1); // We don't need to load again from URL
				}
			}

			if(Blackprint.Environment.loadFromURL && cdn != null){
				if(globalThis.sf != null){
					for (let i=0; i < cdn.length; i++) {
						cdn[i] = await this.URLResolver(cdn[i], 'css');
					}
					await sf.loader.css(cdn);
				}
			}
		});
	},
};