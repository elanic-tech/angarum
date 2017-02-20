var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
var host = process.env['ECOMEXPRESS_HOST'];
var parser = require('xml2js').parseString;
var unirest = require('unirest');
var async = require('async');
var pdf = require('../utils/pdf');
var username = process.env['ECOMEXPRESS_USERNAME'];
var password = process.env['ECOMEXPRESS_PASSWORD'];

module.exports = Template.extend('EcomExpress', {

    init: function() {
	this._super(host);
    },
    
    order: function(params, cb) {
    	var tracking_url;
		var url = host + "apiv2/manifest_awb/";
		async.parallel([
		function generatePDF(callback) {
			if(params.get().order_type === 'delivery' || params.get().order_type === 'sbs') {
				pdf.generatePdf(params.get(),function(err,url){
					tracking_url = url;
					callback(err,url);
				});
			}
			else {
				callback();
			}
		}],function(err,results) {
			var inp = params.get();
			var json_input = [{
				"AWB_NUMBER" : inp.reference_number+"",
				"ORDER_NUMBER" : inp.orders[0]+"",
				"PRODUCT" : (inp.is_cod) ? 'COD' : 'PPD',
				"CONSIGNEE" : inp.from_name+"",
				"CONSIGNEE_ADDRESS1" : inp.from_address+"",
				"CONSIGNEE_ADDRESS2" : "",
				"CONSIGNEE_ADDRESS3" : "",
				"DESTINATION_CITY" : inp.from_city+"",
				"PINCODE" : inp.from_pin_code+"",
				"STATE" : inp.from_state+"",
				"MOBILE" : inp.from_mobile_number+"",
				"TELEPHONE" : "",
				"ITEM_DESCRIPTION" : inp.item_name+"",
				"PIECES" : inp.quantity+"",
				"COLLECTABLE_VALUE" : (inp.is_cod) ? inp.cod_amount : "0",
				"DECLARED_VALUE" : inp.declared_value+"",
				"ACTUAL_WEIGHT" : "0.4",
				"VOLUMETRIC_WEIGHT" : "0",
				"LENGTH" : "15",
				"BREADTH" : "15",
				"HEIGHT" : "15",
				"PICKUP_NAME" : inp.to_name+"",
				"PICKUP_ADDRESS_LINE1" : inp.to_address+"",
				"PICKUP_ADDRESS_LINE2" : "",
				"PICKUP_PINCODE" : inp.to_pin_code+"",
				"PICKUP_MOBILE" : inp.to_mobile_number+"",
				"PICKUP_PHONE" : inp.to_mobile_number+"",
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
				  var shipments = response.body.shipments;
				  if(shipments[0].success === false) {
				  	params.set({
						success: false,
						err : shipments[0].reason
					});
				  }
				  else {
				  	params.output(response.body);
					params.set({
						success: true,
						tracking_url : tracking_url,
						awb : inp.reference_number
					});
				  }
				  cb(response,params);
			});
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
		var url = host + "track_me/api/mawb/";
		unirest.post(url)
			.header('Content-Type','application/x-www-form-urlencoded')
			.send('awb='+params.get().awb_number+'')
			.send('username='+username+'')
			.send('password='+password+'')
			.end(function (response) {
			  parser(response.body,function(err,result){
				  var shipments = result;
				  if(shipments.success === false) {
				  	params.set({
						success: false,
						err : shipments[0].reason
					});
				  }
				  else {
				  	params.output(result);
					params.set({
						success: true
					});
				  }
				  cb(response,params);
			  })
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
