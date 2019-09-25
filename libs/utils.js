var crypto = require('crypto');
var moment = require('moment');
var serialize = require('node-serialize');

utils = {
    getSessionId: function(prefix) {
        var prefix = (prefix) ? prefix : '';
        var sessionId = 'xxxy4xxxxx'.replace(/[xy]/g, function(c) {
            var r = crypto.randomBytes(1)[0] % 13 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(13);
        });
        return prefix + '' + sessionId;
    },
    getNumericSessionId: function() {
        return new Date().getUTCMilliseconds();
    },
    moment: function() {
        return moment();
    },
    moment: moment,
    now: function(format) {
        if (format) {
            return moment().format(format);
        } else {
            return moment().format('YYYY-MM-DD HH:mm:ss');
        }
    },
    clientNow: function() {
        return '<span class="highlight">' + this.now() + '</span>';
    },
    serialize: function(data) {
        return serialize.serialize(data);
    },
    unserialize: function(data) {
        return serialize.unserialize(data);
    }
}

module.exports = utils;