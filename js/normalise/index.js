var fs = require('fs');



const NORMALISE_SQL_FILE = '/res/sql/normalise.sql';
const DRY_RUN = false;


var query = function(sql, db, debug, callback){
    debug(sql);
    if(DRY_RUN){
    	if(callback) callback();
    }else{
    	db.serialize(function(){
    		db.run(sql, callback);
    	});
    } 
};

module.exports.run = function(db, basePath, debug, onDone){
	console.log('Normalise start');
	// Read our normalise sql statements and run them one by one.
	// it looks like node-sqlite3 can't do multiple statements in the same query, 
	// so not sure how to do this otherwise.
	var normaliseFilePath = basePath +NORMALISE_SQL_FILE;
	var sqlFileContent = fs.readFileSync(normaliseFilePath, 'UTF8').toString();
	var sqlStatements = sqlFileContent.split(';');

	var queryNum = 0;
	var execNextQuery = function(){
		if(queryNum == sqlStatements.length - 1){
			console.log('Normalise done');
			onDone();
		}else{
			var sql = sqlStatements[queryNum].trim()+';';
			queryNum++;
			query(sql, db, debug, execNextQuery);
		}
	};
	execNextQuery();	
};