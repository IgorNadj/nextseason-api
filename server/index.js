var server = require('./js/server.js')
	,controller = require('./js/controller.js')
	,fs = require('fs')
	,sqlite3 = require('sqlite3');


const DB_PATH = './../parser/db/db.sqlite';

// Setup
sqlite3.verbose();
var db = new sqlite3.Database(DB_PATH);

// Run
server.start();
controller.run(db, server);
