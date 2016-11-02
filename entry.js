exports.handler = function(event, context, callback){
	console.log('It worked!');
	callback(null, "some success message");
};
