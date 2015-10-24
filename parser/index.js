var fs = require('fs')
    ,sqlite3 = require('sqlite3')
    ,parser = require('./js/parser.js')
    ,normalise = require('./js/normalise.js');



const LIST_FILE = 'lists/release-dates.list';
const DB_FILE = 'db/db.sqlite';
const DEBUG_ENABLED = false;
const DRY_RUN = false;


var runWhat = process.argv[2] ? process.argv[2] : 'all';
console.log('running ' + runWhat);



if(DRY_RUN) console.log('DRY RUN, WILL NOT WRITE TO DATABASE');
sqlite3.verbose();
var db = new sqlite3.Database(DB_FILE);
var debug = function(str){
    if(DEBUG_ENABLED) console.log(str);
}





db.serialize(function(){
    // TODO: use promises instead
    var runIndex = 0;
    var toRun = [];
    var runNext = function(){
        if(!toRun[runIndex]) return;
        var f = toRun[runIndex];
        runIndex++;
        f();
    };
    var runParse = function(){
        parser.parse(db, LIST_FILE, debug, DRY_RUN, runNext);
    };
    var runNormalise = function(){
        normalise.normalise(db, debug, DRY_RUN, runNext);
    };
    var runDone = function(){
        db.close(function(){
            console.log('Done');
        });
    };
    if(runWhat == 'parse'){
        toRun.push(runParse);
    }else if(runWhat == 'normalise'){
        toRun.push(runNormalise);
    }else if(runWhat == 'all'){
        toRun.push(runParse);
        toRun.push(runNormalise);
    }else{
        console.log('Error: action not found: '+runWhat);
    }
    toRun.push(runDone);
    runNext();
});
