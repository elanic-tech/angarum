var Template = require('./template.js');
var _ = require('lodash');

var host = process.env['PIGEON_HOST'];
var defaults = {
    "market_name": process.env['PIGEON_MARKET_NAME'],
    "vendor_name": process.env['PIGEON_VENDOR_NAME'],
    "password": process.env['PIGEON_PASSWORD'],
};

module.exports = Template.extend('pigeon', {

    init: function() {
        this._super(host);
    },
    
    order: function(params, cb) {
	var that = this;

	params.map(["invoice_date", "order_time", "service_type", "item_name"], {
	    "invoice_number" : "invoice",
	    "item_name" : "product_detail",
	    "cod_amount": "cod_collection",
	    "reference_number": "unique_id",
	}, function(inp) {
	    /*
	    if (inp.order_type != "db") {
		inp["payment_type"] = "noncod"; //unclear
		inp["cod_collection"] = 0;
	    }
	    else
		inp["payment_type"] = "cod";
	    */
	    if (inp.is_cod)
		inp["payment_type"] = "cod";
	    else {
		inp["payment_type"] = "noncod"; //unclear
		inp["cod_collection"] = 0;
	    }
	    inp_details = _.extend({
		shipment_details: [inp],
	    }, defaults);
	    return inp_details;
	});

	params.out_map({
	    "error" : "err",
	}, function(out) {
	    var data = out.serviceable_data;
	    if (data) {
		if (!data[0].success)
		    data[0].err = "Not serviceable";
		out = data[0];
	    }
	    else
		out.success = false;
	    return out;
	});
	
	var inp_params = _.clone(params, true);
        repeat_func = function(res, body, ct) {

	    var res_orig = res, body_orig = body;
	    ct = ct || 0;
	    if (ct >= 5) {
		params.set({
		    err: "Not fetched after " + ct + " repeats",
		    success: false,
		});
		return cb(res, params);
	    }
	    
	    //body.add("success", true);
	    if(body.get().success) {
		params = _.clone(inp_params, true);
		params.out_map({
		    "error" : "err",
		}, function(out) {
		    var data = out.orders_data;
		    if (data) {
			if (!data[0].success)
			    data[0].err = "Not placed";
			out = data[0];
		    }
		    else
			out.success = false;
		    return out;
		});
		that.post_req("/ecom-api/place-order/", params, function(res, body) {
		    
		    //body.add("success", true);
		    if(body.get().success) {
			params = _.clone(inp_params, true);
			params.out_map({
			    "error" : "err",
			}, function(out) {
			    var data = out.waybills_data;
			    if (data) {
				if (!data[0].success)
				    data[0].err = "Not fetched";
				out = data[0];
			    }
			    else
				out.success = false;
			    return out;
			});
			that.post_req("/ecom-api/fetch-waybills/", params, function(res, body) {

			    //body.add("success", true);
			    if(body.get().success) {
				params = _.clone(inp_params, true);
				params.add("shipment_details", [body.get()]);
				params.out_map({
				    "error" : "err",
				}, function(out) {
				    var data = out.results;
				    if (data) {
					if (!data[0].success)
					    data[0].err = "Not Acknowledged";
					out = data[0];
				    }
				    else
					out.success = false;
				    return out;
				});
				that.post_req("/ecom-api/acknowledge-order/", params, function(res, body) {
				    
				    //body.add("success", true);
				    if(body.get().success)
					return cb(res, body);
				    else
					return cb(res, body);
				});	
			    }
			    else {
				return setTimeout(function() {
				    return repeat_func(res_orig, body_orig, ct+1);
				}, 500);
			    }
			});
		    }
		    else
			return cb(res, body);
		});
	    }
	    else
		return cb(res, body);
	};
	return this.check_serviceable(params, repeat_func);
    },

    check_serviceable: function(params, cb) {
	var path = '/ecom-api/check-serviceability/';	
	return this.post_req(path, params, cb);
    },

    track: function(params, cb) {
	params.set({"tracking_url" : this.get_tracking_url(params.get().awb_number)});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
        var url = "http://crm.gopigeon.in/track/unified";
	url += "?awb=" + awb;
	return url
    },

    single_tracking_status: function(params, cb) {
	var url = "http://gopigeon.biz/ecom-api/track/shipments";
	var awb = params.get().awb_number;
	params.map([], {}, function(inp) {
	    return _.extend({
		shipment_details: [inp],
	    }, defaults);
	});

	params.out_map({}, function(out) {
	    out.success = !Boolean(out.error);
	    if (out.results && out.results.constructor == Array && out.results.length > 0) {
		out.details = out.results[0].details.map(function(result) {
		    return _.extend({
			"description": result.desc,
		    }, result);
		});
	    }
	    out.awb = awb;
	    return out;
	});

	return this.post_req(url, params, cb, {url: url});
    },

    cancel: function(params, cb) {
	var url = "/ecom-api/cancel-order";
	params.map([], {}, function(inp) {
	    return _.extend({
		shipment_details: [inp],
	    }, defaults);
	});

	params.out_map({
	    "message": "err",
	}, function(out) {
	    if (!out.data) {
		out.err = out.error;
		out.success = false
	    }
	    else
		out = out.data[0][0];
	    return out;
	});
	
	return this.post_req(url, params, cb);
    },
});
