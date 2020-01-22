var Template = require('./template.js');
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

  /**
   * function to register or create order at 3rd party logistics partner system end
   * @param params: object containing order details
   * @param callback
   */
  order: function(params, callback) {
    var url = `${host}/api/v2/createpackage.php`;

    const inputParameters = params.get();
    if (_.isEmpty(inputParameters.from_address_line_1)) {
      inputParameters.from_address_line_1 = inputParameters.from_address;
    }
    if (_.isEmpty(inputParameters.to_address_line_1)) {
      inputParameters.to_address_line_1 = inputParameters.to_address;
    }
    let req;
    if(_.includes(['forward_p2p','delivery', 'sbs'],inputParameters.order_type)) {
      req  = {
        client,
        token,
        oid: inputParameters.invoice_number,
        consignee: inputParameters.to_name,
        add1: inputParameters.to_address_line_1,
        add2: inputParameters.to_address_line_2,
        pin: inputParameters.to_pin_code,
        city: inputParameters.to_city,
        state: inputParameters.to_state,
        country: inputParameters.to_country,
        phone: inputParameters.to_mobile_number,
        mode: inputParameters.is_cod ? 'cod' : 'prepaid',
        ret_add: inputParameters.from_address_line_1 + inputParameters.from_address_line_2,
        ship_pin: inputParameters.from_pin_code,
        ship_phone: inputParameters.from_mobile_number,
        ship_company: 'Elanic',
        amt: inputParameters.declared_value,
        product: inputParameters.item_name
      };
    } else {
      req  = {
        client,
        token,
        oid: inputParameters.invoice_number,
        consignee: inputParameters.to_name,
        add1: inputParameters.from_address_line_1,
        add2: inputParameters.from_address_line_1,
        pin: inputParameters.from_pin_code,
        city: inputParameters.from_city,
        state: inputParameters.from_state,
        country: inputParameters.from_country,
        phone: inputParameters.from_mobile_number,
        mode: 'reverse',
        ret_add: inputParameters.to_address_line_1 + inputParameters.to_address_line_1,
        ship_pin: inputParameters.to_pin_code,
        ship_phone: inputParameters.to_mobile_number,
        ship_company: 'Elanic',
        amt: inputParameters.declared_value,
        product: inputParameters.item_name
      };

    }

    const postReq = unirest.post(url);
    postReq.header('Content-Type', 'application/x-www-form-urlencoded');

    for (let key in req) {
      postReq.send(`${key}=${req[key]}`);
    }

    console.log('rapidorder', JSON.stringify(req));
    postReq.end((response) => {
      console.log('rapidorderresponse', _.get(response, "body"));
    // postReq.end((response) => {
      let body, error;
      try{
        body = JSON.parse(_.get(response, "body"));
        error = body.error;
      } catch (err) {
        error = _.get(response, "body")
      }
      const waybill = _.get(body, "waybill");
      if (!response.ok || error || _.isEmpty(waybill) || _.get(body, "status") !== "200") {
        params.set({
          success: false,
          err: error || _.get(body, "message"),
        });
      } else {
        params.set({
          success: true,
          tracking_url: this.get_tracking_url(waybill),
          awb: waybill
        });
        return callback(response, params);
      }
    });
  },

  /**
   * function to fetch tracking related properties
   * @param params: object containing awb_number
   * @param cb
   * @returns {*}
   */
  track: function(params, cb) {
    params.set({
      "tracking_url": this.get_tracking_url(params.get().awb_number),
    });
    return cb(null, params);
  },

  /**
   * function to get tracking url
   **/
  get_tracking_url: function(awb) {
    return `${host}/api/track.php?client=${client}&token=${token}&waybill=${awb}`;
  },

  /**
   * function to fetch tracking details
   * @param params: order details to fetch tracking details
   * @param cb
   */
  single_tracking_status: function (params, cb) {
    var url = `${host}/api/track.php`;

    let queryParams = {
      client,
      token,
      waybill: params.get().awb_number
    };

    const getReq = unirest.get(url);

    getReq.query(queryParams);

    console.log('rapidtrack', JSON.stringify(queryParams));
    getReq.end((response) => {
          console.log('rapidtrackresponse', _.get(response, "body"));
    // getReq.end((response) => {
      let error, body;
      try{
        body = JSON.parse(_.get(response, "body"));
        error = body.error;
      } catch (err) {
        error = _.get(response, "body")
      }
      if (!response.ok || error || _.get(body, "status") === null ||
          !Array.isArray(body.scans) ||
          body.scans.filter(s => !s.flow).length !== 0) {
        params.set({
          success: false,
          err: error || "Invalid waybill number or Bad request",
        });
      } else {

        var details = body.scans.map((scan) => {
          return {
            "time": scan.timestamp,
            "status": scan.flow? `${scan.flow}_${scan.status}_${scan.remarks}` : `${scan.status}_${scan.remarks}`,
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

  /**
   * cancel order
   * @param params: details related order
   * @param cb
   */
  cancel: function(params, cb) {
    var url = `${host}/api/v2/cancel.php`;
    // Check out Order schema file for more information.

    let requestBody = {
      client,
      token,
      waybill: params.get().awb
    };

    const postReq = unirest.post(url);

    postReq.send(requestBody);

    console.log('rapidcancel', JSON.stringify(requestBody));
    postReq.end((response) => {
          console.log('rapidcancelresponse', _.get(response, "body"));
    // postReq.end((response) => {
      var body, error;
      try{
        body = JSON.parse(_.get(response, "body"));
        error = body.error;
      } catch (err) {
        error = _.get(response, "body")
      }
      if (!response.ok || error || _.get(body, "status_code") !== "200") {
        params.set({
          success: false,
          err: error || _.get(body, "message"),
        });
      } else {
        params.set({
          success: true,
        });
      }
      return cb(response, params);
    });
  },

  /**
   * register pickup
   * @param params: order details
   * @param callback callback
   */
  pickup: function(params, callback) {
    var url = `${host}/api/pickup.php`;
    // Check out Order schema file for more information.

    var date = new Date(params.date);
    var difference = date.getTime() - Date.now();
    difference= difference < 0? 0 : difference;
    var day = Math.floor(difference / (1000 * 60 * 60 * 24));
    if(_.isEmpty(params.from_address_line_1)) {
      params.from_address_line_1 = params.from_address;
    }
    if(_.isEmpty(params.to_address_line_1)) {
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

    console.log('rapidpickup', JSON.stringify(req));
    postReq.end((response) => {
      console.log('rapidpickupresponse', _.get(response, "body"));
      let body, error;
      try{
        body = JSON.parse(_.get(response, "body"));
        error = _.get(response, _.get(response, "body.Pickup", []).filter((obj) => obj.status === 'Error').map(obj => obj.remarks).join('|'));
      } catch (err) {
        error = _.get(response, "body")
      }
      if (error || _.isEmpty(body)) {
        Object.assign(params, {
          success: false,
          err: error || "Rapidd Unknow Error",
        });
      } else {
        Object.assign(params, {
          success: true,
          err: null,
          details: body
        });
      }
      return callback(response, params);
    });
  },
});
