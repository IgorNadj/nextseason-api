var fs = require('fs')
    ,FtpClient = require('ftp')
    ,zlib = require('zlib')
    ,iconv = require('iconv-lite');


const FTP_HOST = 'ftp.fu-berlin.de';
const REMOTE_LIST_FILE_GZ = '/pub/misc/movies/database/release-dates.list.gz';



module.exports.download = function(saveToPath, onlyIfNewerThanFilePath, debug, onDone){
	
	// don't overwrite
	var alreadyExists = false;
	try{
		fs.statSync(saveToPath);
		alreadyExists = true;
	}catch(e){
		debug(e);
		// does not exist, good
	}
	if(alreadyExists) throw 'File exists, move away and try again: '+saveToPath;

	// compare/download
	var localLastMod = 0;
	if(onlyIfNewerThanFilePath){
		try{
			localLastMod = fs.statSync(onlyIfNewerThanFilePath).mtime;
		}catch(e){
			// console.log(e);
			debug('Local list file does not exist, getting from FTP');
			localLastMod = 0;
		}
		debug('localLastMod: '+localLastMod);
	}

	var ftpClient = new FtpClient();
	var ftpOnDone = function(){
		ftpClient.end();
		onDone();
	};

	ftpClient.on('ready', function(){
		debug('FTP connected');

		ftpClient.lastMod(REMOTE_LIST_FILE_GZ, function(err, data){
			if(err) throw err;
			var remoteLastMod = data;
			debug('remoteLastMod: '+remoteLastMod);

			// console.log('remoteLastMod: '+remoteLastMod);
			// console.log('localLastMod: '+localLastMod);
			
			if(!onlyIfNewerThanFilePath || remoteLastMod > localLastMod){
				if(onlyIfNewerThanFilePath){
					debug('New list file available, downloading (no progress bar), this may take a while');
				}else{
					debug('Downloading (no progress bar), this may take a while');
				}
				
				ftpClient.get(REMOTE_LIST_FILE_GZ, function(err, downloadStream){
					if(err) throw err;

          			downloadStream
          				.pipe(zlib.createGunzip())
          				.pipe(iconv.decodeStream('win1250'))
          				.pipe(iconv.encodeStream('utf8'))
						.pipe(fs.createWriteStream(saveToPath))
						.on('finish', function(){
							debug('List file downloaded');
							ftpOnDone();
						});
				});

			}else{
				debug('Local file is up to date, no download necessary');
				ftpOnDone();
			}
		});
	});
	ftpClient.connect({
		host: FTP_HOST
	});


	
};