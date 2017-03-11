var fs = require('fs')
    ,FtpClient = require('ftp')
    ,zlib = require('zlib')
    ,iconv = require('iconv-lite');


const FTP_HOST = 'ftp.fu-berlin.de';
const REMOTE_LIST_FILE_GZ = '/pub/misc/movies/database/release-dates.list.gz';


var ftpClient = null;
var ftpClientCallbacks = [];
var ftpClientInitializing = false;
var ftpClientReady = false;
function initFtpClient(debug, callback){
	if(ftpClientReady){
		callback();
		return;
	}
	ftpClientCallbacks.push(callback);
	if (!ftpClientInitializing) {
		ftpClientInitializing = true;
		ftpClient = new FtpClient();
		ftpClient.on('error', function(err){
			throw err;
		});
		ftpClient.connect({
			host: FTP_HOST
		});
		ftpClient.on('ready', function(){
			debug('FTP connected');
			ftpClientReady = true;
			for(var ftpClientCallback of ftpClientCallbacks){
				ftpClientCallback();
			}
		});
	}
}

module.exports.newerFileExists = function(filePath, debug, callback){

	var localLastMod = 0;
	try{
		localLastMod = fs.statSync(filePath).mtime;
	}catch(e){
		debug('Local list file does not exist'+e);
		callback(true);
		return;
	}
	debug('localLastMod: '+localLastMod);
	if (!localLastMod) {
		callback(false);
		return;
	}

	initFtpClient(debug, function(){
		ftpClient.lastMod(REMOTE_LIST_FILE_GZ, function(err, data){
			if(err) throw err;
			var remoteLastMod = data;
			debug('remoteLastMod: '+remoteLastMod);
			callback(remoteLastMod > localLastMod);
			return;
		});
	});
}

module.exports.download = function(saveToPath, debug, onDone){
	
	var alreadyExists = false;
	try{
		fs.statSync(saveToPath);
		alreadyExists = true;
	}catch(e){
		debug('File does not exist:'+e);
		// does not exist, good
	}
	if(alreadyExists) throw 'File exists, move away and try again: '+saveToPath;

	debug('Ready to download file');

	initFtpClient(debug, function(){
		debug('Downloading file');
		ftpClient.get(REMOTE_LIST_FILE_GZ, function(err, downloadStream){
			if(err) throw err;

			downloadStream
				.pipe(zlib.createGunzip())
				.pipe(iconv.decodeStream('win1250'))
				.pipe(iconv.encodeStream('utf8'))
			.pipe(fs.createWriteStream(saveToPath))
			.on('finish', function(){
				debug('List file downloaded and decoded');
				onDone();
			});
		});
	});
	
};

module.exports.close = function(){
	if(ftpClient){
		try{
			ftpClient.end();
		}catch(e){
			console.log('Failed to close ftp client:'+e);
		}
	}
}