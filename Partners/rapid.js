var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");

var host = process.env['RAPID_HOST'];
const client = process.env['RAPID_CLIENT'];
const token = process.env['RAPID_TOKEN'];

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Rapid', {

    init: function() {
	this._super(host);
    },

    order: function(params, cb) {
	var url = `${host}/api/createpackage`;
	// Check out Order schema file for more information.
	
  const inp = params.get();
  
  const req = {
    client,
    token,
    oid: inp.invoice_number,
    consignee: inp.to_name,
    add1: inp.to_address,
    add2: "",
    pin: inp.to_pin_code,
    city: inp.to_city,
    state: inp.to_state,
    country: inp.to_country,
    phone: inp.to_mobile_number,
    weight: 0.4,
    mode: "reverse",
    ret_add: inp.from_address,
    ship_pin: inp.from_pin_code,
    ship_phone: inp.from_mobile_number,
    ship_company: 'Elanic'
  }
  
  const postReq = unirest.post(url);
  postReq.header('Content-Type', 'application/x-www-form-urlencoded');
  
  for (let key in req) {
    postReq.send(`${key}=${req[key]}`);
  }
  
  postReq.send((response) => {
    console.log(response)
  });
  
  
	// params.map([], {
	// }, function(inp) {
  //   
  //   
  //   
	//     // return req;
	// });
  // 
	// params.out_map({
	// }, function(out) {
	//    console.log(out);
	//    return out;
	// });
  // 
	// // return this.post_req(url, params, cb);
  },

    track: function(params, cb) {
	params.set({
	    "tracking_url": this.get_tracking_url(params.get().awb_number),
	});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
      return `${host}/api/track.php?client=${client}&token=${token}&waybill=${awb}`;
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
