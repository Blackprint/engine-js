// This port will be used as a trigger or callable input port
// func = callback when the port was being called as a function
BP_Port.Trigger = function(func){
	// prohibit "() => {}" or "async ()=>{}"
	let i = func.toString().indexOf('=>');
	if(i !== -1 && i < 15)
		throw new Error("Please use 'function(){}' instead of arrow function'()=>{}' when using 'Blackprint.Port.Trigger' type");

	return {
		portFeature: BP_Port.Trigger,
		default: func
	};
}