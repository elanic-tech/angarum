var Schema = require('./schema.js');
var _ = require('lodash');

module.exports = Schema.extend('Cancel_schema', {
    init: function(obj) {
	this._super(_.extend(this.get_config(), obj));
    },

    get_config: function() {
	return {
	    "awb": "cv",
	};
    },

    get_out_config: function() {
	return {
	    "success": "",
	    "err": "",
	};
    },
});
