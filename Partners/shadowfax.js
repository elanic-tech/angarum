const Template = require('./template.js');
const querystring = require('querystring');
const _ = require("lodash");
const host = process.env['SHADOWFAX_HOST'];
const token = process.env['SHADOWFAX_TOKEN'];
const auth = "Token token=" + token;

const defaults={
    format: "json",
    output: "json",
    token: process.env["SHADOWFAX_TOKEN"],
};

const forwardPickup=(inp)=>{
	let req = {
		"client_request_id":inp.reference_number,
		"order_details": {
			"client_order_id": inp.invoice_number,
			"awb_number": inp.reference_number,
			"actual_weight": 400,
			"volumetric_weight": 400,
			"product_value":inp.declared_value,
			"payment_mode": inp.is_cod?"COD":"Prepaid",
			"cod_amount":inp.declared_value,
			"total_amount": inp.to_pin_code
		},
		"customer_details": {
			"name": inp.to_name,
			"contact":inp.to_mobile_number,
			"address_line_1": _.isEmpty(inp.to_address) ? inp.to_address_line_1 + inp.to_address_line_2 : inp.to_address,
			"city": inp.to_city,
			"state":  inp.to_state,
			"pincode": inp.to_pin_code,
			"alternate_contact": inp.to_mobile_number
		},
		"pickup_details": {
			"name": inp.from_name,
			"contact": inp.from_mobile_number,
			"address_line_1": _.isEmpty(inp.from_address) ? inp.from_address_line_1 + inp.from_address_line_2 : inp.from_address,
			"city": inp.from_city,
			"state": inp.from_state,
			"pincode":inp.from_pin_code
		},
		"rts_details": {
			"name": inp.from_name,
			"contact": inp.from_mobile_number,
			"address_line_1":  _.isEmpty(inp.from_address) ? inp.from_address_line_1 + inp.from_address_line_2 : inp.from_address,
			"city":  inp.from_city,
			"state": inp.from_state,
			"pincode": inp.from_pin_code
		},
		"product_details": [
			{
				"invoice_no": inp.invoice_number,
				"sku_name": inp.item_name,
				"client_sku_id": inp.reference_number,
				"price": inp.declared_value,
				"seller_details": {
					"seller_name":  inp.from_name,
					"seller_address": _.isEmpty(inp.from_address) ? inp.from_address_line_1 + inp.from_address_line_2 : inp.from_address,
					"seller_state": inp.from_state,
				}
			}
		]
	};
	return req;
};

const returnPickup=(inp)=>{
	let req = {
		client_order_number: inp.invoice_number,
		client_request_id:inp.reference_number,
		seller_attributes: {
			name: inp.to_name,
			address_line: _.isEmpty(inp.to_address) ? inp.to_address_line_1 + inp.to_address_line_2 : inp.to_address,
			city: inp.to_city,
			pincode: inp.to_pin_code,
			phone: inp.to_mobile_number
		},
		total_amount: inp.declared_value,
		price: inp.declared_value,
		skus_attributes: [
			{
				name: inp.item_name,
				client_sku_id: inp.reference_number,
				price: inp.declared_value
			}
		],
		address_attributes: {
			name: inp.from_name,
			address_line: _.isEmpty(inp.from_address) ? inp.from_address_line_1 + inp.from_address_line_2 : inp.from_address,
			pincode: inp.from_pin_code,
			city: inp.from_city,
			state: inp.from_state,
			country: inp.from_country,
			phone_number: inp.from_mobile_number,
		},
	};
	return req;
};

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Shadowfax', {

    init: function() {
	this._super(host);
    },

    order: function(params, cb) {
		const param= params._obj.order_type==='forward_p2p'? "orders":"requests";
		let url = `/api/v1/clients/${param}/`;
		// Check out Order schema file for more information.
		if(_.isEqual(params._obj.order_type,'forward_p2p')){
			_.set(defaults,"token",process.env["SHADOWFAX_TOKEN_MARKETPLACE"])
			params.map([], {
				// "invoice_number" : "client_order_number",
				// "from_name": "name",
				// "from_address": "address_line",
				// "from_pin_code": "pincode",
				// "from_city": "city",
				// "from_state": "state",
				// "from_country": "country",
				// "from_mobile_number": "phone_number",
			}, forwardPickup);
		}
		if(_.isEqual(params._obj.order_type,'return_pickup')) {
			params.map([], {
				// "invoice_number" : "client_order_number",
				// "from_name": "name",
				// "from_address": "address_line",
				// "from_pin_code": "pincode",
				// "from_city": "city",
				// "from_state": "state",
				// "from_country": "country",
				// "from_mobile_number": "phone_number",
			}, returnPickup);
		}

		params.out_map({
		    // "client_request_id": "awb",
		    // "reference_number": "msg",
		}, function(out) {
		    out.success = (out["errors"]) ? false : true;
		    if (out.success) {
			out.err = null;
			out.awb = out.client_request_id;
			out.tracking_url = "http://track.shadowfax.in/track?order=return&trackingId="+out.awb;
		    }
		    else
			out.err = out["errors"];
		    return out;
		});

		// request headers
		const headers = {
		    "Authorization": "Token token=" + defaults.token,
		    "Content-type": "application/json"
		};
    //console.log("SHADOWFAX", url, JSON.stringify(inp), JSON.stringify(params), JSON.stringify(headers), JSON.stringify(out));
		return this.post_req(url, params, cb, { headers: headers });
    },

    track: function(params, cb) {
		params.set({
		    "tracking_url": this.get_tracking_url(params.get().awb_number),
		});
		return cb(null, params);
    },

    get_tracking_url: function(awb) {
		return host + "/api/v2/clients/requests/" + awb;
    },

    single_tracking_status: function(params, cb) {
		let url = host + "/api/v2/clients/requests/"+params.get().awb_number;
		let awb = params.get().awb_number;
		const headers = {
			// "Host":"reverse.shadowfax.in",
			// "Connection":"keep-alive",
			// "Accept":"application/json, text/javascript, */*; q=0.01",
			// "Origin":"http://track.shadowfax.in",
			"Authorization":"Token token="+process.env["SHADOWFAX_TOKEN"],
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
				let details = out.pickup_request_state_histories.map(function(scan) {
					return {
						"time": scan.created_at,
						"status": scan.state,
						"location": scan.current_location,
						"description": scan.comment || "",
				    };
				});
				let res = {
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
		let url = host + "/api/v2/clients/requests/mark_cancel";
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
