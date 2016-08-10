var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");

var host = 'domain_name_here';

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Partner_name', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
		var url = "/api/packages/create_order/";
		// Check out Order schema file for more information.
		params.map(["to_be_omitted_1", "to_be_omitted_2"], {
		    "from_mapping_1" : "to_mapping_1",
		    "from_mapping_2" : "to_mapping_2",
		}, function(inp) {
		    return _.extend({
			"auth_token": 'sfwerlkjwevs',
		    }, inp);
		});

		params.out_map({
		    "waybill": "awb",
		    "reference_number": "msg",
		}, function(out) {
		    out.success = (out["results"] == "success");
		    if (out.success)
			out.err = null;
		    else
			out.err = out["results"]
		    return out;
		});
		
		return this.post_req(url, params, cb);
    },

    track: function(params, cb) {
		params.set({
		    "tracking_url": this.get_tracking_url(params.get().awb_number),
		});
		return cb(null, params);
    },

    get_tracking_url: function(awb) {
		return host + "/api/packages/track/?awb=" + awb;
    },

    cancel: function(params, cb) {
		var url = "/api/packages/cancel/";
		params.map(["to_be_omitted_1", "to_be_omitted_2"], {
		    "from_mapping_1" : "to_mapping_1",
		    "from_mapping_2" : "to_mapping_2",
		}, function(inp) {
		    return _.extend({
			"auth_token": 'sfwerlkjwevs',
		    }, inp);
		});

		params.out_map({}, function(out) {
		    out.success = !Boolean(out.err);
		    return out;
		});
		
		return this.post_req(url, params, cb);
    },

});
