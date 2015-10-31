var path = require('path')
    ,sqlite3 = require('sqlite3');



// Args
var ACTIONS = [
	'update',
	'convert',
	'parse',
	'normalise',
	'extra',
	'denormalise',
	'serve'
];
var action = process.argv[2];
var printUsage = function(){
	console.log('Usage: node ./index.js '+ACTIONS.join('|')+' [debug]');
	process.exit(1);
};
if(!action){
	printUsage(); 
}else{
	var found = false;
	for(var i in ACTIONS){
		if(ACTIONS[i] == action){
			found = true;
			break;
		}
	}
	if(!found) printUsage();
}
var debugEnabled = process.argv[3] ? true : false;
if(debugEnabled && process.argv[3] != 'debug') printUsage();
if(process.argv[4]) printUsage();
if(debugEnabled) console.log('DEBUG IS ENABLED');





// Setup
var basePath = path.resolve('./');
var dbFile = path.resolve(basePath + '/res/db/db.sqlite');
sqlite3.verbose();
var db = new sqlite3.Database(dbFile);
var debug = function(str){
    if(debugEnabled) console.log(str);
}
var actionPath = './js/'+action;
var actionModule = require(actionPath);


// Run
console.log('Starting action: '+action);
actionModule.run(db, basePath, debug, function(){
	console.log('Finished action: '+action);
	db.close();
});


