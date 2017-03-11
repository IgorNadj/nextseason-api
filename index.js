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
	console.log('Usage: node ./index.js '+ACTIONS.join('|')+' [debug] [filedb] [forceupdate]');
	console.log('If unsure which action to call, call all');
	process.exit(1);
};
if(!action){
	action = 'all';
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

var debugEnabled = false;
var useFileDb = false;
var forceUpdate = false;
var forceParse = false;
for(var i = 3; i < process.argv.length; i++){
	var arg = process.argv[i];
	if (arg == 'debug'){
		debugEnabled = true;
		console.log('DEBUG IS ENABLED');	
	} else if (arg == 'filedb') {
		useFileDb = true;
		console.log('USING FILE DB');
	} else if (arg == 'forceupdate') {
		forceUpdate = true;
		console.log('FORCE UPDATING');
	} else if (arg == 'forceparse') {
		forceParse = true;
		console.log('FORCE PARSING');
	} else {
		printUsage();
		process.exit(1);
	}
}



// Setup
var basePath = path.resolve('./');
var dbFile = path.resolve(basePath + '/res/db/db.sqlite');
var db = new betterSqlite3(dbFile, {memory: !useFileDb});
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
actionModule.run(
	db, 
	basePath, 
	debug, 
	function(){
		console.log('Finished action: '+action);
		db.close();
	},
	forceUpdate,
	forceParse
);	




