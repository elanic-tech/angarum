var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
var host = process.env['ECOMEXPRESS_HOST'];
var parser = require('xml2js').parseString;
var unirest = require('unirest');
var pdf = require('../utils/pdf');
var username = process.env['ECOMEXPRESS_USERNAME'];
var password = process.env['ECOMEXPRESS_PASSWORD'];
var async = require('async');

module.exports = Template.extend('EcomExpress', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
		var url = host + "apiv2/manifest_awb/";
		var inp = params.get();
		var json_input = [{
			"AWB_NUMBER" : inp.reference_number+"",
			"ORDER_NUMBER" : inp.orders[0]+"",
			"PRODUCT" : (inp.is_cod) ? 'COD' : 'PPD',
			"CONSIGNEE" : inp.to_name+"",
			"CONSIGNEE_ADDRESS1" : inp.to_address+"",
			"CONSIGNEE_ADDRESS2" : "",
			"CONSIGNEE_ADDRESS3" : "",
			"DESTINATION_CITY" : inp.to_city+"",
			"PINCODE" : inp.to_pin_code+"",
			"STATE" : inp.to_state+"",
			"MOBILE" : inp.to_mobile_number+"",
			"TELEPHONE" : "",
			"ITEM_DESCRIPTION" : inp.item_name+"",
			"PIECES" : inp.quantity+"",
			"COLLECTABLE_VALUE" : (inp.is_cod) ? inp.cod_amount : "0",
			"DECLARED_VALUE" : inp.declared_value+"",
			"ACTUAL_WEIGHT" : "0.4",
			"VOLUMETRIC_WEIGHT" : "0",
			"PICKUP_NAME" : inp.from_name+"",
			"PICKUP_ADDRESS_LINE1" : inp.from_address+"",
			"PICKUP_ADDRESS_LINE2" : "",
			"PICKUP_PINCODE" : inp.from_pin_code+"",
			"PICKUP_MOBILE" : inp.from_mobile_number+"",
			"PICKUP_PHONE" : inp.from_mobile_number+"",
			"RETURN_NAME" : inp.from_name+"",
			"RETURN_ADDRESS_LINE1" : inp.from_address+"",
			"RETURN_ADDRESS_LINE2" : "",
			"RETURN_PINCODE" : inp.from_pin_code+"",
			"RETURN_MOBILE": inp.from_mobile_number+"",
			"RETURN_PHONE" : ""
		}]
		unirest.post(url)
			.header('Content-Type','application/x-www-form-urlencoded')
			.send('awb='+inp.reference_number+'')
			.send('username='+username+'')
			.send('password='+password+'')
			.send('json_input='+JSON.stringify(json_input)+'')
			.end(function (response) {
			  if(_.isEmpty(response.body) || _.isUndefined(response.body.shipments)) {
			  	params.set({
					success: false,
					err : 'EcomExpress Unknown error'
				});
			  }
			  else if(response.body.shipments[0].success === false) {
			  	params.set({
					success: false,
					err : response.body.shipments[0].reason
				});
			  }
			  else {
			  	pdf.generatePdf(inp,function(err,tracking_url){
			  		params.output(response.body);
					params.set({
						success: true,
						tracking_url : tracking_url,
						awb : inp.reference_number
					});
					cb(response,params);
				});
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
	return host + "track_me/api/mawb/";
    },

    single_tracking_status: function(params, cb) {
		track_awb(params.get().awb_number,params,function(err,result) {
			if(err || _.isEmpty(result['ecomexpress-objects'].object)) {
				return cb(result,err);
			}
			var details = [];
		  	var indexes = getIndex(result);
		  	var scan_index = indexes.index;
		  	var ref_awb = indexes.ref_awb;
		  	async.parallel([
	        	function track_return_awb(callback) {
	        		if(ref_awb) {
	        			track_awb(ref_awb,params,function(err,result) {
	        				callback(err,result);
	        			});
	        		}
	        		else {
	        			callback();
	        		}
	        	}
	        	],function(err,results) {
	        	if(err) {
					return cb(results[0],err);
				}
				if(ref_awb && results.length > 0 && results[0]['ecomexpress-objects'].object) {
					indexes = getIndex(results[0]);
					var ref_scan_index = indexes.index;
					details.push.apply(details,getDetails(results[0],ref_scan_index,'RTO'));
				}
				details.push.apply(details,getDetails(result,scan_index,'forward'));
				params.set({
					success: true,
					err : null,
					awb : params.get().awb_number,
					details : details
				});
				cb(result,params);
			});
		});
    },

    cancel: function(params, cb) {
    	var url = host + "apiv2/cancel_awb/";
		unirest.post(url)
			.header('Content-Type','application/x-www-form-urlencoded')
			.send('awbs='+params.get().awb+'')
			.send('username='+username+'')
			.send('password='+password+'')
			.end(function (response) {
			  var shipments = response.body;
			  if(shipments[0].success === false) {
			  	params.set({
					success: false,
					err : shipments[0].reason
				});
			  }
			  else {
			  	params.output(response.body);
				params.set({
					success: true
				});
			  }
			  cb(response,params);
		});
    },

});

function track_awb(awb,params,done) {
	var url = 'http://plapi.ecomexpress.in/track_me/api/mawbd/';
	unirest.post(url)
		.header('Content-Type','application/x-www-form-urlencoded')
		.send('awb='+awb+'')
		.send('username='+username+'')
		.send('password='+password+'')
		.end(function (response) {
		  parser(response.body,function(err,result){
		  	if(err) {
				params.set({
					success: false,
					err : err
				});
				return done(params);
			}
		  	done(null,result);
		  });
	});
}

function getIndex(result) {
	var results = {};
	results.index = -1;
	_.map(result['ecomexpress-objects'].object[0].field,function(o,ind){
  		if(o.$.name === 'scans') {
  			results.index = ind;
  		}
  		if(o.$.name === 'ref_awb') {
  			results.ref_awb = o._;
  		}
	});
	return results;
}

function getDetails(result,scan_index,type) {
	var details = [];
	var obj = {};
	if(scan_index >= 0) {
		var scans = result['ecomexpress-objects'].object[0].field[scan_index];
	  	for(var i = 0;i<scans.object.length;i++) {
	  		obj = scans.object[i];
	  		var key = {};
	  		var reason_code;
	  		for(var j = 0;j<obj.field.length;j++) {
		  		if(obj.field[j].$.name === 'location') {
		  			key.location = obj.field[j]._;
		  		}
		  		if(obj.field[j].$.name === 'updated_on') {
		  			key.time = formatDate(obj.field[j]._);
		  		}
		  		if(obj.field[j].$.name === 'status') {
		  			key.description =  obj.field[j]._;
		  		}
		  		if(obj.field[j].$.name === 'reason_code_number') {
		  			reason_code =  (obj.field[j]._) ? obj.field[j]._.slice(-3) : '';
		  		}
		  	}
		  	key.status = (type === 'RTO') ? type +"-" + reason_code : reason_code;
	  		details.push(key);
		}
	}
	return details;
}

function formatDate(time) {
	var date_parts = time.split(/[ ,]+/);
	var date = new Date(date_parts[0] + " " + date_parts[1] + " " + date_parts[2]);
	date.setDate(date.getDate() + 1);
	date.setHours(-18,-30,0);
	var time_parts = date_parts[3].split(':');
	date.setHours(time_parts[0],time_parts[1]);
	return date;
}