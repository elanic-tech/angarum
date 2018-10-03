var Schema = require('./schema.js');
var _ = require('lodash');

module.exports = Schema.extend('Order_schema', {
    init: function(obj) {
	    this._super(_.extend(this.get_config(), obj));
    },

    get_config: function() {
	    return {
	      from_name : "",
        from_address: "",
        from_address_line_1:"",
        from_address_line_2:"",
	      from_city: "",
	      from_state: "",
	      from_country: "",
	      from_mobile_number: "",
	      from_pin_code: "",
	    };
    },

    get_out_config: function() {
      return {
          "name": "",
          "pincode": "",
          "phone": "",
          "partner":""
      };
    },
    
});
