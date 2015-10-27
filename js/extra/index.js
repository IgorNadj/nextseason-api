var fs = require('fs')
    ,http = require('http')
    ,concat = require('concat-stream')
    ,querystring = require('querystring')
    ,sleep = require('sleep')
    ,ProgressBar = require('progress');



const TMDB_API_KEY_FILE = '/config/tmdb_api_key';
const TMDB_API_PATH = 'http://api.themoviedb.org/3/search/tv';




module.exports.run = function(db, basePath, debug, onDone){
	var tmdbApiKeyFilePath = basePath + TMDB_API_KEY_FILE;
	
	fs.readFile(tmdbApiKeyFilePath, function (err, data){
		if(err){
			console.log('This action requires file to exist: '+tmdbApiKeyFilePath+' which contains your themoviedb.org API key.');
			throw err;
		}
		var tmdbApiKey = data;
		debug('tmdbApiKey: '+tmdbApiKey);
		
		db.serialize(function(){
			/*
			 * Note: we don't drop this table because the data doesn't change that much, and API calls are relatively expensive.
			 * If you have column changes you will need to drop the table manually and re-run this action.
			 */
			var createSql = 'CREATE TABLE IF NOT EXISTS show_extra (show_id INTEGER, tmdb_id INTEGER, tmdb_poster_path TEXT, tmdb_popularity REAL);';
			debug(createSql);
			db.run(createSql);

			var selectMissingSql = ''+
			'SELECT DISTINCT show.id AS show_id, show.name AS show_name '+
			'FROM season_release '+
			'LEFT JOIN show ON (season_release.show_id = show.id) '+
			'LEFT JOIN show_extra ON (show.id = show_extra.show_id) '+
			'WHERE show_extra.show_id IS NULL AND release_date_timestamp > cast(strftime(\'%s\', \'now\') AS INTEGER);';

			db.all(selectMissingSql, function(err, rows){
				if(err) throw err;

				var stack = rows;
				
				var progressBar = new ProgressBar('  Adding extra information [:bar] :percent :etas', {
					complete: '=',
					incomplete: ' ',
					width: 20,
					total: stack.length
				});

				var execNext = function(){
					var row = stack.pop();
					if(!row){
						debug('All rows executed, exiting');
						onDone();
						return;
					}
					progressBar.tick(1);

					var url = TMDB_API_PATH + '?' + querystring.stringify({
				    	api_key: tmdbApiKey + '', // not sure why but we have to cast to string here
				    	query: row.show_name
				    });
				    debug(url);
				    
					http.get(url, function(response){
						response.pipe(concat(function(body){
							var respObj = JSON.parse(body);
							debug(respObj);

							var insertSql;
							if(respObj.total_results != 1){
								// show not found, or too many shows found, note this so we dont query again
								insertSql = 'INSERT INTO show_extra (show_id) VALUES ('+row.show_id+');';
								debug('Show not found / too many shows found');

							}else{
								var respRow = respObj.results[0];
								var posterPath = respRow.poster_path == 'null' ? null : respRow.poster_path;
								var posterPathSql = posterPath ? ('\'' + posterPath + '\'') : 'NULL';
								insertSql = 'INSERT INTO show_extra (show_id, tmdb_id, tmdb_poster_path, tmdb_popularity) VALUES '+
								'(' + row.show_id + ', ' + respRow.id + ', ' + posterPathSql + ', ' + respRow.popularity + ');';
							}

							// rate limiting
							var retryAfter = response.headers['retry-after'] ? parseInt(response.headers['retry-after'], 10) : 0;
							debug('retryAfter: '+retryAfter);
							if(retryAfter > 0){
								debug('Rate limiting, waiting: '+retryAfter+'s');
								sleep.sleep(retryAfter);
								// have to retry this, re-add it to the stack
								stack.push(row);
								execNext();
							}else{
								debug(insertSql);
								db.run(insertSql);
								execNext();
							}
								
						}));

					}).on('error', function(e){
						throw e;
					});

				};

				// start stack execution
				execNext();

			});

            
        }); 

	});
};