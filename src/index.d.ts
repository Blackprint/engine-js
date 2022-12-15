// Type definitions for Blackprint Engine
// Project: https://github.com/Blackprint/engine-js
// Module: @blackprint/engine

export namespace Types {
	/** Allow any type as port type */
	export let Any: object;

	/**
	 * [Experimental] May get deleted/changed anytime
	 * Port's type can be assigned and validated later
	 * This port will accept any port for initial connection
	 * Currently only for output port
	 */
	export let Slot: object;

	/** Only can be passed to Output port as type */
	export let Route: object;
}

/**
 * Change global Blackprint settings
 * @param which setting name
 * @param value or data 
 */
export function settings(which: String, value: any): void;

type ModuleContext = {
	[key: string]: any;
	IFace: any;
	VirtualType: (originalType: object, virtualName: String | Array<String>) => any;
}

/**
 * Create shared context for a module
 * @param name desc
 */
export function createContext(name: String): ModuleContext;

/**
 * Wait and get module's shared context that being created on different .js file
 * @param name desc
 */
export function getContext(name: String): Promise<ModuleContext>;

/**
 * Create an object that extend Blackprint object with additional options.
 * @param options desc
 */
export function loadScope(options: {url: String, css?: Boolean}): any;

/**
 * Block module loading that are not from the list
 * @param list [...URL], '*' allow all, 'false' disable this feature
 */
export function allowModuleOrigin(list: Array<String> | '*' | false): void;

/** Set this to false if you don't want to load .sf.js and .sf.css when loading module */
export let loadBrowserInterface: Boolean;

/**
 * Load nodes module from URL
 * @param url URL to the .mjs file
 * @param options 'loadBrowserInterface' Set this to false if you don't want to load .sf.js and .sf.css when loading module
 */
export function loadModuleFromURL(url: String | Array<String>, options?: {
	loadBrowserInterface: Boolean,
}): Promise<any>;

/**
 * Dynamically delete all nodes that was registered from an URL that pointing to .mjs file
 * @param url URL to the .mjs file
 */
export function deleteModuleFromURL(url: String): void;

export namespace Port {
	/**
	 * This port can contain multiple cable as input and the input port will return an array
 	 * it's only one type, not union
 	 * for union port, please split it to different port to handle it
	 * @param type Type Data that allowed for the Port 
	 */
	export function ArrayOf(type: Array<any>): any;

	/**
	 * This port can have default value if no cable was connected
	 * @param type Type Data that allowed for the Port 
	 * @param value default value when no cable was connected
	 */
	export function Default(type: any, value: any): any;

	/**
	 * This port will be used as a trigger or callable input port
	 * @param func callback when the port was being called as a function 
	 */
	export function Trigger(func: Function): any;

	/**
	 * This port can allow multiple different types
	 * like an 'any' port, but can only contain one value
	 * @param types Allowed data types
	 */
	export function Union(types: Array<any>): any;

	/**
	 * This port can allow multiple different types
	 * like an 'any' port, but can only contain one value
	 * @param type Type data of the original data
	 */
	export function StructOf(type: any, struct: {
		[key: string]: {
			/* Type data of the splitted port */
			type: any,
			/* Data handler for this specific port */
			handle?: Function,
			/* Obtain data from a field for this specific port */
			field?: String,
		}
	}): any;

	/**
	 * This only exist on JavaScript, just like a typed string or other typed primitives
	 * Mostly can be useful for Blackprint Sketch as a helper/shortcut when creating nodes
	 * @param originalType Original type class
	 * @param virtualName Custom virtual name for the specified context
	 * @param context A context where this virtual type will be registered
	 */
	export function VirtualType(originalType: any, virtualName: String | Array<String>, context: Object): any;
}

/**
 * This function need to be replaced if you want to use this to solve conflicting nodes
 * - if throw error it will stop the import process
 * @param map Conflicting module map
 * @returns [ToDo] you may need to return String or the modified map
 */
export function onModuleConflict(map: Map<string, string>): Promise<any>;

/**
 * Register nodes to Blackprint (For browser and non-browser).
 * @param namespace Node namespace
 * @param class_ Class that extends Blackprint.Node, leave this parameter empty if you want to use decorator
 */
export function registerNode(namespace: String, class_?: Function): Function;

/**
 * Register interface to Blackprint (For browser and non-browser).
 * If you're creating Sketch UI, you will need to register with Blackprint.Sketch.registerInterface too.
 * @param icNamespace Interface component's namespace, must be started with "BPIC/"
 * @param class_ Class that extends Blackprint.Interface, leave this parameter empty if you want to use decorator
 */
export function registerInterface(icNamespace: String, class_?: Function): Function;

export namespace Environment {
	/**
	 * Blackprint's environment variables
	 * You can use this object to obtain value
	 * To set value, you must use .set() function
	 */
	export let map: {[key: string]: string};

	/** 
	 * Change this to false if you want to load module from node_modules
	 * This will default to true if running on Browser/Deno
	 * and false if running on Node.js
	 */
	export let loadFromURL: Boolean;

	/** This will be true if current environment is Browser */
	export let isBrowser: Boolean;

	/** This will be true if current environment is Node.js */
	export let isNode: Boolean;

	/** This will be true if current environment is Deno */
	export let isDeno: Boolean;

	/**
	 * Assign object value to Blackprint environment variables
	 * @param obj List of environment variables in key-value object
	 */
	function _import(obj: {[key: string]: string}): void;
	export { _import as import };

	/**
	 * Set Blackprint environment variable
	 * @param key variable name
	 * @param value variable value in string
	 */
	export function set(key: string, value: string): void;

	/**
	 * Delete Blackprint environment variable
	 * @param key variable name
	 */
	function _delete(key: string): void;
	export { _delete as delete };
}

export namespace utils {
	/**
	 * Use this to rename a class name.
	 * This can help you fix your class name if it's being minified by compiler.
	 * @param obj List of class that will be renamed, with format {"name": class}
	 */
	export function renameTypeName(obj: {[name: string]: Function}): void;

	/**
	 * Use this to determine if the version is newer or older.
	 * Can only work if the URL contains semantic versioning like '/nodes@1.0.0/file.mjs'
	 * @param old CDN URL to the .mjs file
	 * @param now CDN URL to the .mjs file
	 */
	export function packageIsNewer(old: string, now: string): Boolean;

	/**
	 * Use this to make a class prototype enumerable.
	 * For example you're creating a class with getter/setter that was not enumerable by default.
	 * @param class_ class declaration that want to be modified
	 * @param props property that want to be modified
	 */
	export function setEnumerablePrototype(class_: Function, props: {[key: string]: Boolean}): void;
}

type EventOptions = {
	/** Give unique ID for the listener */
	slot?: string,
};

/** Simplified event emitter */
declare class CustomEvent {
	/**
	 * Listen to an event
	 * @param eventName event name
	 * @param callback function that will be triggered each time an event is emitted
	 * @param options additional registration options
	 */
	on(eventName: string, callback: (data?: object) => void, options?: EventOptions): void;

	/**
	 * Listen to an event and remove after being triggered once
	 * @param eventName event name
	 * @param callback function that will be triggered each time an event is emitted
	 * @param options additional registration options 
	 */
	once(eventName: string, callback: (data?: object) => void, options?: EventOptions): any;

	/**
	 * Unlisten to an event
	 * @param eventName event name
	 * @param callback function that will be triggered each time an event is emitted
	 * @param options additional registration options 
	 */
	off(eventName: string, callback: (data?: object) => void, options?: EventOptions): any;

	/**
	 * Emit an event
	 * @param eventName event name
	 * @param obj single data object that will be passed to event listener
	 */
	emit(eventName: string, obj?: object): any;
}

/** Blackprint Engine Instance (for browser or non-browser) */
export class Engine extends CustomEvent {
	ifaceList: Array<Interface>;
	iface: {[id: string]: Interface};
	functions: {[id: string]: any}; // ToDo
	variables: {[id: string]: any}; // ToDo

	/**
	 * Delete one of current instance's node
	 * @param iface interface object
	 */
	deleteNode(iface: Interface): void;

	/** Clear current instance's nodes */
	clearNodes(): void;

	/**
	 * Import nodes structure and connection from JSON
	 * @param json JSON data
	 * @param options additional options for importing JSON data
	 */
	importJSON(json: string | object, options?: {
		/** Set this to false if you want to clear current instance before importing */
		appendMode?: Boolean,
		/** Skip importing environment data if exist on the JSON */
		noEnv?: Boolean,
		/** Skip importing module URL (in case if you already imported the nodes from somewhere) */
		noModuleJS?: Boolean,
	}): Promise<Array<Interface>>;

	/**
	 * Get list of nodes that created from specific namespace
	 * @param namespace Node namespace
	 */
	getNodes(namespace: string): Node;

	/**
	 * Create a node from a namespace
	 * @param namespace Node namespace
	 * @param options additional options
	 */
	createNode(namespace: string, options?: {
		data?: object,
		x?: number,
		y?: number,
		id?: number,
	}): Interface;

	/**
	 * Create variable node
	 * @param id variable id/name
	 * @param options additional options
	 */
	createVariable(id: string, options?: object): void; // ToDo

	/**
	 * Create function node
	 * @param id function id/name
	 * @param options additional options
	 */
	createFunction(id: string, options?: object): void; // ToDo

	/** Clean instance and mark as destroyed */
	destroy(): void;

	/** Node ID was added/changed/removed */
	on(eventName: 'node.id.changed', callback: (data: { iface: Interface, from: String, to: String }) => void): void;
	/** A cable was disconnected or deleted */
	on(eventName: 'cable.disconnect', callback: (data: { port: IFacePort, target?: IFacePort, cable: Cable }) => void): void;
	/** A cable was connected between two port */
	on(eventName: 'cable.connect', callback: (data: { port: IFacePort, target: IFacePort, cable: Cable }) => void): void;
}

export namespace Engine {
	export { CustomEvent };
}

/** New module registration */
export function on(eventName: 'module.added', callback: (data: { url: String }) => void): void;
/** A registered module was updated */
export function on(eventName: 'module.update', callback: () => void): void;
/** Module registration was deleted */
export function on(eventName: 'module.delete', callback: (data: { url: String }) => void): void;
/** Imported new environment variables */
export function on(eventName: 'environment.imported', callback: () => void): void;
/** New environment variable was added */
export function on(eventName: 'environment.added', callback: (data: { key: String, value: String }) => void): void;
/** Environment variable data was changed */
export function on(eventName: 'environment.changed', callback: (data: { key: String, value: String }) => void): void;
/** Environment variable data was renamed */
export function on(eventName: 'environment.renamed', callback: (data: { old: String, now: String }) => void): void;
/** Environment variable data was deleted */
export function on(eventName: 'environment.deleted', callback: (data: { key: String }) => void): void;

/** Cable that connect to node's input and output port */
declare class Cable {
	/**
	 * Currently used for internal library only, don't construct your own Cable with this constructor
	 * @param owner port owner
	 * @param target port target
	 */
	constructor(owner: IFacePort, target: IFacePort);

	/** This will be defined after connected to input and output */
	input: IFacePort;

	/** This will be defined after connected to input and output */
	output: IFacePort;

	/** Play flow animation [Timeplate animation library is needed] */
	visualizeFlow(): void;

	/** Get value from connected output port */
	get value(): any;

	/**
	 * Activate or disable this cable
	 * @param enable undefined (mark as inactive), false (disconnect), true (enabled)
	 */
	activation(enable?: undefined | Boolean): void;

	/**
	 * Disconnect and destroy a cable
	 */
	disconnect(): void;
}

export type { Cable };

/** Interface Port that contains connection data */
export class IFacePort {
	/** List of connected cables */
	cables: Array<Cable>;
	/** Node interface's reference */
	iface: Interface;
	/** Allow this port to trigger update of other node even the output value is similar */
	allowResync: Boolean;
	/** Port's name */
	name: String;
	/** Return true if this was route port */
	isRoute: Boolean;
	source: 'input' | 'output';
	/** Port's type */
	readonly type: object;
	/** Return true if port from StructOf was splitted to multiple port */
	readonly splitted: Boolean;

	// sync: Boolean;
	// disabled: Boolean;

	/**
	 * You mustn't use this class to manually construct interface port
	 * But please use 'iface.node.createPort()' instead
	 * @param node
	 */
	constructor();

	/**
	 * Disconnect all cables that was connected to this port
	 */
	disconnectAll(): void;

	/**
	 * Disable current cable from being connected or data transfer
	 * @param enable
	 */
	disableCables(enable: Boolean): void;

	/**
	 * [Experimental] May get deleted/changed anytime
	 * Assign new type for this port
	 * Can only be used if this port is using 'Any' type since created
	 * @param type Type object that will be assigned for this port
	 */
	assignType(type: any): void;

	/**
	 * Connect this port with a cable
	 * @param cable desc
	 */
	connectCable(cable: Cable): Boolean;

	/**
	 * Connect this port to other port
	 * @param port other port
	 */
	connectPort(port: IFacePort): Boolean;

	/** There are value update on the port */
	on(eventName: 'value', callback: (data: InputPort_EventValue | OutputPort_EventValue) => void): void;
	/** The Port.Trigger or port with Function type was called */
	on(eventName: 'call', callback: () => void): void;
	/** A cable is trying to connect for the port */
	on(eventName: 'connecting', callback: (data: { target: IFacePort, activate: (activate?: true | false) => void }) => void): void;
	/** An cable was connected from the port */
	on(eventName: 'connect', callback: (data: { port: IFacePort, target: IFacePort, cable: Cable }) => void): void;
	/** An cable was disconnected from the port */
	on(eventName: 'disconnect', callback: (data: { port: IFacePort, target?: IFacePort, cable: Cable }) => void): void;
}

declare type InputPort_EventValue = { port: IFacePort, target: IFacePort, cable: Cable };
declare type OutputPort_EventValue = { port: IFacePort };

declare type References = {
	/** Input port's interfaces */
	IInput: {[key: string]: IFacePort},
	/** Output port's interfaces */
	IOutput: {[key: string]: IFacePort},

	/** Input port's values */
	Input: {[key: string]: any},
	/** Output port's values */
	Output: {[key: string]: any},
}

/** Interface/IFace that can be used to control nodes */
export class Interface extends CustomEvent {
	/** Node's title */
	title: String;
	/** Node's namespace */
	namespace: String;
	/** Node reference */
	node: Node;
	/** Input port's interface */
	input: IFacePort;
	/** Output port's interface */
	output: IFacePort;
	/** This will return true if still importing the node */
	importing: Boolean;

	// /** Node's type */
	// type: 'event' | 'function' | 'general';

	/** References */
	ref: References;

	/** Additional properties */
	[key: string]: any;

	/**
	 * You mustn't use this class to manually construct nodes
	 * But please use 'instance.createNode()' instead
	 * @param node
	 */
	constructor(node: Node);

	/** Hide every port that doesn't have connected cable */
	hideUnusedPort: Boolean;

	/**
	 * Node's ID
	 * After assigned, you can get this node by using `instance.iface[ID]`
	 */
	id: string;

	// /**
	//  * Node's index (Assigned by engine since created)
	//  * You can get this node by using `instance.ifaceList[index]`
	//  */
	// readonly i: number;

	/**
	 * This function will be called once the nodes has been created and the cables has been connected
	 * @override you can override/replace this functionality on your class
	 */
	init(): void;

	 /**
	  * This function will be called before init, where this node still not connected to any cables
	  * @override you can override/replace this functionality on your class
	  * @param data Data that was passed when importing JSON or creating new node
	  */
	imported(data: Object): void;

	/** Two ports were connected with a cable */
	on(eventName: 'cable.connect', callback: (data: { port: IFacePort, target: IFacePort, cable: Cable }) => void): void;
	/** Two ports get disconnected each other */
	on(eventName: 'cable.disconnect', callback: (data: { port: IFacePort, target: IFacePort, cable: Cable }) => void): void;
	/** There's new value update coming from output port */
	on(eventName: 'port.value', callback: (data: { port: IFacePort, target: IFacePort, cable: Cable }) => void): void;
}

/** Can be used to show information for nodes in Sketch */
declare class Decoration {
	/**
	 * Display toast above the node
	 * @param type toast type
	 * @param msg toast message
	 */
	headInfo(type: any, msg: any): any;

	/**
	 * Display info toast above the node
	 * @param msg toast message
	 */
	info(msg: any): any;

	/**
	 * Display warning toast above the node
	 * @param msg toast message
	 */
	warn(msg: any): any;

	/**
	 * Display error toast above the node
	 * @param msg toast message
	 */
	error(msg: any): any;

	/**
	 * Display success toast above the node
	 * @param msg toast message
	 * @param timeout default to 5000 (5sec)
	 */
	success(msg: any, timeout?: any): any;
}

export type { Decoration };

/** Blackprint Node */
export class Node {
	/**
	 * Set this to true if you want .update function being called for every data changes from different input port
	 */
	partialUpdate: Boolean;

	/** References */
	ref: References;

	/** Interface reference */
	iface: Interface;
	/** Input port's value */
	input: {[key: string]: any};
	/** Output port's value */
	output: {[key: string]: any};

	/** Engine instance */
	instance: Engine;

	// disablePorts: Boolean;
	// partialUpdate: Boolean;
	// syncThrottle: Boolean;
	// routes: Boolean;

	/** Additional properties */
	[key: string]: any;

	/**
	 * You mustn't use this class to manually construct Blackprint Node
	 * But please use 'instance.createNode()' instead
	 * @param instance current instance where this node was created
	 */
	constructor(instance: Engine);

	/**
	 * This must be called once to attach interface to this node
	 * @param icNamespace interface component's namespace that was declared with instance.registerInterface(), must be started with "BPIC/"
	 */
	setInterface(icNamespace?: string): Interface;

	/**
	 * This function will be called once the nodes has been created and the cables has been connected
	 * @override you can override/replace this functionality on your class
	 */
	init(): void;

	/**
	 * This function will be called before init, where this node still not connected to any cables
	 * @override you can override/replace this functionality on your class
	 * @param data Data that was passed when importing JSON or creating new node
	 */
	imported(data: Object): void;

	/**
	 * This function will be called everytime there's an update or new value from output port from other nodes
	 * But if this node has route cable, this update function will be called until this node has turn to be executed
	 * @param cable Related cable where the data flow happen, `this.partialUpdate` must be set to true to have this parameter
	 */
	update(cable: Cable): void;

	/**
	 * This function will be called if this node has a null value in output port
	 * The other node that need an input will requesting a output value from this node
	 * @param cable Related cable that calling this function
	 */
	request(cable: Cable): void;

	/**
	 * Dynamically create port to this node
	 * @param which port source
	 * @param name unique port name
	 * @param type data type (class)
	 */
	createPort(which: 'input' | 'output', name: string, type: Function): IFacePort;

	/**
	 * Dynamically rename port to this node
	 * @param which port source
	 * @param name port name
	 * @param to unique port name
	 * @returns true if successfully renamed
	 */
	renamePort(which: 'input' | 'output', name: string, to: string): Boolean;

	/**
	 * Dynamically delete port to this node
	 * @param which port source
	 * @param name port name
	 */
	deletePort(which: 'input' | 'output', name: string): void;

	/**
	 * Send data to remote nodes [Experimental] [ToDo]
	 * @param id your defined id
	 * @param data data to be send
	 */
	syncOut(id: string, data: any): void;

	/**
	 * You must replace this with your own custom function in order to receive data
	 * Receive data from remote nodes [Experimental] [ToDo]
	 * @param id your defined id
	 * @param data received data
	 */
	syncIn(id: string, data: any): void;
}

/** Fictional simple port that can be connected with other port */
declare class PortGhost extends CustomEvent {
	/** Remove data and mark this port as destroyed */
	destroy(): void;
}

/** Create fictional simple output port that can be connected to other input port */
export class OutputPort extends PortGhost {
	/**
	 * Create fictional simple output port that can be connected to other input port
	 * @param type port's data type
	 */
	constructor(type: any);

	/**
	 * Port's value
	 * Value need to be assigned before connected to other port
	 * In case you lazily assigned the value, you will need to call .sync()
	 */
	value: any;

	/** Sync value to all connected port */
	sync(): void;
	
	/** There are value update on the port */
	on(eventName: 'value', callback: (data: OutputPort_EventValue) => void): void;
	/** The Port.Trigger or port with Function type was called */
	on(eventName: 'call', callback: () => void): void;
}

/**
 * Create fictional simple input port that can be connected to other output port
 * To listen to new input value or port call please add an event listener
 * `.on('call', function(){})`
 * `.on('value', function(ev){})`
 */
export class InputPort extends PortGhost {
	/**
	 * Create fictional simple input port that can be connected to other output port
	 * @param type port's data type
	 */
	constructor(type: any);
	
	/** There are value update on the port */
	on(eventName: 'value', callback: (data: InputPort_EventValue) => void): void;
	/** The Port.Trigger or port with Function type was called */
	on(eventName: 'call', callback: () => void): void;
}

declare class RoutePort_1 {
	/** [Experimental] [ToDo] */
	pause(): any;

	/** [Experimental] [ToDo] */
	unpause(): any;

	/**
	 * Create cable from this port
	 * @param event [ToDo]
	 */
	createCable(event: any): any;

	/**
	 * Connect current output route to other node
	 * @param iface [ToDo]
	 */
	routeTo(iface: Interface): Boolean;

	/**
	 * Connect route cable to this port
	 * @param cable a cable that was created form route port
	 */
	connectCable(cable: Cable): Boolean;

	/** This will be called when this node '.update' has turn to be executed */
	routeIn(): Promise<any>;

	/** This will be called after '.update' has been executed */
	routeOut(): Promise<any>;
}

/** Can be used to control data flow between nodes */
declare class RoutePort extends RoutePort_1 {
	/**
	 * @param iface
	 */
	constructor(iface: Interface);
}

export type { RoutePort };

/**
 * [Experimental] [ToDo]
 * 
 * module @blackprint/remote-control is required
 */
declare class RemoteBase {
	/**
	 * ToDo
	 * @param instance desc
	 */
	constructor(instance: any);

	/**
	 * ToDo
	 * @param json desc
	 */
	onImport(json: any): Promise<any>;

	/**
	 * ToDo
	 * @param urls desc
	 */
	onModule(urls: any): Promise<any>;

	/**
	 * ToDo
	 * @param data desc
	 */
	onSyncOut(data: any): any;

	/** ToDo */
	importRemoteJSON(): Promise<any>;

	/** ToDo */
	syncModuleList(): any;

	/** ToDo */
	destroy(): any;

	/** ToDo */
	disable(): any;

	/** ToDo */
	clearNodes(): any;
}

/**
 * [Experimental] [ToDo]
 * 
 * module @blackprint/remote-control is required
 */
export class RemoteControl extends RemoteBase {
	/**
	 * ToDo
	 * @param instance desc
	 */
	constructor(instance: any);

	/** ToDo */
	sendSketchToRemote(): Promise<any>;

	/**
	 * ToDo
	 * @param instant desc
	 */
	saveSketchToRemote(instant: any): Promise<any>;

	/**
	 * ToDo
	 * @param data desc
	 * @param options desc
	 * @param noSync desc
	 * @param force desc
	 */
	importJSON(data: any, options: any, noSync: any, force: any): Promise<any>;

	/**
	 * ToDo
	 * @param data desc
	 */
	onSyncIn(data: any): Promise<any>;
}

/**
 * [Experimental] [ToDo]
 * 
 * module @blackprint/remote-control is required
 */
export class RemoteEngine extends RemoteBase {
	/**
	 * ToDo
	 * @param instance desc
	 */
	constructor(instance: any);

	/**
	 * ToDo
	 * @param data desc
	 */
	onSyncIn(data: any): Promise<any>;
}