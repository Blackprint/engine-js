class InstanceEvents extends CustomEvent {
	constructor(instance){
		super();
		this.list = {};
		this.instance = instance;
	}

	// This only available on Blackprint.Sketch
	_updateTreeList(){
		if(!this.instance.isSketch) return;
		this.totalEvent = 0;

		// Clear object by using for in to reuse the object
		let treeList = this.treeList ??= {};
		for (let key in treeList) {
			delete treeList[key];
		}

		let list = this.list;
		Object.assign(list, Blackprint._events);
		for (let key in list) {
			deepProperty(this.treeList, key.split('/'), list[key]);
			this.totalEvent++;
		}

		// Refresh ScarletsFrame's object watcher
		treeList.refresh?.();
	}

	createEvent(namespace){
		if(namespace in this.list) return;
		this.list[namespace] = new InstanceEvent({schema: {}});
		this._updateTreeList();
	}
}

class InstanceEvent {
	constructor(options){
		this.schema = options.schema;
	}
}