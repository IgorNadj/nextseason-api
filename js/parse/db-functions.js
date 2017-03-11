


var columnTypeMap = {
    show_name:              'TEXT',
    show_year:              'INTEGER',
    episode_name:           'TEXT', 
    season_number:          'INTEGER',
    episode_number:         'INTEGER', 
    release_date_raw:       'TEXT',
    release_date_timestamp: 'INTEGER',
    release_date_location:  'TEXT',
    location_filmed:        'TEXT',
    extra_show_id:          'INTEGER',
}


var colNameArray = [];
var colDefArray = [];
var colPlaceholderArray = [];
var colPlaceholderNoIdArray = [];
for(var colName in columnTypeMap){
	colNameArray.push(colName);
	colDefArray.push(colName + ' ' + columnTypeMap[colName]);
	colPlaceholderArray.push('?');
}
var colNameStr = colNameArray.join(', ');
var colDefStr = colDefArray.join(', ');
var colPlaceholderStr = colPlaceholderArray.join(', ');

var insertRowSql = 'INSERT INTO release_date ('+colNameStr+') VALUES ('+colPlaceholderArray+');';
// var updateSql = 'INSERT OR REPLACE INTO release_date ('+colNameStr+') VALUES ()'

var query = function(sql, db, debug, dryRun){
    debug(sql);
    if(!dryRun){
        db.prepare(sql).run();
    }
}




module.exports = {
	dropAndCreateTable: function(db, debug, dryRun){
		query('DROP TABLE IF EXISTS release_date;', db, debug, dryRun);    
		query('CREATE TABLE release_date ('+colDefStr+');', db, debug, dryRun);
    },
    insertRow: function(params, db, debug, dryRun){
        var arr = [];
        for(var colName in columnTypeMap){
            arr.push(params[colName]);
        }
        debug('insertRow: ' + arr);
        if(!dryRun){
            db.prepare(insertRowSql).run(arr);
        }
    },

    /**
      * @param callback - function(lastId) - if dryRun, or not an insert, lastId is null
      */ 
    run: function(sql, params, db, debug, dryRun, callback){
        debug('run - sql: '+sql+', params: '+params);
        if(dryRun){
            callback();
        }else{
            let result = db.prepare(sql).run(params);
            debug('last insert ID was: '+result.lastInsertROWID);
            callback(result.lastInsertROWID);
        }
    },

    /**
      * @param callback - function(row)
      */
    get: function(sql, params, db, debug, dryRun, callback){
        debug('get - sql: '+sql+', params: ['+params.join(', ')+']');
        let row = db.prepare(sql).get(params);
        callback(row);
    }

    // updateOrInsertRow: function(params, db, debug, dryRun){
    //     var arr = [];
    //     for(var colName in columnTypeMap){
    //         arr.push(params[colName]);
    //     }
    //     debug('insertRow: ' + arr);
    //     if(!dryRun){
    //         db.parallelize(function(){
    //             var insertRowStatement = db.prepare(insertRowSql);
    //             insertRowStatement.run(arr);
    //             insertRowStatement.finalize();
    //         });
    //     }
    // }
};