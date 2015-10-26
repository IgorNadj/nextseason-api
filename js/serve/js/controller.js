var apiReturn = function(response, err, data){
	if(err){
		response.statusCode = 500;
		response.end('500: Server Error');
		console.log('ERROR: ', err);
	}else{
		response.end(JSON.stringify(data));	
	}
	
};

exports.run = function(db, server){

	// server.registerAction('/api/shows/all', function(request, response, params){
	// 	db.all('SELECT s.*, e.* FROM show s LEFT JOIN next_unreleased_episode e ON (e.show_id = s.id) limit 5;', function(err, rows){
	// 		apiReturn(response, err, rows); 
	// 	});
	// });

	// server.registerAction('/api/shows/find', function(request, response, params){
	// 	var like = '%' + params.query + '%';
	// 	var stmt = db.prepare('SELECT * FROM show WHERE name LIKE ? LIMIT 10;');
	// 	stmt.all(like, function(err, rows){
	// 		apiReturn(response, err, rows);
	// 	});
	// 	stmt.finalize();
	// });

	// server.registerAction('/api/episodes/get', function(request, response, params){
	// 	var show_id = params.show_id;
	// 	var stmt = db.prepare('SELECT * FROM episode WHERE show_id = ?;');
	// 	stmt.all(show_id, function(err, rows){
	// 		apiReturn(response, err, rows);
	// 	});
	// 	stmt.finalize();
	// });

	// server.registerAction('/api/shows/returning/popular', function(request, response, params){
	// 	var MAX_COUNT = 100;
	// 	var start = params.start ? params.start : 0;
	// 	var limit = params.limit ? params.limit : MAX_COUNT;
	// 	if(limit > MAX_COUNT){
	// 		apiReturn(response, 'Max count is '+MAX_COUNT);
	// 		return;
	// 	}
	// 	var stmt = db.prepare(
	// 		'SELECT show.id AS show_id, show.name AS show_name, season_number, release_date_raw, release_date_timestamp '+
	// 		'FROM season_release '+
	// 		'LEFT JOIN show ON (show.id = season_release.show_id) '+
	// 		'WHERE season_release.release_date_timestamp > cast(strftime(\'%s\', \'now\') AS INTEGER) AND season_release.season_number > 1 '+
	// 		'ORDER BY season_release.release_date_timestamp, release_date_raw ASC '+
	// 		'LIMIT ? OFFSET ?;'
	// 	);
	// 	stmt.all(limit, start, function(err, rows){
	// 		apiReturn(response, err, rows);
	// 	});
	// });

	server.registerAction('/api/shows/returning/all', function(request, response, params){
		var MAX_COUNT = 100;
		var start = params.start ? params.start : 0;
		var limit = params.limit ? params.limit : MAX_COUNT;
		if(limit > MAX_COUNT){
			apiReturn(response, 'Max count is '+MAX_COUNT);
			return;
		}
		var stmt = db.prepare(
			'SELECT show.id AS show_id, show.name AS show_name, season_number, release_date_raw, release_date_timestamp, tmdb_id, tmdb_poster_path '+
			'FROM season_release '+
			'LEFT JOIN show ON (show.id = season_release.show_id) '+
			'LEFT JOIN show_extra ON (show.id = show_extra.show_id) '+
			'WHERE season_release.release_date_timestamp > cast(strftime(\'%s\', \'now\') AS INTEGER) AND season_release.season_number > 1 '+
			'ORDER BY season_release.release_date_timestamp, release_date_raw ASC '+
			'LIMIT ? OFFSET ?;'
		);
		stmt.all(limit, start, function(err, rows){
			apiReturn(response, err, rows);
		});
	});



};


