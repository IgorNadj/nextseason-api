var server = require('./js/server.js')
	,controller = require('./js/controller.js');

	

module.exports.run = function(db, basePath, debug, onDone){
	server.start(debug);
	controller.run(db, server);
};

