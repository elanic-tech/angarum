var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");

var host = process.env['HIPSHIP_HOST'];
var token = "Token " + process.env['HIPSHIP_TOKEN'];

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Partner_name', {

    init: function() {
	this._super(host);

    },
    
    order: function(params, cb) {
    	console.log("Going to Order");
	var url = "/api/test/v1.1/shipment/book/";
	//var url = "/api/v1.1/shipment/book/";
	
	// Check out Order schema file for more information.
	params.map([], {
	    "from_address" : "ShipperAddress",
	    "invoice_number":"Invoice",
	    "item_name":"ItemDescription",
	    "from_name":"ShipperPersonName",
	    "from_pin_code":"ShipperPincode",
	    "from_mobile_number":"ShipperMobile",
	    "to_name":"ReceiverPersonName",
	    "to_address":"ReceiverAddress",
	    "to_pin_code":"ReceiverPincode",
	    "to_mobile_number":"ReceiverMobile"

	}, function(inp) {  
	    return _.extend({
		"ShipperEmail": 'test@hipship.com',
	    "Length":15,
	    "Width":14,
	    "Height":11,
	    "Weight":0.4
	    }, inp);
	});

	params.out_map({
	}, function(out) {
		out.awb = out.AWBNumber;
	    out.success = (out["Status"].StatusInformation);
	    if (out.success)
		out.err = null;
	    else
		out.err = out["err"];
	    return out;
	});
	// request headers
		var headers = {
		    "Authorization": token,
		    "Content-type": "application/json"
		};

	return this.post_req(url, params, cb,{headers:headers});
    },

  //   track: function(params, cb) {
		// params.set({
		//     "tracking_url": this.get_tracking_url(params.get().awb_number),
		// });
		// return cb(null, params);
  //   },

  //   get_tracking_url: function(awb) {
		// return host + "/api/test/v1.1/shipment/track/";
  //   },

    single_tracking_status:function(params,cb){
    	var url = host +"/api/test/v1.1/shipment/track/";
    	//var url = host +"/api/v1.1/shipment/track/";
    
    	var awb = params.get().awb_number;
    	params.map({
    		"AWBNumber" : awb
    	},function(inp){
    		return _.extend({

    		},inp);
    		
    	});

    	// request headers
		var headers = {
		    "Authorization": token,
		    "Content-type": "application/json"
		};

		return this.post_req(url, params, cb,{headers:headers});

    },

});
