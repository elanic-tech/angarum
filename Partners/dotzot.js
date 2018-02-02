const Template = require('./template');
const querystring = require('querystring');
const _ = require('lodash');

const host = "http://dotzot-test.azurewebsites.net"

module.exports = Template.extend('Dotzot', {
  init: function() {
    this._super(host);
  }

  order: function(params, cb) {
    const url = `${host}/RestService/PushOrderDataServic
    e.svc/PushOrderData_PUDO_New`;
    const inp = params.get();
    if (inp.order_type === "forward_p2p") {

    }
    
  }
});
