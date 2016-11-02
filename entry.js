exports.handler = function(event, context, callback){
	console.log('5+5 is: ', (5+5));
	callback(null, "some success message");
};
