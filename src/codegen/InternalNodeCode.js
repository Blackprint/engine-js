Blackprint.registerCode('BP/Event/Listen',
class extends Blackprint.Code {
	static previousRoute = Blackprint.CodeRoute.Optional;
	static nextRoute = Blackprint.CodeRoute.MustHave;

	js(routes){
		let name = this.iface.data.namespace.replace(/\W/g, '_');

		return {
			type: Blackprint.CodeType.Wrapper,
			begin: `exports.${name} = function(Input){`,
			end: `}`,
		};
	}
});