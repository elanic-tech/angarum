var Template = require('./template.js');
var _ = require('lodash');
var host = process.env['PICKRR_HOST']; 
var auth_token = process.env['PICKRR_AUTH_TOKEN'];

module.exports = Template.extend('Pickrr', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
	params.map(["invoice_number", "reference_number", "invoice_date"], {
	    "from_mobile_number": "from_phone_number",
	    "from_pin_code": "from_pincode",
	    "to_mobile_number": "to_phone_number",
	    "to_pin_code": "to_pincode",
	}, function(inp) {
	    if (!inp.is_cod)
		delete inp["cod_amount"];
	    return _.extend({
		"auth_token": auth_token,
	    }, inp);
	});
	
	params.out_map({
	    "tracking_id" : "awb",
	    "pickup_time" : "msg",
	    "error" : "err",
	}, function(out) {
	    out.success = !Boolean(out.err);
	    return out;
	});
	
	params.add("auth_token", auth_token);
	var url = "/api/place-order/";
	return this.post_req(url, params, cb);
    },

    track: function(params, cb) {
	params.set({"tracking_url" : this.get_tracking_url(params.get().awb_number)});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
	return host+"/api/tracking/"+awb;
    },

    single_tracking_status: function(params, cb) {
	var url = "/api/tracking-json/";
	var awb = params.get().awb_number;
	params.map([], {
	    "awb_number" : "tracking_id",
	});
	
	params.out_map({
	    "err": "error",
	}, function(out) {
	    if (String == out.constructor)
		out = JSON.parse(out);
	    
	    out.success = !Boolean(out.err);
	    if (out.track_arr && out.track_arr.constructor == Array) {
		var details = [];
		out.track_arr.forEach(function(status) {
		    status.status_array.forEach(function(result) {
			details.push({
			    "time": result.status_time,
			    "status": result.status_body,
			    "location": result.status_location,
			});	
		    });
		});
		out.details = details;
	    }
	    out.awb = awb;
	    return out;
	});

	return this.get_req(url, params, cb)
    },

    cancel: function(params, cb) {
	var url = "/api/order-cancellation/";
	params.map([], {
	    "awb": "order_id",
	}, function(inp) {
	    return _.extend({
		"auth_token": auth_token,
	    }, inp);
	});
	
	params.out_map({}, function(out) {
	    out.success = !Boolean(out.err);
	    return out;
	});
	
	return this.post_req(url, params, cb);
    },
});
