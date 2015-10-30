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

	server.registerAction('/api/shows/returning/popular', function(request, response, params){
		var MAX_COUNT = 100;
		var MIN_POPULARITY = 0.9;
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
			'WHERE season_release.release_date_timestamp > cast(strftime(\'%s\', \'now\') AS INTEGER) AND season_release.season_number > 1 AND tmdb_popularity > '+MIN_POPULARITY+' '+
			'ORDER BY season_release.release_date_timestamp, release_date_raw ASC '+
			'LIMIT ? OFFSET ?;'
		);
		stmt.all(limit, start, function(err, rows){
			apiReturn(response, err, rows);
		});
	});

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

	server.registerAction('/api/show', function(request, response, params){
		var id = params.id;
		var stmt = db.prepare(
			'SELECT show.id AS show_id, show.name AS show_name, season_number, release_date_raw, release_date_timestamp, tmdb_id, tmdb_poster_path '+
			'FROM season_release '+
			'LEFT JOIN show ON (show.id = season_release.show_id) '+
			'LEFT JOIN show_extra ON (show.id = show_extra.show_id) '+
			'WHERE show.id = ? AND '+
			'season_release.release_date_timestamp > cast(strftime(\'%s\', \'now\') AS INTEGER) AND season_release.season_number > 1;'
		);
		stmt.all(id, function(err, rows){
			apiReturn(response, err, rows);
		});
	});

	server.registerAction('/api/shows/autocomplete', function(request, response, params){
		var q = params.q;
		if(!q){
			apiReturn(response, 'Param q required');
			return;
		}
		var qWrapped = '%' + q + '%';
		var stmt = db.prepare('SELECT id, name FROM show WHERE name LIKE ? LIMIT 10;');
		stmt.all(qWrapped, function(err, rows){
			apiReturn(response, err, rows);
		});
	});

};


