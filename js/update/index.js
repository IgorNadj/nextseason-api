var downloader = require('../download/downloader.js')
    ,fs = require('fs')
    ,es = require("event-stream")
    ,childProcess = require('child_process')
    ,parseFunctions = require('../parse/parse-functions')
    ,dbFunctions = require('../parse/db-functions.js')
    ,helperFunctions = require('../parse/helper-functions.js');


const LOCAL_LIST_FILE = '/res/lists/release-dates.list';
const LOCAL_LIST_FILE_NEW = '/res/lists/release-dates.list.new';
const CHANGES_LIST_FILE = '/res/lists/release-dates.list.changes';
const DIFF_SCRIPT_PATH = '/res/scripts/diff.sh';

const DRY_RUN = false;
const SKIP_FIRST_N_LINES = 2; // first two lines in diff will be CRC and date
const MAX_LINE = null; // null for unlimited




var dryRun = DRY_RUN;
var fileExists = function(path, debug){
	var exists = false;
	try{
		fs.accessSync(path);
		exists = true;
	}catch(e){
		debug(e);
	}
	return exists;
}



module.exports.run = function(db, basePath, debug, onDone){
	var localListPath = basePath + LOCAL_LIST_FILE;
	var newListPath = basePath + LOCAL_LIST_FILE_NEW;
	var changesListPath = basePath + CHANGES_LIST_FILE;
	var diffScriptPath = basePath + DIFF_SCRIPT_PATH;

	// check prerequites
	if(!fileExists(localListPath, debug)) throw 'List list file ('+localListPath+') does not exist, have you run download?';
	if(fileExists(newListPath, debug)) throw 'File exists, move away and try again: '+newListPath;
	if(fileExists(changesListPath, debug)) throw 'File exists, move away and try again: '+changesListPath;

	var cleanupAndReturn = function(){
		// 1. delete changes file
		fs.unlinkSync(changesListPath);
		// 2. delete old list
		fs.unlinkSync(localListPath);
		// 3. rename new list to be "old" list
		fs.renameSync(newListPath, localListPath);
		// done
		onDone();
	};

	// Init
	parseFunctions.init(basePath);

	// Run
	console.log('Step 1. Download newer list');
	downloader.download(newListPath, localListPath, debug, function(){
		if(!fileExists(newListPath, debug)){
			console.log('No new list, exiting');
			onDone();
			return;
		}

		console.log('Step 2. Compare');

		var diffArgs = [localListPath, newListPath, changesListPath];
		debug('About to run: '+diffScriptPath+' '+diffArgs.join(' '));
		var diffProcess = childProcess.spawn(diffScriptPath, diffArgs);
		
		var processOutput = '';
		diffProcess.on('data', function(data){
			processOutput += data;
			debug('Process output: '+data);
		});

		diffProcess.on('close', function(code){
			if(code !== 0) throw 'Process errored, code: '+code+', output: '+processOutput;
			
			console.log('Step 3. Parse');
			var progressBar = MAX_LINE ? helperFunctions.fromNumLines(MAX_LINE) : helperFunctions.fromFile(changesListPath);
			var lineNumber = 0;
			var inputStream = fs.createReadStream(changesListPath)
			.pipe(es.split())
			.pipe(
		        es.mapSync(function(line){

		            // pause the readstream
		            inputStream.pause();

					var nextLine = function(){
                    	// resume the readstream
                    	// use setTimeout-0 to avoid big call stack
                    	setTimeout(inputStream.resume, 0);
                    };

					lineNumber += 1;
		            
		            (function(){
		            	var skip = false;

	                    // debug('#'+lineNumber+': '+line);
	                    if(lineNumber <= SKIP_FIRST_N_LINES){
	                    	debug('Skipping line (SKIP_FIRST_N_LINES): '+SKIP_FIRST_N_LINES);
	                    	skip = true;
	                    }
	                    if(MAX_LINE && lineNumber >= MAX_LINE){
	                    	debug('Reached MAX_LINE ('+MAX_LINE+'), exiting');
	                    	inputStream.close();
	                    	return;
	                    }
	                    if(line == ''){
	                    	debug('Blank line, skipping');
	                    	skip = true;
	                    }



	                    if(skip){
	                    	nextLine();
	                    }else{
	                    	progressBar.tick();
		                    var parsed = parseFunctions.parseLine(line, lineNumber);

		                    if(!parsed){
		                    	nextLine();

		                    }else{
		                        debug(parsed);

		                        // update database (normalised tables)
		                        

		                        /**
		                          * @param callback - function(showId)
		                          */
		                        var getOrCreateShow = function(callback){
		                        	debug('getOrCreateShow');
		                        	dbFunctions.get(
		                        		'SELECT id FROM show WHERE name = ? AND year = ?;', 
		                        		[parsed.show_name, parsed.show_year], 
		                        		db,
		                        		debug, 
		                        		dryRun, 
		                        		function(row){
		                        			if(row){
												debug('Show exists: '+row.id);
												callback(row.id);
		                        			}else{
		                        				debug('Show missing, creating');
		                        				dbFunctions.run(
		                        					'INSERT INTO show (name, year) VALUES (?, ?);',
		                        					[parsed.show_name, parsed.show_year],
		                        					db,
		                        					debug,
		                        					dryRun,
		                        					function(showId){
		                        						debug('Created show: '+showId);
		                        						callback(showId);
		                        					}
		                        				);
		                        			}
		                        		}
		                        	);
		                        };

		                        /**
		                          * @param callback - function(showId, seasonId)
		                          */
		                        var getOrCreateSeason = function(showId, callback){
		                        	debug('getOrCreateSeason: '+ showId);
		                        	if(!showId) throw 'showId required';
		                        	if(!parsed.season_number){
		                        		debug('No season_number, skipping');
		                        		nextLine();
		                        		return;
		                        	}
		                        	dbFunctions.get(
		                        		'SELECT id FROM season WHERE show_id = ? AND number = ?;',
		                        		[showId, parsed.season_number],
		                        		db,
		                        		debug,
		                        		dryRun,
		                        		function(row){
		                        			if(row){
		                        				debug('Season exists: '+row.id);
												callback(showId, row.id);
		                        			}else{
												debug('Season missing, creating');
		                        				dbFunctions.run(
		                        					'INSERT INTO season (show_id, number) VALUES (?, ?);',
		                        					[showId, parsed.season_number],
		                        					db,
		                        					debug,
		                        					dryRun,
		                        					function(seasonId){
		                        						debug('Created season: '+seasonId);
		                        						callback(showId, seasonId);
		                        					}
		                        				);
		                        			}
		                        		}
		                        	);
		                        };

		                        /**
		                          * Get or create episode row stub (just id)
		                          * @param callback - function(showId, seasonId, episodeId)
		                          */
		                        var getOrCreateEpisodeStub = function(showId, seasonId, callback){
		                        	debug('getOrCreateEpisodeStub: '+showId+', '+seasonId);
		                        	if(!showId) throw 'showId required';
		                        	if(!seasonId) throw 'seasonId required';
		                        	if(!parsed.episode_number){
		                        		debug('No episode_number, skipping');
		                        		nextLine();
		                        		return;
		                        	}
		                        	dbFunctions.get(
		                        		'SELECT id FROM episode WHERE show_id = ? AND season_id = ? AND number = ?;',
		                        		[showId, seasonId, parsed.episode_number],
		                        		db,
		                        		debug,
		                        		dryRun,
		                        		function(row){
		                        			if(row){
		                        				debug('Episode exists: '+row.id);
												callback(showId, seasonId, row.id);
		                        			}else{
		                        				debug('Episode missing, creating stub');
		                        				dbFunctions.run(
		                        					'INSERT INTO episode (name) VALUES (?);',
		                        					['stub'],
		                        					db,
		                        					debug,
		                        					dryRun,
		                        					function(episodeId){
		                        						debug('Created episode stub: '+episodeId);
		                        						callback(showId, seasonId, episodeId);
		                        					}
		                        				);
		                        			}
		                        		}
		                        	);
		                        };

		                        /**
		                          * @param callback - function()
		                          */
		                        var updateEpisode = function(showId, seasonId, episodeId, callback){
		                        	debug('updateEpisode');
		                        	if(!showId) throw 'showId required';
		                        	if(!seasonId) throw 'seasonId required';
		                        	if(!episodeId) throw 'episodeId required';
		                        	var colsArr = ['show_id', 'season_id', 'name', 'number', 'release_date_raw', 'release_date_timestamp', 'release_date_location', 'location_filmed'];
                    				var updateStringArr = [];
                    				var params = [showId, seasonId, parsed.episode_name, parsed.episode_number, parsed.release_date_raw, parsed.release_date_timestamp, parsed.release_date_location, parsed.location_filmed, episodeId];
                    				for(var i in colsArr){
                    					var col = colsArr[i];
                    					updateStringArr.push(col+' = ?');
                    				}
                    				dbFunctions.run(
                    					'UPDATE episode SET '+updateStringArr.join(', ')+' WHERE id = ?;',
                    					params,
                    					db,
                    					debug,
                    					dryRun,
                    					function(){
                    						debug('Updated episode: '+episodeId);
                    						callback();
                    					}
                    				);
		                        };


		                        // run
		                        getOrCreateShow(function(showId){
		                        	getOrCreateSeason(showId, function(showId, seasonId){
		                        		getOrCreateEpisodeStub(showId, seasonId, function(showId, seasonId, episodeId){
		                        			updateEpisode(showId, seasonId, episodeId, function(){
		                        				debug('Line done');
		                        				nextLine();
		                        			});
		                        		});
		                        	});
		                        });

		                    }
		                }

		                

		            })();
		        })
		        .on('error', function(){
		            console.log('Error while reading file.');
		            process.exit(1);
		        })
		        .on('end', function(){
		            console.log(' ');
		            console.log('Update of normalised tables finished. Note: you still need to run the other actions after normalise.');
		            cleanupAndReturn();
		        })
		    );
		});

	});
	
};