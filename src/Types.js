let Types = Blackprint.Types = {
	// Port will accept any data type
	Any: {name: 'Any', any: true},

	// Port that will trigger other input port if being called
	Trigger: {name: 'Trigger', isTrigger: true},

	/**
	 * [Experimental] May get deleted/changed anytime
	 * Port's type can be assigned and validated later
	 * This port will accept any port for initial connection
	 * Currently only for output port
	 */
	Slot: {name: 'Slot', slot: true, any: true},

	// Can only be used for output port's type
	Route: {name: 'BP-Route', isRoute: true},
};

Object.seal(Blackprint.Types);