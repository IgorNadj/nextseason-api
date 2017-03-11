var fs = require('fs')
    ,http = require('http')
    ,concat = require('concat-stream')
    ,querystring = require('querystring')
    ,ProgressBar = require('progress')
    ,moment = require('moment');


const TMDB_API_KEY_FILE = '/config/tmdb_api_key';
const TMDB_API_PATH = 'http://api.themoviedb.org/3/discover/tv';

const MAX_API_PAGES = 500; // 500 x 20 per page = 1000 most popular shows

const DRY_RUN = true;


module.exports.run = function(db, basePath, debug, onDone){
	var tmdbApiKeyFilePath = basePath + TMDB_API_KEY_FILE;
	
	fs.readFile(tmdbApiKeyFilePath, function (err, data){
		if(err){
			console.log('This action requires file to exist: '+tmdbApiKeyFilePath+' which contains your themoviedb.org API key.');
			throw err;
		}
		var tmdbApiKey = data;
		debug('tmdbApiKey: '+tmdbApiKey);
		
		
		var dropSql = 'DROP TABLE IF EXISTS show_extra;';
		debug(dropSql);
		if (!DRY_RUN) {
			db.prepare(dropSql).run();
		}
		var createSql = 'CREATE TABLE show_extra (show_id INTEGER, name TEXT, first_air_date TEXT, tmdb_id INTEGER, tmdb_poster_path TEXT, tmdb_popularity REAL);';
		debug(createSql);
		if (!DRY_RUN) {
			db.prepare(createSql).run();
		}

		
		var progressBar = new ProgressBar('  Adding extra information [:bar] :percent :etas', {
			complete: '=',
			incomplete: ' ',
			width: 20,
			total: MAX_API_PAGES
		});

		var currentPageIndex = 0;

		var execNext = function(){
			if(currentPageIndex >= MAX_API_PAGES){
				debug('Reached MAX_API_PAGES, exiting');
				onDone();
				return;
			}
			debug('Page: '+currentPageIndex+' / '+MAX_API_PAGES);
			progressBar.tick(1);

			var tenYearsAgo = moment().subtract(10, 'years').format('YYYY-MM-DD');

			var url = TMDB_API_PATH + '?' + querystring.stringify({
		    	api_key: tmdbApiKey + '', // not sure why but we have to cast to string here
		    	language: 'en-US',
		    	sort_by: 'popularity.desc',
		    	page: (currentPageIndex+1),
		    	timezone: 'America/New_York',
		    	include_null_first_air_dates: false,
		    	'air_date.gte': tenYearsAgo // only shows with an episode out since this date
		    });
		    debug(url);
		    
			http.get(url, function(response){
				response.pipe(concat(function(body){
					// check rate limiting
					var retryAfter = response.headers['retry-after'] ? parseInt(response.headers['retry-after'], 10) : 0;
					if(retryAfter > 0){
						debug('Rate limiting, waiting: '+retryAfter+'ms');
						setTimeout(
							function(){
								// have to retry this, re-add it to the stack
								stack.push(row);
								execNext();
							},
							retryAfter/1000
						);
						return;
					}

					// otherwise lets go
					var respObj = JSON.parse(body);
					// debug(respObj);

					var insertIndex = 0;
					var insertNext = function(){
						var result = respObj.results[insertIndex];
						debug('result #'+insertIndex, result);
						if(!result){
							currentPageIndex++;
							execNext();
							return;
						}
						var posterPath = result.poster_path == 'null' ? null : result.poster_path;
						var insertSql = 'INSERT INTO show_extra '+
						'(show_id, name, first_air_date, tmdb_id, tmdb_poster_path, tmdb_popularity) VALUES '+
						'(?, ?, ?, ?, ?, ?);'
						var insertParams = [result.id, result.name, result.first_air_date, result.id, posterPath, result.popularity];
						var stmt = db.prepare(insertSql);
						debug('Running: '+insertSql+' with params: '+insertParams);
						if (!DRY_RUN) {
							stmt.run(insertParams);
						}
						insertIndex++;
						insertNext();
					}
					insertNext();
				}));

			}).on('error', function(e){
				throw e;
			});

		};

		// start stack execution
		execNext();

	});
};