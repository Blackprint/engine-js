// Type definitions for Blackprint Engine
// Project: https://github.com/Blackprint/engine-js
// Module: @blackprint/engine

declare module "*.bpi" {
	import { IFacePort, Engine } from "@blackprint/engine";
	import type { BPVariableList, InstanceEvents } from "@blackprint/engine";

	/** Loaded Blackprint instance */
	export let instance: Engine;
	export default instance;

	/** Variable list in the instance */
	export let Variables: {[portName: string]: BPVariableList};
	/** Event handler/emitter for the instance */
	export let Events: InstanceEvents;
	/**
	 * ```txt
	 * Node's port list in the instance
	 * Only nodes with assigned ID that can be accessed from here
	 * ```
	 */
	export let Ports: {
		[nodeId: string]: {
			/** Get/set node output port's value */
			Output: {[portName: string]: any};
			/** Get/set node input port's value */
			Input: {[portName: string]: any};

			/** Input port's interface, that can be used for listening event or get the cables */
			IInput: {[portName: string]: IFacePort<any>};
			/** Output port's interface, that can be used for listening event or get the cables */
			IOutput: {[portName: string]: IFacePort<any>};
		}
	};
}

declare module "@blackprint/engine" {

type PortWhich = 'input' | 'output';

export namespace Types {
	/** Allow any type as port type */
	export let Any: object;

	/**
	 * ```txt
	 * [Experimental] May get deleted/changed anytime
	 * Port's type can be assigned and validated later
	 * This port will accept any port for initial connection
	 * Currently only for output port
	 * ```
	 */
	export let Slot: object;

	/** Only can be passed to Output port as type */
	export let Route: object;
}

export enum VarScope {
	/** This variable can be used on main instance, and shared inside any function */
	Public,
	/**
	 * ```txt
	 * This variable can be used inside a function,
	 * each function will have different value even using the same name
	 * ```
	 */
	Private,
	/**
	 * ```txt
	 * This variable can be used inside a function
	 * every function will share the value of the variable
	 * ```
	 */
	Shared,
}

type ClassConstructor = abstract new (...args: any) => any;
type PortType<T> = { [P in keyof T]: T[P] extends ClassConstructor ? InstanceType<T[P]> : any };

/**
 * Change global Blackprint settings
 * @param which setting name
 * @param value or data
 */
export function settings(which: String, value: any): void;

type ModuleContext = {
	/**
	 * ```txt
	 * Store your interface class constructor here if you want
	 * to allow it to be accessed from different module/library
	 * ```
	 */
	IFace: any;
	/**
	 * ```txt
	 * Define local custom type for your module that can be used for defining
	 * port type
	 * ```
	 * @param originalType Class constructor reference, can be null
	 * @param virtualName Unique type name for this module
	 * @returns Type
	 */
	VirtualType: (originalType: object, virtualName: String | Array<String>) => any;
	/**
	 * ```txt
	 * You can use this object to store your data
	 * If you want to allow other developer accessing your object/data
	 * ```
	 */
	[key: string]: any;
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
export function loadScope(options: {
	/** This module URL (`import.meta.url`) */
	url: String,
	/** Set this to true if this module has HTML node interface for browser */
	hasInterface?: Boolean,
	/** Set this to true if this module has docs */
	hasDocs?: Boolean,
	/** Set this to true if this module has custom style `.css` */
	css?: Boolean
}): any;

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
	 * ```txt
	 * This port can contain multiple cable as input and the input port will return an array
 	 * it's only one type, not union
 	 * for union port, please split it to different port to handle it
	 * ```
	 * @param type Type Data that allowed for the Port
	 */
	export function ArrayOf(type: any): any;

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
	 * ```txt
	 * This port can allow multiple different types
	 * like an 'any' port, but can only contain one value
	 * ```
	 * @param types Allowed data types
	 */
	export function Union(types: Array<any>): any;

	/**
	 * ```txt
	 * This port can allow multiple different types
	 * like an 'any' port, but can only contain one value
	 * ```
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
	 * ```txt
	 * This only exist on JavaScript, just like a typed string or other typed primitives
	 * Mostly can be useful for Blackprint Sketch as a helper/shortcut when creating nodes
	 * ```
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
 * ```txt
 * Register interface to Blackprint (For browser and non-browser).
 * If you're creating Sketch UI, you will need to register with Blackprint.Sketch.registerInterface too.
 * ```
 * @param icNamespace Interface component's namespace, must be prefixed with "BPIC/"
 * @param class_ Class that extends Blackprint.Interface, leave this parameter empty if you want to use decorator
 */
export function registerInterface(icNamespace: String, class_?: Function): Function;

export namespace Environment {
	/**
	 * ```txt
	 * Blackprint's environment variables
	 * You can use this object to obtain value
	 * To set value, you must use .set() function
	 * ```
	 */
	export let map: {[key: string]: string};

	/**
	 * ```txt
	 * Change this to false if you want to load module from node_modules
	 * This will default to true if running on Browser/Deno
	 * and false if running on Node.js
	 * ```
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
	 * ```txt
	 * Use this to rename a class name.
	 * This can help you fix your class name if it's being minified by compiler.
	 * ```
	 * @param obj List of class that will be renamed, with format {"name": class}
	 */
	export function renameTypeName(obj: {[name: string]: Function}): void;

	/**
	 * ```txt
	 * Use this to determine if the version is newer or older.
	 * Can only work if the URL contains semantic versioning like '/nodes@1.0.0/file.mjs'
	 * ```
	 * @param old CDN URL to the .mjs file
	 * @param now CDN URL to the .mjs file
	 */
	export function packageIsNewer(old: string, now: string): Boolean;

	/**
	 * ```txt
	 * Use this to make a class prototype enumerable.
	 * For example you're creating a class with getter/setter that was not enumerable by default.
	 * ```
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
class CustomEvent {
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

export type BPFunctionList = {[id: string]: BPFunctionList | BPFunction};
export type BPVariableList = {[id: string]: BPVariableList | BPVariable};

/** Blackprint Engine Instance (for browser or non-browser) */
export class Engine extends CustomEvent {
	/** Node interface list */
	ifaceList: Array<Interface>;
	/** You can obtain the node interface by using its id from here */
	iface: {[nodeId: string]: Interface};
	/** Registered function in the instance */
	functions: BPFunctionList;
	/** Registered variable in the instance */
	variables: BPVariableList;
	/** Event handler/emitted for the instance */
	events: InstanceEvents;
	/** Instance data flow's execution manager */
	executionOrder: ExecutionOrder;
	/** Shortcut for accessing node ports by using the interface id */
	ref: {[nodeId: string]: {
		/** Get/set node output port's value */
		Input: {[portName: string]: any},
		/** Get/set node input port's value */
		Output: {[portName: string]: any},
		/** Input port's interface, that can be used for listening event or get the cables */
		IInput: {[portName: string]: PortIFace<any, any>},
		/** Output port's interface, that can be used for listening event or get the cables */
		IOutput: {[portName: string]: PortIFace<any, any>},
	}}

	/**
	 * ```txt
	 * Reference to parent node's interface.
	 * This only available if the instance is created in a function node.
	 * ```
	 */
	parentInterface?: Interface;

	/** Wait until the very first `json.imported` event have emitted */
	ready(): Promise<void>;

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
	getNodes(namespace: string): Node<any>;

	/**
	 * Create a node from a namespace
	 * @param namespace Node namespace
	 * @param options additional options
	 */
	createNode(namespace: string, options?: {
		/** Node's data, this will be passed into `node.imported(data)` */
		data?: object,
		/** Node's horizontal position in pixel */
		x?: Number,
		/** Node's vertical position in pixel */
		y?: Number,
		/** Node's id */
		id?: Number,
	}): Interface;

	/**
	 * Create instance variable
	 * @param namespace variable id/namespace
	 * @param options additional options
	 */
	createVariable(namespace: string, options?: { title?: string }): void; // ToDo

	/**
	 * Rename instance variable
	 * @param from old variable namespace
	 * @param to new variable namespace
	 * @param scope variable scope id
	 */
	renameVariable(from: string, to: string, scope: VarScope): void;

	/**
	 * Delete instance variable
	 * @param namespace variable id/namespace
	 * @param scope variable scope id
	 */
	deleteVariable(namespace: string, scope: VarScope): void;

	/**
	 * Create instance function
	 * @param namespace function id/namespace
	 * @param options additional options
	 */
	createFunction(namespace: string, options?: object): void; // ToDo

	/**
	 * Rename instance function
	 * @param from old function namespace
	 * @param to new function namespace
	 */
	renameFunction(from: string, to: string): void;

	/**
	 * Delete instance function
	 * @param namespace function id/namespace
	 */
	deleteFunction(namespace: string): void;

	/** Clean instance and mark as destroyed */
	destroy(): void;

	/** Node ID was added/changed/removed */
	on(eventName: 'node.id.changed', callback: (data: { iface: Interface, old: String, now: String }) => void): void;
	/** A cable was disconnected or deleted */
	on(eventName: 'cable.disconnect', callback: (data: { port: IFacePort, target?: IFacePort, cable: Cable }) => void): void;
	/** A cable was connected between two port */
	on(eventName: 'cable.connect', callback: (data: { port: IFacePort, target: IFacePort, cable: Cable }) => void): void;

	/** JSON was imported into the instance */
	on(eventName: 'json.imported', callback: (data: { appendMode: Boolean, nodes: Array<Node<any>>, data: String }) => void): void;
	/** An error happened on the instance */
	on(eventName: 'error', callback: (data: { type: String, data: Object }) => void): void;
	/** A cable was created */
	on(eventName: 'cable.created', callback: (data: { port: IFacePort, cable: Cable }) => void): void;
	/** A cable was deleted */
	on(eventName: 'cable.deleted', callback: (data: { cable: Cable }) => void): void;
	/** A node is being deleted */
	on(eventName: 'node.delete', callback: (data: { iface: Interface }) => void): void;
	/** A node was deleted */
	on(eventName: 'node.deleted', callback: (data: { iface: Interface }) => void): void;
	/** A node was created */
	on(eventName: 'node.created', callback: (data: { iface: Interface }) => void): void;

	/** New event data field was created */
	on(eventName: 'event.field.created', callback: (data: { name: String, namespace: String }) => void): void;
	/** An event data field was renamed */
	on(eventName: 'event.field.renamed', callback: (data: { old: String, now: String, namespace: String }) => void): void;
	/** An event data field was deleted */
	on(eventName: 'event.field.deleted', callback: (data: { name: String, namespace: String }) => void): void;
	/** New variable was created */
	on(eventName: 'variable.new', callback: (data: {
		scope: VarScope,
		id: String,

		/** Only available for Public and Shared variable */
		reference?: BPVariable,
		bpFunction?: BPFunction,
	}) => void): void;
	/** A variable was renamed */
	on(eventName: 'variable.renamed', callback: (data: {
		old: String, now: String,
		scope: VarScope,

		/** Only available for Public and Shared variable */
		reference?: BPVariable,
		bpFunction?: BPFunction,
	}) => void): void;
	/** A variable was deleted */
	on(eventName: 'variable.deleted', callback: (data: {
		id: String,
		scope: VarScope,
		bpFunction?: BPFunction,
	}) => void): void;
	/** A function template was created */
	on(eventName: 'function.new', callback: (data: { reference: BPFunction }) => void): void;
	/** A function template was renamed */
	on(eventName: 'function.renamed', callback: (data: { old: String, now: String, reference: BPFunction }) => void): void;
	/** A function template was deleted */
	on(eventName: 'function.deleted', callback: (data: { reference: BPFunction, id: String }) => void): void;
	/** An event namespace was created */
	on(eventName: 'event.new', callback: (data: { reference: InstanceEvent }) => void): void;
	/** An event namespace was renamed */
	on(eventName: 'event.renamed', callback: (data: { old: String, now: String, reference: InstanceEvent }) => void): void;
	/** An event namespace was deleted */
	on(eventName: 'event.deleted', callback: (data: { reference: InstanceEvent }) => void): void;

	/** The instance have been paused */
	on(eventName: 'execution.paused', callback: (data: {
		/** Previous executed node */
		afterNode?: Node<NodeStaticProps>,
		/** Next node to be executed */
		beforeNode?: Node<NodeStaticProps>,
		/** Next cable execution */
		cable?: Cable,
		/** Pending cable execution */
		cables?: Cable[],

		/**
		 * ```txt
		 * 0 = execution order, 1 = route, 2 = trigger port, 3 = request
		 * execution priority: 3, 2, 1, 0
		 * ```
		 */
		triggerSource: Number,
	}) => void): void;
	/** The instance data flow got terminated */
	on(eventName: 'execution.terminated', callback: (data: { reason: String, iface: Interface }) => void): void;

	/** A function node's port get renamed */
	on(eventName: 'function.port.renamed', callback: (data: {
		which: PortWhich,
		old: String,
		now: String,
		reference: BPFunction,
	}) => void): void;
	/** A function node's port get deleted */
	on(eventName: 'function.port.deleted', callback: (data: {
		which: PortWhich,
		name: String,
		reference: BPFunction,
	}) => void): void;
	/** A node was created into the instance */
	on(eventName: 'node.created', callback: (data: { iface: Interface }) => void): void;
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
class Cable {
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
export class IFacePort<T extends Interface = any> {
	/** List of connected cables */
	cables: Array<Cable>;
	/** Node interface's reference */
	iface: T;
	/** Allow this port to trigger update of other node even the output value is similar */
	allowResync: Boolean;
	/** Port's name */
	name: String;
	/** Return true if this was route port */
	isRoute: Boolean;
	/** Port's IO type, can be input port or output port */
	source: PortWhich;
	/** Port's type */
	readonly type: object;
	/** Return true if port from StructOf was splitted to multiple port */
	readonly splitted: Boolean;
	/** Access output value, this will only available on output port */
	readonly value: any;

	// sync: Boolean;
	// disabled: Boolean;

	/**
	 * ```txt
	 * You mustn't use this class to manually construct interface port
	 * But please use 'iface.node.createPort()' instead
	 * ```
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
	 * ```txt
	 * [Experimental] May get deleted/changed anytime
	 * Assign new type for this port
	 * Can only be used if this port is using 'Any' type since created
	 * ```
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
	on(eventName: 'value', callback: (data: IOPort_EventValue<T>) => void): void;
	/** The Port.Trigger or port with Function type was called */
	on(eventName: 'call', callback: () => void): void;
	/** A cable is trying to connect for the port */
	on(eventName: 'connecting', callback: (data: { target: IFacePort, activate: (activate?: true | false) => void }) => void): void;
	/** An cable was connected from the port */
	on(eventName: 'connect', callback: (data: { port: IFacePort<T>, target: IFacePort, cable: Cable }) => void): void;
	/** An cable was disconnected from the port */
	on(eventName: 'disconnect', callback: (data: { port: IFacePort<T>, target?: IFacePort, cable: Cable }) => void): void;

	/** Event that will emit when this port has new type assigned (only available for Blackprint.Types.Slot port type) */
	on(eventName: 'type.assigned', callback: () => void): void;
}

type IOPort_EventValue<T extends Interface> = {
	port: IFacePort<T>,
	/** Only exist on output port */
	target?: IFacePort,
	/** Only exist on output port */
	cable?: Cable
};
type OutputPort_EventValue<T extends Interface> = { port: IFacePort<T> };

type PropType<T, P extends keyof T> = T[P];
type PortIFace<T, A extends Node<A>> = { [P in keyof T]: IFacePort<Interface<A>> };
export type PortReferences<T extends Node<T>> = {
	/** Input port's interface, that can be used for listening event or get the cables */
	IInput: PortIFace<T['input'], T>,
	/** Output port's interface, that can be used for listening event or get the cables */
	IOutput: PortIFace<T['output'], T>,

	/** Get/set node output port's value */
	Input: PropType<T, 'input'>,
	/** Get/set node input port's value */
	Output: PropType<T, 'output'>,
};

/** Interface/IFace that can be used to control nodes */
export class Interface<T extends Node<T> = any> extends CustomEvent {
	/** Node's title */
	title: String;
	/** Node's namespace */
	namespace: String;
	/** Node reference */
	node: Node<any>;
	/** Input port's interface */
	input: PortIFace<T['input'], T>;
	/** Output port's interface */
	output: PortIFace<T['output'], T>;
	/** This will return true if still importing the node */
	importing: Boolean;

	/**
	 * ```txt
	 * Reference to function node's instance
	 * This only available for function node
	 * ```
	 */
	bpInstance?: Engine;

	// /** Node's type */
	// type: 'event' | 'function' | 'general';

	/** References */
	ref: PortReferences<T>;

	/** Additional properties */
	[key: string]: any;

	/**
	 * ```txt
	 * You mustn't use this class to manually construct nodes
	 * But please use 'instance.createNode()' instead
	 * ```
	 * @param node
	 */
	constructor(node: Node<any>);

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
	// readonly i: Number;

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
	on(eventName: 'cable.connect', callback: (data: { port: IFacePort<T['iface']>, target: IFacePort, cable: Cable }) => void): void;
	/** Two ports get disconnected each other */
	on(eventName: 'cable.disconnect', callback: (data: { port: IFacePort<T['iface']>, target: IFacePort, cable: Cable }) => void): void;
	/** There's new value update coming from output port */
	on(eventName: 'port.value', callback: (data: { port: IFacePort<T['iface']>, target: IFacePort, cable: Cable }) => void): void;
	/** Event that will emit after the engine called node.update() function */
	// on(eventName: 'update', callback: () => void): void;
}

/** Can be used to show information for nodes in Sketch */
class Decoration {
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

type NodeStaticProps = {output?: {}, input?: {}};
export enum InitUpdate {
	/** Only when no input cable connected */
	NoRouteIn,
	/** Only when no input cable connected */
	NoInputCable,
	/**
	 * ```txt
	 * Only when creating the node
	 * All the cable haven't been connected at this moment
	 * and some other flags may be ignored
	 * ```
	 */
	WhenCreatingNode,
}

/** Blackprint Node */
export class Node<T extends NodeStaticProps> {
	/**
	 * Set this to true if you want .update function being called for every data changes from different input port
	 */
	partialUpdate: Boolean;

	/** Automatically call `.update` on node init depends on this flag rules */
	static initUpdate: InitUpdate;

	/** Interface reference */
	iface: Interface<Node<T>>;
	/** Input port's value */
	input: PortType<T['input']>;
	/** Output port's value */
	output: PortType<T['output']>;

	/** References */
	ref: PortReferences<Node<T>>;

	/** Engine instance */
	instance: Engine;

	// disablePorts: Boolean;
	// partialUpdate: Boolean;
	// syncThrottle: Boolean;
	// routes: Boolean;

	/** Additional properties */
	[key: string]: any;

	/**
	 * ```txt
	 * You mustn't use this class to manually construct Blackprint Node
	 * But please use 'instance.createNode()' instead
	 * ```
	 * @param instance current instance where this node was created
	 */
	constructor(instance: Engine);

	/**
	 * This must be called once to attach interface to this node
	 * @param icNamespace interface component's namespace that was declared with instance.registerInterface(), must be prefixed with "BPIC/"
	 */
	setInterface(icNamespace?: string): Interface<Node<T>>;

	/**
	 * ```txt
	 * This will be called when initializing node's port
	 * In case you need to create a dynamic port, you will need to override this function
	 * ```
	 * @override you can override/replace this functionality on your class
	 * @param data Data that was passed when importing JSON or creating new node
	 */
	initPorts(data: Object): void;

	/**
	 * This function will be called once the nodes has been created and the cables has been connected
	 * @override you can override/replace this functionality on your class
	 */
	init(): void;

	/**
	 * ```txt
	 * This function will be called before init, where this node still not connected to any cables
	 * You need to manually save the data to interface if it's needed
	 * ```
	 * @override you can override/replace this functionality on your class
	 * @param data Data that was passed when importing JSON or creating new node
	 */
	imported(data: Object): void;

	/**
	 * ```txt
	 * This function will be called everytime there's an update or new value from output port from other nodes
	 * But if this node has route cable, this update function will be called until this node has turn to be executed
	 * ```
	 * @override you can override/replace this functionality on your class
	 * @param cable Related cable where the data flow happen, `this.partialUpdate` must be set to true to have this parameter
	 */
	update(cable: Cable): void;

	/**
	 * ```txt
	 * This function will be called if this node has a null value in output port
	 * The other node that need an input will requesting a output value from this node
	 * ```
	 * @override you can override/replace this functionality on your class
	 * @param cable Related cable that calling this function
	 */
	request(cable: Cable): void;

	/**
	 * Dynamically create port to this node
	 * @param which port source
	 * @param name unique port name
	 * @param type data type (class)
	 */
	createPort(which: PortWhich, name: string, type: Function): IFacePort<Interface<Node<T>>>;

	/**
	 * Dynamically rename port to this node
	 * @param which port source
	 * @param name port name
	 * @param to unique port name
	 * @returns true if successfully renamed
	 */
	renamePort(which: PortWhich, name: string, to: string): Boolean;

	/**
	 * Dynamically delete port to this node
	 * @param which port source
	 * @param name port name
	 */
	deletePort(which: PortWhich, name: string): void;

	/**
	 * Send data to remote nodes
	 * @param id your defined id
	 * @param data data to be send
	 */
	syncOut(id: string, data: any): void;

	/**
	 * ```txt
	 * You must replace this with your own custom function in order to receive data
	 * Receive data from remote nodes
	 * ```
	 * @param id your defined id
	 * @param data received data
	 * @param isRemote true if this data was received from remote engine
	 * @override you can override/replace this functionality on your class
	 */
	syncIn(id: string, data: any, isRemote: boolean): void;
}

export type { BPVariable };
class BPVariable extends CustomEvent {
	/** Only available for private/shared variable scope (inside of a function) */
	readonly bpFunction?: BPFunction;
	/** Variable namespace/id */
	readonly id: string;
	/** Variable type */
	readonly type: object;
	/** Any variable nodes in the instance/function will be stored here */
	used: Interface[];

	/** You can get/set the variable node's value in this property */
	value: any;

	/** Event that will be emitted when this variable value has changed */
	on(eventName: 'value', callback: () => void): void;
	/** Event that will be emitted when this variable was called as a function */
	on(eventName: 'call', callback: () => void): void;
	/** Event that will be emitted when this variable have assign its type */
	on(eventName: 'type.assigned', callback: () => void): void;
}

export type { BPFunction };
class BPFunction {
	/** Function namespace/id */
	readonly id: string;
	/** Function title */
	title: string;
	/** Main/root instance, can be Sketch or Engine */
	rootInstance: Engine;
	/** Function description */
	description: string;
	/** Any function nodes in the instance/function will be stored here */
	used: Interface[];
	/** Function structure */
	readonly structure: object;
	/** Function input */
	readonly input: object;
	/** Function output */
	readonly output: object;

	/**
	 * Create a node inside of the function
	 * @param namespace node's namespace to be created
	 * @param options options to be passed when contructing the node
	 */
	createNode(namespace: string, options: object): void;

	/**
	 * Define new variable for this function
	 * @param id variable's id to be defined
	 * @param options options for defining the variable
	 */
	createVariable(id: string, options: {scope: VarScope}): void;

	/**
	 * Rename a defined variable for this function
	 * @param from old variable id
	 * @param to new variable id
	 * @param scope variable scope
	 */
	renameVariable(from: string, to: string, scope: VarScope): void;

	/**
	 * Delete variable definition for this function and remove all variable nodes
	 * @param id variable id
	 * @param scope variable scope
	 */
	deleteVariable(id: string, scope: VarScope): void;

	/**
	 * Rename defined port for the function
	 * @param which Which port IO to be renamed
	 * @param from old port name
	 * @param to new port name
	 */
	renamePort(which: PortWhich, from: string, to: string): void;

	/**
	 * Delete defined port for the function
	 * @param which Which port IO to be renamed
	 * @param name port name
	 */
	deletePort(which: PortWhich, name: string): void;
}

class InstanceEvent {
	/** Event data fields, you can change the type in this schema buat you can't add/delete the field */
	readonly schema: {
		/** Field name: Type */
		[key: string]: object,
	};
	/** Event namespace */
	namespace: string;

	/** Any event nodes in the instance/function will be stored here */
	used: Interface[];
}
export type { InstanceEvents };
class InstanceEvents extends CustomEvent {
	/** You can access stored InstanceEvent from this list */
	list: {[namespace: string]: InstanceEvent};

	/**
	 * ```txt
	 * Define an event structure to this instance
	 * After that you can listen to that event using ".events.on(namespace, ...)" or ".events.once(namespace, ...)"
	 * Or emit your data for that event using ".events.emit(namespace, data)"
	 * Just like normal event listener
	 * ```
	 * @param namespace Event namespace
	 * @param options Event options
	 */
	createEvent(namespace: string, options: {schema?: {[key: string]: object}, fields?: string[]}): void;

	/**
	 * Rename defined event into another namespace
	 * @param from old event namespace
	 * @param to new event namespace
	 */
	renameEvent(from: string, to: string): void;

	/**
	 * Delete defined event and remova all node of this event
	 * @param namespace Event namespace
	 */
	deleteEvent(namespace: string): void;
}

class ExecutionOrder {
	/** Maximum pending node in single data flow execution order */
	initialSize: Number;
	/** Any pending node will be stored here */
	readonly list: Node<NodeStaticProps>[];
	/** Current execution index */
	readonly index: Number;
	/** Total pending node */
	readonly length: Number;
	/** Pause any data flow and skip adding another pending node */
	stop: Boolean;
	/** Pause any data flow */
	pause: Boolean;
	/** Pause any data flow on every data flow event */
	stepMode: Boolean;

	/** Check if the node is pending to be executed */
	isPending(node: Node<NodeStaticProps>): Boolean;
	/** Clear any pending node */
	clear(): void;
	/** Add pending node */
	add(node: Node<NodeStaticProps>): void;
	/**
	 * Start data flow of current pending node that still available in the pending list
	 * @param force Force data flow or execution even paused
	 */
	next(force?: Boolean): void;
}

/** Fictional simple port that can be connected with other port */
class PortGhost extends CustomEvent {
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
	 * ```txt
	 * Port's value
	 * Value need to be assigned before connected to other port
	 * In case you lazily assigned the value, you will need to call .sync()
	 * ```
	 */
	value: any;

	/** Sync value to all connected port */
	sync(): void;

	/** There are value update on the port */
	on(eventName: 'value', callback: (data: OutputPort_EventValue<any>) => void): void;
	/** The Port.Trigger or port with Function type was called */
	on(eventName: 'call', callback: () => void): void;
}

/**
 * ```txt
 * Create fictional simple input port that can be connected to other output port
 * To listen to new input value or port call please add an event listener
 * `.on('call', function(){})`
 * `.on('value', function(ev){})`
 * ```
 */
export class InputPort extends PortGhost {
	/**
	 * Create fictional simple input port that can be connected to other output port
	 * @param type port's data type
	 */
	constructor(type: any);

	/** There are value update on the port */
	on(eventName: 'value', callback: (data: IOPort_EventValue<any>) => void): void;
	/** The Port.Trigger or port with Function type was called */
	on(eventName: 'call', callback: () => void): void;
}

/** Can be used to control data flow between nodes */
class RoutePort {
	/** Pause/disable this route port */
	pause(): any;

	/** Unpause/enable this route port */
	unpause(): any;

	/**
	 * Create cable from this port that not connected to other port
	 */
	createCable(): Cable;

	/**
	 * Connect current output route to other node
	 * @param iface Target node interface
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

export type { RoutePort };

/**
 * ```txt
 * [Experimental] [ToDo]
 * module "@blackprint/remote-control" is required
 * ```
 */
class RemoteBase {
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
 * ```txt
 * [Experimental] [ToDo]
 * module "@blackprint/remote-control" is required
 * ```
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
 * ```txt
 * [Experimental] [ToDo]
 * module "@blackprint/remote-control" is required
 * ```
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

}