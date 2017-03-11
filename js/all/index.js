var downloader = require('../download/downloader.js')
    ,parse = require('../parse/index.js')
    ,extra = require('../extra/index.js')
    ,normalise = require('../normalise/index.js')
    ,exporter = require('../export/index.js')
    ,fs = require('fs')
    ,rotate = require('log-rotate');


const LIST_FILE = '/res/lists/release-dates.list';


var fileExists = function(path, debug){
	var exists = false;
	try{
		fs.accessSync(path);
		exists = true;
	}catch(e){
		debug('fileExists'+e);
	}
	return exists;
}



module.exports.run = function(db, basePath, debug, onDone, forceUpdate){

	var listPath = basePath + LIST_FILE;

	// Run
	stepCheckIfNewerListExists();

	// Steps
	function stepCheckIfNewerListExists(){
		console.log('STEP: Check if newer list file exists');
		downloader.newerFileExists(listPath, debug, function(newerFileExists){
			if (newerFileExists){
				console.log('  newer file exists');
				stepMoveAwayCurrentListFile();
			}else{
				if(forceUpdate){
					console.log('  no newer list file exists, but forceUpdate specified');
					stepMoveAwayCurrentListFile();
				}else{
					console.log('  no newer list file exists');
					noMoreSteps();
				}
			}
		});
	}

	function stepMoveAwayCurrentListFile(){
		if (fileExists(listPath, debug)){
			// current list file exists, back it up somewhere
			debug('backing up list file');
			var backupListPath = listPath + '.older';
			if (fileExists(backupListPath, debug)){
				// backup exists too, remove it (only one backup is fine)
				debug('backup exists, deleting it');
				fs.unlinkSync(backupListPath);
			}
			fs.renameSync(listPath, backupListPath);
			debug('backed up '+listPath+' to '+backupListPath);
		}
		stepDownloadList();
	}

	function stepDownloadList(){
		console.log('STEP: Download list');
		downloader.download(listPath, debug, stepExtra);
	}

	function stepExtra(){
		console.log('STEP: Get most popular shows');
		extra.run(db, basePath, debug, stepParse);
	}

	function stepParse(){
		console.log('STEP: Parse');
		parse.run(db, basePath, debug, stepNormalise);
	}

	function stepNormalise(){
		console.log('STEP: Normalise');
		normalise.run(db, basePath, debug, stepExport);
	}

	function stepExport(){
		console.log('STEP: Export');
		exporter.run(db, basePath, debug, noMoreSteps);
	}

	function noMoreSteps(){
		console.log('All Steps Done');
		downloader.close();
		onDone();
	}
	
};