var fs = require('fs');


const EXPORT_FILE = '/res/exports/export.json';


module.exports.run = function(db, basePath, debug, onDone){
    var exportFilePath = basePath + EXPORT_FILE;

    var rows = db.prepare(`
    	SELECT 
    		s.extra_show_id AS tmdbId, 
    		s.name, 
    		s.year, 
    		sr.season_number, 
    		sr.release_date_timestamp, 
    		sr.release_date_location 
    	FROM show s 
    	INNER JOIN (
    		SELECT 
    			season_id, 
    			show_id, 
    			MIN(season_number) as max_season_number 
    		FROM 
    			season_release 
            WHERE 
                release_date_timestamp > strftime('%s', 'now')
    		GROUP BY 
    			show_id
    	) srmax 
    		ON (s.id = srmax.show_id) 
    	LEFT JOIN 
    		season_release sr 
    		ON (sr.show_id = s.id AND srmax.season_id = sr.season_id)
        ;`
    ).all();

    // convert from flat structure to nested
    var out = {
    	shows: {}, // keyed by tmdbId
    	exportTime: (new Date().getTime() / 1000) // second precision timestamp
    };

    for (var row of rows) {
    	var tmdbId = row.tmdbId;
    	if (!out[tmdbId]) {
    		out['shows'][tmdbId] = {
    			tmdbId: tmdbId,
    			name: row.name,
    			year: row.year,
    			nextSeasonNumber: row.season_number,
    			seasonReleases: {} // map of location -> release date timestamp
    		};
    	}
    	out['shows'][tmdbId]['seasonReleases'][row.release_date_location] = row.release_date_timestamp;
    }

    var str = JSON.stringify(out);
    fs.writeFile(exportFilePath, str, function(err) {
	    if(err) {
	        throw err;
	    }	    
	    debug('Exported file');
	    onDone();
	}); 
};