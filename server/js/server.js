var http = require('http');
var url = require('url');


var actions = {};

exports.start = function(){
	const PORT=80; 

	var server = http.createServer(function(request, response){
		// allow access from wherevs
		response.setHeader('Access-Control-Allow-Origin', '*');

		var requestParts = url.parse(request.url, true);
		console.log('Access: '+requestParts.pathname);

		if(actions[requestParts.pathname]){
			var f = actions[requestParts.pathname];
			f(request, response, requestParts.query)
		}else{
			response.statusCode = 404;
			response.end('404: Not Found');
		}
	});

	server.listen(PORT, function(){
	    console.log("Server listening on: http://localhost:%s", PORT);
	});
};

exports.registerAction = function(name, callback){
	actions[name] = callback;
};
