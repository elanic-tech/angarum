var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");

var host = process.env['SHADOWFAX_HOST'];
var token = process.env['SHADOWFAX_TOKEN'];
var auth = "Token token=" + token;

var defaults={
    format: "json",
    output: "json",
    token: process.env["SHADOWFAX_TOKEN"],
};

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Shadowfax', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
		var url = "/api/v2/clients/requests";
		// Check out Order schema file for more information.
		params.map([], {
		    // "invoice_number" : "client_order_number",
		    // "from_name": "name",
		    // "from_address": "address_line",
		    // "from_pin_code": "pincode",
		    // "from_city": "city",
		    // "from_state": "state",
		    // "from_country": "country",
		    // "from_mobile_number": "phone_number",		    
		}, function(inp) {			
	    	var req = {	    		
	    		client_order_number: inp.invoice_number,
	    		warehouse_name: (inp.to_city.toLowerCase() == "new delhi") ? "Elanic New Delhi Warehouse" : "Elanic Bangalore Warehouse",	    		
	    		skus_attributes: [
	    			{
	    				name: inp.item_name,
	    				client_sku_id: inp.reference_number,
	    				price: inp.declared_value
	    			}
	    		],
	    		address_attributes: {
	    			name: inp.from_name,
	    			address_line: inp.from_address,
	    			pincode: inp.from_pin_code,
	    			city: inp.from_city,
	    			state: inp.from_state,
	    			country: inp.from_country,
	    			phone_number: inp.from_mobile_number,
	    		},
	    	};	    	
	    	return req;
		});

		params.out_map({
		    // "client_request_id": "awb",
		    // "reference_number": "msg",
		}, function(out) {			
		    out.success = (out["errors"]) ? false : true;
		    if (out.success)
				out.err = null;
		    else
				out.err = out["errors"];			
		    return out;
		});

		// request headers
		var headers = {
		    "Authorization": "Token token=" + token,
		    "Content-type": "application/json"
		};

		return this.post_req(url, params, cb, { headers: headers });
    },

    track: function(params, cb) {    	
		params.set({
		    "tracking_url": this.get_tracking_url(params.get().awb_number),
		});		
		return cb(null, params);
    },

    get_tracking_url: function(awb) {    	
		return host + "/api/v1/requests/" + awb;
    },

    single_tracking_status: function(params, cb) {
		var url = host + "/api/v1/requests/"+params.get().awb_number;		
		var awb = params.get().awb_number;
		var headers = {
			// "Host":"reverse.shadowfax.in",
			// "Connection":"keep-alive",
			// "Accept":"application/json, text/javascript, */*; q=0.01",
			// "Origin":"http://track.shadowfax.in",
			"Authorization":"Token token=" + process.env["SHADOWFAX_INTERNAL_TOKEN"],
			// "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.82 Safari/537.36",
			// "Referer":"http://track.shadowfax.in/track?order=return&trackingId=" + awb,
			// "Accept-Encoding":"gzip, deflate, sdch",
			// "Accept-Language":"en-US,en;q=0.8"
		};
		params.out_map({
		    "err": "error",
		}, function(out) {
			if (String == out.constructor) 
				out = JSON.parse(out);				

			if(out.pickup_request_state_histories) {
				var details = out.pickup_request_state_histories.map(function(scan) {
					return {
						"time": scan.created_at,
						"status": scan.state,
						"location": scan.current_location,
						"description": scan.comment || "",
				    };				 
				});
				var res = {
					success: true,
					awb: awb,
					details: details
				};								
			}
			return res;
		});
		return this.get_req(url, params, cb, {url: url, headers: headers})
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
