var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
const unirest = require('unirest');

var host = process.env['RAPID_HOST'];
const client = process.env['RAPID_CLIENT'];
const token = process.env['RAPID_TOKEN'];

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Rapidd', {

  init: function() {
    this._super(host);
  },

  order: function(params, cb) {
    var url = `${host}/api/v2/createpackage.php`;
    // Check out Order schema file for more information.

    const inp = params.get();
    if (_.isEmpty(inp.from_address_line_1)) {
      inp.from_address_line_1 = inp.from_address;
    }
    if (_.isEmpty(inp.to_address_line_1)) {
      inp.to_address_line_1 = inp.to_address;
    }
    let req = {};

    if (inp.order_type === "forward_p2p") {
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
        mode: inp.is_cod ? 'cod' : 'prepaid',
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
    // postReq.header('Accept-Encodinge', 'gzip, deflate');
    postReq.header('Accept', 'text/html; charset=UTF-8');
    // postReq.header('Transfer-Encoding', 'chunked');

    for (let key in req) {
      postReq.send(`${key}=${req[key]}`);
    }

    postReq.end((response) => {
      try{
        body = JSON.parse(_.get(response, "body"));
        error = body.error;
      } catch (err) {
        error = _.get(response, "body")
      }
      const waybill = _.get(body, "waybill");
      if (!response.ok || error || _.isEmpty(waybill)) {
        params.set({
          success: false,
          err: error,
        });
      } else {
        params.set({
          success: true,
          tracking_url: this.get_tracking_url(waybill),
          awb: waybill
        });
        return cb(response, params);
      }
    });
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
    var url = `${host}/api/track.php`;
    // Check out Order schema file for more information.

    let queryParams = {
      client,
      token,
      waybill: params.get().awb_number
    };

    const getReq = unirest.get(url);

    getReq.query(queryParams);

    getReq.end((response) => {
      const responseBody = _.get(response, "body");
      if (!response.ok ||
          !responseBody ||
          responseBody.status === null ||
          responseBody.flow === null ||
          !Array.isArray(responseBody.scans) ||
          responseBody.scans.filter(s => !s.flow).length !== 0
      ) {
        params.set({
          success: false,
          err: "Invalid waybill number or Bad request",
        });
      } else {
        var details = out.scans.map((scan) => {
          return {
            "time": scan.timestamp,
            "status": `${scan.flow}_${scan.status}`,
            "description": scan.remarks,
          }
        });
        params.set({
          success: true,
          details: details,
          awb: params.get().awb_number
        });
        return cb(response, params);
      }
    });
  },

  cancel: function(params, cb) {
    var url = `${host}/api/v2/cancel.php`;
    // Check out Order schema file for more information.

    let requestBody = {
      client,
      token,
      waybill: params.get().awb_number
    };

    const postReq = unirest.get(url);

    postReq.send(requestBody);

    postReq.end((response) => {
      const responseBody = _.get(response, "body");
      if (!response.ok ||
          !responseBody ||
          (responseBody.status_code !== "200" && responseBody.status_code !== "201")
      ) {
        params.set({
          success: false,
          err: responseBody.message,
        });
      } else {
        params.set({
          success: true
        });
        return cb(response, params);
      }
    });
  },

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
          err: _.get(response, _.get(response, "body.Pickup", []).filter((obj) => obj.status === 'Error').map(obj => obj.remarks).join('|'), "Rapidd Unknown Error"),
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
