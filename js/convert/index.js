var fs = require('fs')
    ,iconv = require('iconv-lite');



const RAW_LIST_FILE = '/res/lists/raw/release-dates.list';
const CONVERTED_LIST_FILE = '/res/lists/converted/release-dates.list';



module.exports.run = function(db, basePath, debug, onDone){
	var rawListFile = basePath + RAW_LIST_FILE;
	var convertedListFile = basePath + CONVERTED_LIST_FILE;

	var stream = fs.createReadStream(rawListFile);
	stream.pipe(iconv.decodeStream('win1250'))
	      .pipe(iconv.encodeStream('utf8'))
          .pipe(fs.createWriteStream(convertedListFile));

    stream.on('end', function(){
    	onDone();
    });
};