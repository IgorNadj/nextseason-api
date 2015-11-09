var fs = require('fs')
    ,es = require("event-stream")
    ,helperFunctions = require('./helper-functions')
    ,parseFunctions = require('./parse-functions')
    ,dbFunctions = require('./db-functions.js');




const LIST_FILE = '/res/lists/release-dates.list';
const DRY_RUN = false;
const START_LINE = 0;
const MAX_LINE = null; // null for unlimited





module.exports.run = function(db, basePath, debug, onDone){
    var dryRun = DRY_RUN;
    var listFilePath = basePath + LIST_FILE;
    if(dryRun) console.log('DRY RUN, WILL NOT WRITE TO DATABASE');
    
    // Init
    parseFunctions.init(basePath);
    var progressBar = MAX_LINE ? helperFunctions.fromNumLines(MAX_LINE) : helperFunctions.fromFile(listFilePath);

    // Run    
    dbFunctions.dropAndCreateTable(db, debug, dryRun);

    var lineNumber = 0;
    var inHeaderSection = true
    var inFooterSection = false;
    var inputStream = fs.createReadStream(listFilePath)
    .pipe(es.split())
    .pipe(
        es.mapSync(function(line){

            // pause the readstream
            inputStream.pause();
            lineNumber += 1;
            
            (function(){
                var skip = false;
                if(inHeaderSection){
                    if(line == '==================') inHeaderSection = false;
                    skip = true;
                }
                if(inFooterSection || line == '--------------------------------------------------------------------------------'){
                    inFooterSection = true;
                    skip = true;
                }
                if(lineNumber < START_LINE) skip = true;
                if(MAX_LINE && lineNumber > MAX_LINE) skip = true;

                if(!skip){
                    progressBar.tick();
                    debug('#'+lineNumber+': '+line);

                    var parsed = parseFunctions.parseLine(line, lineNumber);
                    if(parsed){
                        debug(parsed);
                        dbFunctions.insertRow(parsed, db, debug, dryRun);
                    }
                    
                }

                // resume the readstream
                inputStream.resume();

            })();
        })
        .on('error', function(){
            console.log('Error while reading file.');
            process.exit(1);
        })
        .on('end', function(){
            console.log(' ');
            console.log('Parsing finished. Now please wait for the database to be updated. This will take a while.');
            onDone();
        })
    );
};
