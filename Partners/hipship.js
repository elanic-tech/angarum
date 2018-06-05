var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
var unirest = require('unirest');

var host = process.env['HIPSHIP_HOST'];
var token = "Token " + process.env['HIPSHIP_TOKEN'];

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Hipship', {

    init: function() {
	     this._super(host);
    },

    order: function(params, cb) {
      const inp = params.get();
      var req = unirest("POST", `${host}shipment/book/`);
      req.headers({
       "Authorization": `${token}`,
       "Content-Type": "application/json"
      });
      req.type("json");
      const rec = {
       "Length": 10,
       "Width": 6,
       "Height": 3,
       "Weight": 1,
       "Invoice": _.get(inp, 'declared_value'),
       "ItemDescription": _.get(inp, 'item_name'),
       "ShipperPersonName": _.get(inp, 'from_name'),
       "ShipperAddress": _.get(inp, 'from_address'),
       "ShipperPincode": _.get(inp, 'from_pin_code'),
       "ShipperMobile": _.get(inp, 'from_mobile_number'),
       "ShipperEmail": 'ops@elanic.in',
       "ReceiverPersonName": _.get(inp, 'to_name'),
       "ReceiverAddress": _.get(inp, 'to_address'),
       "ReceiverPincode": _.get(inp, 'to_pin_code'),
       "ReceiverMobile": _.get(inp, 'to_mobile_number'),
       "IsCOD": _.get(inp, 'is_cod')
     };
     req.send(rec);

     req.end(function (res) {
       const resp = _.get(res, 'body');
       // console.log('RESP', JSON.stringify(resp));
       if (_.get(resp, 'IsError')) {
         params.set({
           success: false,
           err: resp
         });
       } else {
         params.set({
           success: true,
           awb: _.get(resp, 'AWBNumber'),
           partner_response: resp
         });
       }
       return cb(resp, params);
     });
    },

    pickup: function (params, cb) {
      const inp = params;
      const awb = _.get(inp, 'awb');
      const awbs = _.isArray(awb) ? awb : [awb];
      const date = (new Date(inp.date)).toJSON().slice(0, 10).replace(/[-T]/g, '-')
      var req = unirest("POST", `${host}shipment/pickup`);
      req.headers({
        "Authorization": `${token}`,
        "Content-Type": "application/json"
      });
      req.type("json");
      req.send({
        "AWBNumbers": awbs,
        "PickupDate": date
      });
      req.end(function (res) {
        if (res.error) return cb(res.error, params);
        const resp = _.get(res, 'body');
        const record = {
          success: true,
          err: null,
          details: res.body
        }
        return cb(null, record);
      });
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
