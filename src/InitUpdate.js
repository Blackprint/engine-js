var InitUpdate = Blackprint.InitUpdate = {
	NoRouteIn: 2, // Only when no input cable connected
	NoInputCable: 4, // Only when no input cable connected
	WhenCreatingNode: 8, // When all the cable haven't been connected (other flags may be affected)
};
Object.seal(InitUpdate);