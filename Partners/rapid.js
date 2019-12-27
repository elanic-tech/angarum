var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
const unirest = require('unirest');

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
	var url = `${host}/api/createpackage.php`;
	// Check out Order schema file for more information.

  const inp = params.get();
  if(_.isEmpty(inp.from_address_line_1)) {
    inp.from_address_line_1 = inp.from_address;
  }
  if(_.isEmpty(inp.to_address_line_1)) {
    inp.to_address_line_1 = inp.to_address;
  }
  let req = {};

  if (inp.order_type === "pickup") {
    req = {
      client,
      token,
      oid: inp.invoice_number,
      consignee: inp.from_name,
      add1: inp.from_address_line_1,
      add2: inp.from_address_line_2,
      pin: inp.from_pin_code,
      city: inp.from_city,
      state: inp.from_state,
      country: inp.from_country,
      phone: inp.from_mobile_number,
      weight: 0.4,
      mode: imp.is_cod? 'cod' : 'prepaid',
      ret_add: inp.to_address_line_1 + inp.to_address_line_2,
      ship_pin: inp.to_pin_code,
      ship_phone: inp.to_mobile_number,
      ship_company: 'Elanic',
      amt: inp.declared_value,
      product: inp.item_name
    }
  }

  const postReq = unirest.post(url);
  postReq.header('Content-Type', 'application/x-www-form-urlencoded');

  for (let key in req) {
    postReq.send(`${key}=${req[key]}`);
  }

  postReq.end((response) => {
    const body = _.get(response, "body");
    if (_.isEmpty(body)) {
      params.set({
        success: false,
        err: "Rapid Unknown Error"
      });
    }
    // RAPID IS FUCKED UP - THEY DON'T SEND PROPER ERROR/SUCCESS RESPONSE CODES.
    // HENCE USING LENGTH of body as the success as a hack
    if (_.toNumber(body)) {
      params.set({
        success: true,
        tracking_url: this.get_tracking_url(body),
        awb: body
      });
    } else {
      params.set({
        success: false,
        err: body
      });
    }
    return cb(response, params);
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

    single_tracking_status: function (params, cb) {
      const awb = params.get().awb_number;
      const url = get_tracking_url(params.get().awb_number);
      const headers = {};
      params.out_map({
        "err": "error"
      }, (out) => {
        if (String == out.constructor) out = JSON.parse(out);
        if (out.scans) {
          var details = out.scans.map((scan) => {
            return {
              "time": scan.timestamp,
              "status": `${scan.flow}_${scan.status}`,
              "description": scan.remarks,
            }
          });
          var res = {
            success: true,
            awb,
            details
          }
        }
        return res;
      })
      return this.get_req(url, params, cb, {url, headers});
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

  // pickup: function(params, cb) {
  //   var url = "/api/pickup.php";
  //   params.map(["to_be_omitted_1", "to_be_omitted_2"], {
  //     "from_mapping_1" : "to_mapping_1",
  //     "from_mapping_2" : "to_mapping_2",
  //   }, function(inp) {
  //     return _.extend({
  //       "token": token,
  //       "client": client,
  //     }, inp);
  //   });
  //
  //   params.out_map({}, function(out) {
  //     out.success = !Boolean(out.err);
  //     return out;
  //   });
  //
  //   return this.post_req(url, params, cb);
  // },

  pickup: function(params, cb) {
    var url = `${host}/api/pickup.php`;
    // Check out Order schema file for more information.

    var date = new Date(params.date);
    var difference = date.getTime() - Date.now().getTime();
    var day = Math.floor(difference / (1000 * 60 * 60 * 24));
    if(_.isEmpty(params.from_address_line_1)) {
      params.from_address_line_1 = params.from_address;
    }
    if(_.isEmpty(inp.to_address_line_1)) {
      params.to_address_line_1 = params.to_address;
    }
    let req = {
        client,
        token,
        day,
        address: params.from_address_line_1,
        pincode: params.from_pin_code,
        name: params.name,
        shipments: params.quantity,
        phone: params.from_mobile_number,
      };

    const postReq = unirest.post(url);
    postReq.header('Content-Type', 'application/x-www-form-urlencoded');

    for (let key in req) {
      postReq.send(`${key}=${req[key]}`);
    }

    postReq.end((response) => {
      const body = _.get(response, "body");
      if (_.isEmpty(body) || _.get(response, "body.Pickup", []).filter((obj) => obj.status === 'Error').length !== 0) {
        params.set({
          success: false,
          err: _.get(response, _.get(response, "body.Pickup", []).filter((obj) => obj.status === 'Error').map(obj => obj.remarks).join('|'), "Rapid Unknown Error"),
        });
      } else {
        params.set({
          success: true,
          err: null,
          details: body
        });
      }
      return cb(response, params);
    });
  },
});
