
// map of show_name+'|'+year -> show_id
var cache = {};

module.exports = {
    init: function(db, debug, callback){
        let rows = db.prepare('SELECT show_id, name, first_air_date FROM show_extra;').all();
        for(var i in rows){
            var row = rows[i];
            var year = row.first_air_date.split('-')[0];
            cache[row.name + '|' + year] = row.show_id;
        }
        debug('rows', rows.length);
        debug('cache', cache);
        callback();
    },

    /*
     * @return false|int - false if no, or show_id if yes
     */
    isPopular: function(name, year){
        var r = cache[name+'|'+year];
        if(r) return r;
        return false;
    }
}

