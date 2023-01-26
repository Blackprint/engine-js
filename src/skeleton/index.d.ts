// Type definitions for Blackprint Engine
// Project: https://github.com/Blackprint/engine-js
// Module: @blackprint/engine/skeleton

/**
 * This can be used to import Blackprint JSON without actually loading any nodes modules or running nodes
 * Every nodes is generated at runtime, nodes will doing nothing even get connected
 * Skeleton node interface will be used by default
 * 
 * @note Can be used after you have imported skeleton module
 */
 export class Skeleton {
	/** Instance functions */
	functions: {[key: string]: {
		id: string,
		title: string,
		description: string,
		vars: Array<any>,
		privateVars: Array<any>,
		structure: object
	}};

	/** Instance variables */
	variables: {[key: string]: {
		id: string,
		title: string,
	}};

	/** You can use this for obtaining Node Interface reference by id */
	iface: {[key: string]: SkeletonInterface};

	/** You can use this for obtaining Node Interface reference by index */
	ifaceList: Array<SkeletonInterface>;

	constructor(json: string | object);

	/**
	 * Get list of nodes that created from specific namespace
	 * @param namespace Node namespace
	 */
	getNodes(namespace: string): SkeletonNode;
}

declare class SkeletonPort {
	/** Node Interface who own this port */
	iface: SkeletonInterface;
	/** Port name */
	name: string;
	source: 'input' | 'output';
	/**
	 * Cable list that connected to this port
	 * 
	 * If you want to get "output <-> input" cable only
	 * Make sure to check if this was not a cable branch with .hasBranch
	 */
	cables: Array<SkeletonCable>;
}
declare class SkeletonNode {
	instance: Skeleton;
	routes: SkeletonRoutePort;
	iface: SkeletonInterface;
}
declare class SkeletonInterface {
	/** Node namespace */
	namespace: string;
	/** Input ports */
	input: {[key: string]: SkeletonPort | SkeletonRoutePort};
	/** Output ports */
	output: {[key: string]: SkeletonPort | SkeletonRoutePort};
	/** Ports References */
	ref: {
		IInput: {[key: string]: SkeletonPort},
		IOutput: {[key: string]: SkeletonPort}
	};
	x: number;
	y: number;
	z: number;
	/** Node Interface's id */
	id: string;
	/** Node Interface's index */
	i: number;
	comment: string;
	/** Node Interface's saved data */
	data: object;
	/** Node reference */
	node: SkeletonNode;
}
declare class SkeletonRoutePort {
	/** Node Interface who own this port */
	iface: SkeletonInterface;
	in: Array<SkeletonCable>;
	out: SkeletonCable;
}
declare class SkeletonCable {
	input: SkeletonPort;
	output: SkeletonPort;
	/** Return true if this was a cable from route port */
	isRoute: Boolean;
	/** Return true if this cable has branch */
	hasBranch: Boolean;
	overrideRot: Boolean;
	/** Root cable (single cable that directly connected to output port) */
	cableTrunk: SkeletonPort;
	/** Cable branches list */
	branch: Array<SkeletonCable>;
	/** Cable branch's parent */
	parentCable: SkeletonCable;
}