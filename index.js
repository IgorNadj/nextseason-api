var path = require('path')
    ,betterSqlite3 = require('better-sqlite3');



// Args
var ACTIONS = [
	'all', // todo: only run if new file exists (see old update script)
	'extra',
	'download',
	'parse',
	'normalise',
	'export',
];
var action = process.argv[2];
var printUsage = function(){
	console.log('Usage: node ./index.js '+ACTIONS.join('|')+' [debug]');
	console.log('If unsure which action to call, call all');
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
var db = new betterSqlite3(dbFile);
var debug = function(){
    if(debugEnabled){
    	if(arguments.length === 1){
    		console.log('DEBUG: ', arguments[0]);
    	}else{
    		console.log('DEBUG: ', arguments)
    	}
    }
}

var actionPath = './js/'+action;
var actionModule = require(actionPath);

// Run
console.log('Starting action: '+action);
actionModule.run(db, basePath, debug, function(){
	console.log('Finished action: '+action);
	db.close();
	debug('Database closed');
});	




