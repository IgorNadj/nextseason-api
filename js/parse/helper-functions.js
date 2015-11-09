var ProgressBar = require('progress')
   ,exec = require('child_process').exec; 




var createProgressBar = function(numLines){
    return new ProgressBar('  Parsing [:bar] :percent :etas', {
        complete: '=',
        incomplete: ' ',
        width: 20,
        total: numLines
    });
}


module.exports = {
    fromFile: function(filePath){
        var progressBar = null
        var missedTicks = 0; 
        exec('cat '+filePath+' | wc -l', function(err, r){
            if(err) return; // (most likely no wc) not a core function, ignore 
            var numLines = parseInt(r.trim(), 10);
            progressBar = createProgressBar(numLines);         
        });
        return {
            tick: function(){
                if(progressBar){
                    progressBar.tick(1);
                }else{
                    missedTicks++;
                }
            }
        }
    },
    fromNumLines: function(numLines){
        var progressBar = createProgressBar(numLines);
        return {
            tick: function(){
                progressBar.tick(1);
            }
        }
    }
}

