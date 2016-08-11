var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");

var host = process.env['XPRESSBEES_HOST'];
var token = process.env['XPRESSBEES_TOKEN'];

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Partner_name', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
		var url = "/PushReverseManifestDetails";
		// Check out Order schema file for more information.
		params.map([], {
		    // "from_mapping_1" : "to_mapping_1",
		    // "from_mapping_2" : "to_mapping_2",
		}, function(inp) {
		 //    return _.extend({
			// "auth_token": 'sfwerlkjwevs',
		 //    }, inp);
		 	var req = {
		 		XBkey: token,
		 		ReverseManifestData: {
		 			AWB_No: inp.reference_number,
		 			Order_ID: inp.invoice_number,
					Return_Reason: "",
					    
					Destination_Address: inp.to_address,
					Destination_City: inp.to_city,
					Destination_Country: inp.to_country,
					Destination_Name: inp.to_name,
					Destination_Phone: inp.to_mobile_number,
					Destination_Pincode: inp.to_pin_code,
					Destination_State: inp.to_state,
					    				
					Pickup_Landmark: "",
					Pickup_Address: inp.from_address,
					Pickup_City: inp.from_city,
					Pickup_Country: inp.from_country,
					Pickup_Name: inp.from_name,
					Pickup_Phone: inp.from_mobile_number,
					Pickup_Pincode: inp.from_pin_code,
					Pickup_State: inp.from_state,
					Pickup_Email: "",
					    
					Length: 0,
					Width: 0,
					Height: 0,
					PhyWeight: 0,
					VolWeight: 0,
					ProductId: inp.reference_number,
					ProductQty: inp.quantity,
					ProductName: inp.item_name,
					ProductMRP: inp.declared_value,
					NetPayment: inp.cod_amount,
					ProductCategory: "",
					ProductDescription: "",
		 		}
		 	};		
			return req;	 
		});

		params.out_map({
		    // "waybill": "awb",
		    // "reference_number": "msg",
		}, function(out) {	 
		 	out.success = (out.PushReverseManifestDetails[0].ReturnMessage === 'successful');
		 	out.awb = out.PushReverseManifestDetails[0].AWBNo;
		 	if(!out.success) out.err = out.PushReverseManifestDetails[0].ReturnMessage;	 	
		 	return out;
		});
		console.log(params);
		return this.post_req(url, params, cb);
    },

    track: function(params, cb) {
	params.set({
	    "tracking_url": this.get_tracking_url(params.get().awb_number),
	});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
	return host + "/GetReverseManifestStatus";
    },

    single_tracking_status: function(params, cb) {
		var url = host + "/GetReverseManifestStatus";
		params.map([], {
			"awb_number" : "AWBNumber",
		},function(inp) {
			inp.XBkey = token;
			// console.log(inp);
			return inp;			
		});
		// params._obj.XBkey = token;
		// params._obj.AWBNumber = awb;
		// console.log(params);

		params.out_map({
		    // "err": "error",
		}, function(out) {
			// if (String == out.constructor) 
			// 	out = JSON.parse(out);				
			// console.log(out);
			return out;
			// if(out.pickup_request_state_histories) {
			// 	var details = out.pickup_request_state_histories.map(function(scan) {
			// 		return {
			// 			"time": scan.created_at,
			// 			"status": scan.state,
			// 			"location": scan.current_location,
			// 			"description": scan.comment || "",
			// 	    };				 
			// 	});
			// 	var res = {
			// 		success: true,
			// 		awb: awb,
			// 		details: details
			// 	};								
			// }
			// return res;
		});
		return this.post_req(url, params, cb, {url: url})
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
