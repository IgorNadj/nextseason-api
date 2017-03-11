var fs = require('fs')
   ,downloader = require('./downloader.js');



const LIST_FILE = '/res/lists/release-dates.list';


module.exports.run = function(db, basePath, debug, onDone){
	var localPath = basePath + LIST_FILE;
	downloader.download(localPath, debug, function(){
		downloader.close();
		onDone();
	});
};