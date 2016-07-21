var Template = require('./template.js');
var querystring = require('querystring');
var _ = require('lodash');

var host = process.env['PYCK_HOST'];
var defaults = {
    username: process.env['PYCK_USERNAME'],
    key: process.env['PYCK_KEY'],
};

module.exports = Template.extend('Pyck', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
	params.map(["service_type", "reference_number"], {
	    "from_name" : "pickup_name",
	    "from_address": "pickup_address",
	    "from_mobile_number": "pickup_phone",
	    "from_pin_code": "pickup_pincode",
	    "to_name": "drop_name",
	    "to_address": "drop_address",
	    "to_city": "drop_city",
	    "to_mobile_number": "drop_phone",
	    "to_pin_code": "drop_pincode",
	    "to_state": "drop_state",
	    "to_country": "drop_country",
	    "order_time": "pickup_time",
	    "item_name": "items",
	    "declared_value": "invoice_value",
	    "cod_amount": "cod_value"
	}, function(inp) {
	    if (!inp.is_cod) {
		inp["order_type"] = "NONCOD";
		inp["cod_value"] = 0;
	    }
	    else
		inp["order_type"] = "COD";
	    return inp;
	});
	
	params.out_map({
	    "waybill": "awb",
	    "reference_number": "msg",
	    "error": "err",
	}, function(out) {
	    out.success = (out["results"] == "success");
	    if (out.success)
		out.err = null;
	    else
		out.err = out["results"]
	    return out;
	});
	
	var url = "/api/packages/create_order/";
	url += "?" + querystring.stringify(defaults);
	return this.post_req(url, params, cb);
    },

    track: function(params, cb) {
	params.set({"tracking_url": this.get_tracking_url(params.get().awb_number)});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
	var url = host + "/customer_tracking/?tracking_id=" + awb;
	return url;
    },

    single_tracking_status: function(params, cb) {
	params.set({
	    err: "Not using pyck anymore",
	    success: false,
	});
	cb(null, params);
    },

    cancel: function(params, cb) {
	params.set({
	    err: "No cancel functionality",
	    success: false,
	})
	return cb(null, params);
    },

});
