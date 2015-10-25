var fs = require('fs')
    ,util = require('util')
    ,FtpClient = require('ftp')
    ,zlib = require('zlib');



const LOCAL_LIST_FILE = '/res/lists/release-dates.list';
const FTP_HOST = 'ftp.fu-berlin.de';
const REMOTE_LIST_FILE_GZ = '/pub/misc/movies/database/release-dates.list.gz';



module.exports.run = function(db, basePath, debug, onDone){
	var localListFilePath = basePath + LOCAL_LIST_FILE;
	var localListFileLastMod = fs.statSync(localListFilePath).mtime;
	debug('localListFileLastMod: '+localListFileLastMod);

	var ftpClient = new FtpClient();
	var ftpOnDone = function(){
		ftpClient.end();
		onDone();
	};

	ftpClient.on('ready', function(){
		debug('FTP connected');

		ftpClient.lastMod(REMOTE_LIST_FILE_GZ, function(err, data){
			if(err) throw err;
			var remoteListFileLastMod = data;
			debug('remoteListFileLastMod: '+remoteListFileLastMod);

			if(remoteListFileLastMod > localListFileLastMod){
				debug('New list file available');

				ftpClient.get(REMOTE_LIST_FILE_GZ, function(err, stream){
					if(err) throw err;

					var gunzip = zlib.createGunzip();
					var outStream = fs.createWriteStream(localListFilePath);

					stream.pipe(gunzip).pipe(outStream);
					stream.on('finish', function(){
						debug('List file updated');
						ftpOnDone();
					});
				});

			}else{
				debug('Local file is up to date, no update necessary');
				ftpOnDone();
			}
		});
	});
	ftpClient.connect({
		host: FTP_HOST
	});


	
};