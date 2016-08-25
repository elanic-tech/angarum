var Schema = require('./schema.js');
var _ = require('lodash');

module.exports = Schema.extend('Order_schema', {
    init: function(obj) {
	this._super(_.extend(this.get_config(), obj));
    },

    get_config: function() {
	return {
	    invoice_number: "",
	    reference_number: "",
	    invoice_date: "",
	    service_type: "",
	    item_name: "",
	    quantity: "",
	    reasons: "",	    
	    
	    order_time: "",
	    order_type: "",
	    is_cod: "",
	    cod_amount: "",
	    declared_value: "",
	    
	    from_name : "",
	    from_address: "",
	    from_city: "",
	    from_state: "",
	    from_country: "",
	    from_mobile_number: "",
	    from_pin_code: "",

	    to_name: "",
	    to_address: "",
	    to_city: "",
	    to_state: "",
	    to_country: "",
	    to_mobile_number: "",
	    to_pin_code: "",	   	    

	    //optional
	    declaration: "I hereby declare that the above mentioned information is true and correct and value declared(value) is for transportation purpose and has no commercial value.Signature:",
	    weight: "",
	    length: "",
	    breadth: "",
	    height: "",

	    // from_email: "",
	    // to_email: "",
	};
    },

    get_out_config: function() {
	return {
	    "success": "",
	    "awb": "",
	    "err": "",
	    "tracking_url": "",
	};
    },
    
});
