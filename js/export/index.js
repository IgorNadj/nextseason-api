var fs = require('fs');


const EXPORT_FILE = '/res/exports/export.json';


module.exports.run = function(db, basePath, debug, onDone){
    var exportFilePath = basePath + EXPORT_FILE;

    var rows = db.prepare('SELECT * from show_next_season;').all();

    var out = {
    	shows: rows,
    	exportTime: (new Date().getTime() / 1000) // seconds precision timestamp
    };

    var str = JSON.stringify(out);
    fs.writeFile(exportFilePath, str, function(err) {
	    if(err) {
	        throw err;
	    }	    
	    debug('Exported file');
	    onDone();
	}); 
};