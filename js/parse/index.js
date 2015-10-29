var fs = require('fs')
    ,PEG = require("pegjs")
    ,es = require("event-stream")
    ,exec = require('child_process').exec
    ,ProgressBar = require('progress');




const LIST_FILE = '/res/lists/converted/release-dates.list';
const GRAMMAR_FILE = '/res/grammar/grammar.peg';
const DRY_RUN = false;
const START_LINE = 0;
const MAX_LINE = null; // null for unlimited





module.exports.run = function(db, basePath, debug, onDone){
    var columnTypeMap = {
        show_name:              'TEXT',
        show_year:              'INTEGER',
        episode_name:           'TEXT', 
        season_number:          'INTEGER',
        episode_number:         'INTEGER', 
        release_date_raw:       'TEXT',
        release_date_timestamp: 'INTEGER',
        release_date_location:  'TEXT',
        location_filmed:        'TEXT'
    }

    var listFilePath = basePath + LIST_FILE;
    var grammarFilePath = basePath + GRAMMAR_FILE;


    // Helper functions
    var colNameArray = [];
    var colDefArray = [];
    var colPlaceholderArray = [];
    for(var colName in columnTypeMap){
        colNameArray.push(colName);
        colDefArray.push(colName + ' ' + columnTypeMap[colName]);
        colPlaceholderArray.push('?');
    }
    var colNameStr = colNameArray.join(', ');
    var colDefStr = colDefArray.join(', ');
    var colPlaceholderStr = colPlaceholderArray.join(', ');

    var insertRowSql = 'INSERT INTO release_date ('+colNameStr+') VALUES ('+colPlaceholderArray+');';


    var insertRow = function(params, db, debug){
        var arr = [];
        for(var colName in columnTypeMap){
            arr.push(params[colName]);
        }
        debug('insertRow: ' + arr);
        if(!DRY_RUN){
            db.parallelize(function(){
                var insertRowStatement = db.prepare(insertRowSql);
                insertRowStatement.run(arr);
                insertRowStatement.finalize();
            });
        }
    }
    var query = function(sql, db, debug){
        debug(sql);
        if(!DRY_RUN){
            db.serialize(function(){
                db.run(sql);
            });
        }
    }
    var logParseError = function(e, lineNumber, line){
        console.log('PARSE ERROR AT LINE: '+lineNumber);
        console.log(line);
        if(e.location && e.location.start && e.location.start.offset){
            var str = '';
            for(var i = 0; i < e.location.start.offset; i++){
                if(line.charAt(i) === '\t'){
                    str += '\t';
                }else{
                    str += ' ';    
                }
            }
            console.log(str + '^');
        }
        console.log(e.message);
        console.log(e);
    }

    // progress bar
    var progressBar = null;
    var setupProgressBar = function(numLines){
        progressBar = new ProgressBar('  Parsing [:bar] :percent :etas', {
            complete: '=',
            incomplete: ' ',
            width: 20,
            total: numLines
        });
    }
    if(MAX_LINE){
        setupProgressBar(MAX_LINE);
    }else{
        exec('cat '+listFilePath+' | wc -l', function(err, r){
            if(err) return; // (most likely no wc) not a core function, ignore 
            setupProgressBar(parseInt(r));
        });
    }
    



    // Prep
    if(DRY_RUN) console.log('DRY RUN, WILL NOT WRITE TO DATABASE');
    debug('insertRowSql: ' + insertRowSql);
    var grammar = fs.readFileSync(grammarFilePath, 'utf-8');
    var pegParser = PEG.buildParser(grammar);

    // Run
    query('DROP TABLE IF EXISTS release_date;', db, debug)
    query('CREATE TABLE release_date ('+colDefStr+');', db, debug);

    var lineNumber = 0;
    var inHeaderSection = true
    var inFooterSection = false;
    var numParseErrors = 0;
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
                    if(progressBar) progressBar.tick(1);
                    debug('#'+lineNumber+': '+line);

                    var parsed = null;
                    try{
                        parsed = pegParser.parse(line)[0];
                    }catch(e){
                        logParseError(e, lineNumber, line);
                        process.exit(1); 
                    }
                    if(parsed){
                        debug(parsed);
                        insertRow(parsed, db, debug);
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
            console.log('Parsing finished. Now please wait for the database to be updated. This will take a while.');
            // TODO: can we get the database to be updated sooner? maybe don't run insertRow inside serialize?
            onDone();
        })
    );
};
