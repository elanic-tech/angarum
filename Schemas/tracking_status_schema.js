var Schema = require('./schema.js');
var _ = require('lodash');

module.exports = Schema.extend('Track_status_schema', {
    init: function(obj) {
	this._super(_.extend(this.get_config(), obj));
    },

    get_config: function() {
	return {
	    "awb_number": "",
	};
    },

    get_out_config: function() {
	return {
	    "awb": "",
	    "success": "",
	    "error": "",
	    "details": [{
		"time": "",
		"status": "",
		"description": "",
		"location": "",
	    }],
	};
    },
    
});
