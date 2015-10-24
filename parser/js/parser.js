var fs = require('fs')
	,PEG = require("pegjs")
    ,es = require("event-stream")
    ,exec = require('child_process').exec;



const GRAMMAR_FILE = 'grammar/grammar.peg';
const SHOW_PROGRESS = true;
const SHOW_PROGRESS_EVERY_N_LINES = 10000;
const START_LINE = 0;
const MAX_LINE = null; // null for unlimited




var columnTypeMap = {
    show_name:              'TEXT',
    show_year:              'INTEGER',
    episode_name:           'TEXT', 
    season_number:          'INTEGER',
    episode_number:         'INTEGER', 
    release_date_raw:       'TEXT',
    release_date_timestamp: 'INTEGER',
    release_date_location:  'TEXT',
    location_filmed:        'TEXT'
}

// Helper functions
var colNameArray = [];
var colDefArray = [];
var colPlaceholderArray = [];
for(var colName in columnTypeMap){
    colNameArray.push(colName);
    colDefArray.push(colName + ' ' + columnTypeMap[colName]);
    colPlaceholderArray.push('?');
}
var colNameStr = colNameArray.join(', ');
var colDefStr = colDefArray.join(', ');
var colPlaceholderStr = colPlaceholderArray.join(', ');

var insertRowSql = 'INSERT INTO release_date ('+colNameStr+') VALUES ('+colPlaceholderArray+');';


var insertRow = function(params, db, debug, dry){
    var arr = [];
    for(var colName in columnTypeMap){
        arr.push(params[colName]);
    }
    debug('insertRow: ' + arr);
    if(!dry){
        var insertRowStatement = db.prepare(insertRowSql);
        insertRowStatement.run(arr);
        insertRowStatement.finalize();
    }
}
var query = function(sql, db, debug, dry){
    debug(sql);
    if(!dry) db.run(sql);
}
var logParseError = function(e, lineNumber, line){
    console.log('PARSE ERROR AT LINE: '+lineNumber);
    console.log(line);
    if(e.location && e.location.start && e.location.start.offset){
        var str = '';
        for(var i = 0; i < e.location.start.offset; i++){
            if(line.charAt(i) === '\t'){
                str += '\t';
            }else{
                str += ' ';    
            }
        }
        console.log(str + '^');
    }
    console.log(e.message);
    console.log(e);
}

var timingStart = new Date().getTime();
var numLines = null;
if(MAX_LINE){
	numLines = MAX_LINE;
}else{
	exec('cat lists/release-dates.list | wc -l', function(err, r){
		if(err) return; // (most likely no wc) not a core function, ignore 
		numLines = parseInt(r);
	});
}

var showProgress = function(lineNumber){
	if(!SHOW_PROGRESS) return;
	if(lineNumber % SHOW_PROGRESS_EVERY_N_LINES !== 0) return;
	var str = lineNumber;
	if(numLines){
		var d = new Date().getTime();
		var secondsElapsed = (d - timingStart) / 1000;
		var secondsPerLine = secondsElapsed / lineNumber;
		var remainingLines = numLines - lineNumber;
		var remainingSeconds = Math.round(remainingLines * secondsPerLine);
		var etaStr = remainingSeconds + 's';
		if(remainingSeconds > 60){
			var remainingMinutes = Math.round(remainingSeconds / 60);
			etaStr = remainingMinutes + 'm';
		}
		str = lineNumber + '/' + numLines + ' (ETA: ' + etaStr + ')';
	}
	console.log(str);
};


module.exports.parse = function(db, listFilePath, debug, dry, onDone){
	// Prep
	console.log('Parser starting');
	debug('insertRowSql: ' + insertRowSql);
	var grammar = fs.readFileSync(GRAMMAR_FILE, 'utf-8');
	var pegParser = PEG.buildParser(grammar);

	// Run
	db.serialize(function(){
	    query('DROP TABLE IF EXISTS release_date;', db, debug, dry)
	    query('CREATE TABLE release_date ('+colDefStr+');', db, debug, dry);

	    var lineNumber = 0;
	    var inHeaderSection = true
	    var inFooterSection = false;
	    var numParseErrors = 0;
	    var inputStream = fs.createReadStream(listFilePath)
	    .pipe(es.split())
	    .pipe(
	        es.mapSync(function(line){

	            // pause the readstream
	            inputStream.pause();
	            lineNumber += 1;
	            
	            (function(){
	                var skip = false;
	                if(inHeaderSection){
	                    if(line == '==================') inHeaderSection = false;
	                    skip = true;
	                }
	                if(inFooterSection || line == '--------------------------------------------------------------------------------'){
	                    inFooterSection = true;
	                    skip = true;
	                }
	                if(lineNumber < START_LINE) skip = true;
	                if(MAX_LINE && lineNumber > MAX_LINE) skip = true;

	                if(!skip){
	                	showProgress(lineNumber);
	                    debug('#'+lineNumber+': '+line);

	                    var parsed = null;
	                    try{
	                        parsed = pegParser.parse(line)[0];
	                    }catch(e){
	                        logParseError(e, lineNumber, line);
	                        process.exit(1); 
	                    }
	                    if(parsed){
	                        debug(parsed);
	                        insertRow(parsed, db, debug, dry);
	                    }
	                    
	                }

	                // resume the readstream
	                inputStream.resume();

	            })();
	        })
	        .on('error', function(){
	            console.log('Error while reading file.');
	            process.exit(1);
	        })
	        .on('end', function(){
	            console.log('Parser done');
	            onDone();
	        })
	    );

	});
};