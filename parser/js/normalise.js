var fs = require('fs');



const NORMALISE_SQL_FILE = 'sql/normalise.sql';


var query = function(sql, db, debug, dry, callback){
    debug(sql);
    if(dry){
    	if(callback) callback();
    }else{
    	db.run(sql, callback);
    } 
};

module.exports.normalise = function(db, debug, dry, onDone){
	console.log('Normalise start');
	// Read our normalise sql statements and run them one by one.
	// it looks like node-sqlite3 can't do multiple statements in the same query, 
	// so not sure how to do this otherwise.
	var sqlFileContent = fs.readFileSync(NORMALISE_SQL_FILE, 'UTF8').toString();
	var sqlStatements = sqlFileContent.split(';');

	var queryNum = 0;
	var execNextQuery = function(){
		if(queryNum == sqlStatements.length - 1){
			console.log('Normalise done');
			onDone();
		}else{
			var sql = sqlStatements[queryNum].trim()+';';
			queryNum++;
			query(sql, db, debug, dry, execNextQuery);
		}
	};
	execNextQuery();	
};