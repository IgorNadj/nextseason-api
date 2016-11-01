var PEG = require('pegjs')
   ,fs = require('fs');


const GRAMMAR_FILE = '/res/grammar/grammar.peg';


var pegParser;


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
};

var progressBarFromFile = function(file){
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

    
    return {
        tick: function(){

        }
    }
};


module.exports = {
	init: function(basePath){
		var grammarFilePath = basePath + GRAMMAR_FILE;
		var grammar = fs.readFileSync(grammarFilePath, 'utf-8');
		pegParser = PEG.buildParser(grammar);	
	},
	parseLine: function(line, lineNumber){
		try{
			return pegParser.parse(line)[0];
		}catch(e){
			logParseError(e, lineNumber, line);
			throw e;
		}
	}
};