var fs = require('fs')
    ,es = require("event-stream")
    ,helperFunctions = require('./helper-functions')
    ,parseFunctions = require('./parse-functions')
    ,dbFunctions = require('./db-functions.js')
    ,extraHelperFunctions = require('../extra/helper-functions');




const LIST_FILE = '/res/lists/release-dates.list';
const DRY_RUN = false;
const START_LINE = 0;
const MAX_LINE = null; // null for unlimited
const ONLY_POPULAR_SHOWS = true;
const MAX_FAILED_LINES = 100;





module.exports.run = function(db, basePath, debug, onDone){
    var dryRun = DRY_RUN;
    var listFilePath = basePath + LIST_FILE;
    if(dryRun) console.log('DRY RUN, WILL NOT WRITE TO DATABASE');
    
    var progressBar = MAX_LINE ? helperFunctions.fromNumLines(MAX_LINE) : helperFunctions.fromFile(listFilePath);

    init();

    function init(){
        parseFunctions.init(basePath);
        dbFunctions.dropAndCreateTable(db, debug, dryRun);
        extraHelperFunctions.init(db, debug, run);
    }

    function run(){
        var lineNumber = 0;
        var inHeaderSection = true
        var inFooterSection = false;
        var failedLines = [];
        var numFailedLines = 0;

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
                    if(numFailedLines > MAX_FAILED_LINES) skip = true;

                    if(!skip){
                        progressBar.tick();
                        debug('#'+lineNumber+': '+line);

                        var parsed = parseFunctions.parseLine(line, lineNumber);
                        if(parsed){
                            //debug(parsed);

                            var willInsert = true;
                            if(ONLY_POPULAR_SHOWS){
                                var extraShowId = extraHelperFunctions.isPopular(parsed.show_name, parsed.show_year);
                                debug(parsed);
                                debug('extraShowId: '+extraShowId);
                                if(extraShowId === false){
                                    // skip it, not popular enough
                                    willInsert = false;
                                }else{
                                    // ooh so popular!
                                    parsed.extra_show_id = extraShowId;
                                }
                            }
                            if(willInsert){
                                dbFunctions.insertRow(parsed, db, debug, dryRun);
                            }
                        }else if(parsed ===false){
                            failedLines.push('#'+lineNumber+': '+line);
                            numFailedLines++;
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
                if(failedLines.length > 0){
                    console.log('Failed to parse '+failedLines.length+' lines');
                    for(var i in failedLines){
                        var line = failedLines[i];
                        console.log(line);
                    }
                }
                console.log('Parsing finished.');
                onDone();
            })
        );
    };
};
