var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
var moment = require("moment");
var request = require('request');
var host = process.env['XPRESSBEES_HOST'];
var token = process.env['XPRESSBEES_TOKEN'];
var pdf = require('../utils/pdf');
var async = require('async');
// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('XpressBees', {

	init: function() {
	this._super(host);
	},
	
	order: function(params, cb) {
		var self = this;
		var inp = params.get();
		var url = (inp.order_type === 'delivery' || inp.order_type === 'sbs') ? "AddManifestDetails" : "PushReverseManifestDetails" ;
		if(inp.order_type === 'delivery' || inp.order_type === 'sbs') {
			var date = new Date();
			var req = {
				XBkey: token,
				ManifestDetails: {
					"ManifestID": moment(date).format('YYYY') + moment(date).format('MM') + moment(date).format('DD'),
					"OrderType": (inp.is_cod) ? "COD" : "PrePaid",
					"OrderNo": inp.invoice_number,
					"PaymentStatus": (inp.is_cod) ? "COD" : "PrePaid",
					"PickupVendor": inp.from_name,
					"PickVendorPhoneNo": inp.from_mobile_number,
					"PickVendorAddress": inp.from_address,
					"PickVendorCity": inp.from_city,
					"PickVendorState": inp.from_state,
					"PickVendorPinCode": inp.from_pin_code,
					"CustomerName": inp.to_name,
					"CustomerAddress": inp.to_address,
					"CustomerCity": inp.to_city,
					"CustomerState": inp.to_state,
					"ZipCode": inp.to_pin_code,
					"CustomerMobileNo": inp.to_mobile_number,
					"RTOName": inp.from_name,
					"RTOMobileNo": inp.from_mobile_number,
					"RTOAddress": inp.from_address,
					"RTOToCity": inp.from_city,
					"RTOToState": inp.from_state,
					"RTOPinCode": inp.from_pin_code,
					"ProductMRP": inp.declared_value,
					"ProductGroup": inp.item_name,
					"ProductDesc": inp.item_name,
					"NetPayment": inp.cod_amount,
					"OctroiMRP": inp.declared_value,
					"BillableWeight": 0,
					"VolWeight": 0,
					"PhyWeight": 0.4,
					"ShipLength": 15,
					"ShipWidth": 14,
					"ShipHeight": 11,
					"AirWayBillNO": inp.reference_number,
					"ServiceType": "SD",
					"Quantity": inp.quantity,
					"PickupVendorCode": "Elanic123"
				}
			}
		}
		else {
			var req = {
				XBkey: token,
				ReverseManifestData: {
					AWB_No: inp.reference_number,
					Order_ID: inp.invoice_number,
					Return_Reason: "",
						
					Destination_Address: inp.to_address,
					Destination_City: inp.to_city,
					Destination_Country: inp.to_country,
					Destination_Name: inp.to_name,
					Destination_Phone: inp.to_mobile_number,
					Destination_Pincode: inp.to_pin_code,
					Destination_State: inp.to_state,
										
					Pickup_Landmark: "",
					Pickup_Address: inp.from_address,
					Pickup_City: inp.from_city,
					Pickup_Country: inp.from_country,
					Pickup_Name: inp.from_name,
					Pickup_Phone: inp.from_mobile_number,
					Pickup_Pincode: inp.from_pin_code,
					Pickup_State: inp.from_state,
					Pickup_Email: "",
						
					Length: 15,
					Width: 14,
					Height: 11,
					PhyWeight: 0.4,
					VolWeight: 0.4,
					ProductId: inp.reference_number,
					ProductQty: inp.quantity,
					ProductName: inp.item_name,
					ProductMRP: inp.declared_value,
					NetPayment: inp.cod_amount,
					ProductCategory: "",
					ProductDescription: "",
				}
			};
		}
		var options = {
			url: host + "/" + url,
		    body: req,
		    json: true,
		    method: 'POST'	
		}
		
		function callback(error, response, body) {
			if (error || _.isEmpty(body.AddManifestDetails) || body.AddManifestDetails[0].ReturnMessage !== 'successful') {
			    params.set({
				success: false,
				err : body.AddManifestDetails[0].ReturnMessage
			    });
			    cb(response,params);
			}
			else {
				if(params.get().order_type === 'delivery' || params.get().order_type === 'sbs') {
					pdf.generatePdf(params.get(),function(err,tracking_url){
						params.output(body);
						var obj = params.get();
						obj.tracking_url = tracking_url;
						obj.awb = inp.reference_number;
						obj.success = true;
						params.set(obj);
						cb(response,params);
					});
				}
				else {
					params.output(body)
					var obj = params.get();
					obj.awb = inp.reference_number;
					obj.success = true;
					params.set(obj);
					cb(response,params);
				}
			}
		}
		return request(options, callback);
	},

	track: function(params, cb) {
	params.set({"tracking_url": this.get_tracking_url(params.get().awb_number) });
	return cb(null, params);
	},

	get_tracking_url: function(awb) {
	return host + "/GetReverseManifestStatus";
	},

	single_tracking_status: function(params, cb) {
		var url,type;
		// // var url = "http://xbclientapi.xpressbees.com/ElanicService.svc/GetShipmentStatus";
		// var url = "http://114.143.206.69:803/ElanicService.svc/GetShipmentStatus";
		if(params.get().order_type === 'delivery' || params.get().order_type === 'sbs') {
			var options = {
			  url: host + '/GetShipmentSummaryDetails',
			  method: 'POST',
			  json: true,
			  body: {"AWBNo":params.get().awb_number,"XBkey": token},
			  headers: {
			    'Content-Type': 'application/json'
			  },
			};
			function callback(error, response, body) {
			  if (error) {
			    params.set({
				success: false
			    });
			    return cb(response,params);
			  }
			  	var out_response = {};
	            if(body && body[0].ReturnMessage === 'Successful') {
	                out_response.success = true;
	                var details = [];
	                var obj = {};
	                for (var i=0; i<body[0].ShipmentSummary.length; i++) {
	                	var key = {};
	                    obj = body[0].ShipmentSummary[i];
	                    var date_string = obj.StatusDate.toString().split("-");
	                    var date = new Date(date_string[2], Number(date_string[1]) - 1,Number(date_string[0]) + 1,-18,-30,0);
	                    date.setHours(obj.StatusTime.substring(0,2),obj.StatusTime.substring(2),0);
	                    key.time = date;
	                    key.status = obj.StatusCode;
	                    key.description = (obj.Comment) ? obj.Comment : '';
	                    key.location = obj.Location;
	                    details.push(key);
	                }
	                out_response.details = details;
	            }
	            else {
	            	out_response.success = false;
	            	out_response.error = (body) ? body[0].ReturnMessage : '';
	            }
			  params.output(out_response)
			  cb(response,params);
			};
			return request(options, callback);
		}
		else {
			params.map([], {
				"awb_number" : "AWBNo",
			},function(inp) {
				type = inp.order_type;	
				url = host + "/GetReverseManifestStatus";	
				delete inp.order_type;
				inp.XBkey = token;
				return inp;			
			});
			
			params.out_map({	    
			}, function(out) {
				var response = {};
				if (out.ShipmentStatusDetails) {
					response.success = true;
					response.awb = out.ShipmentStatusDetails[0].AWBNO;				
					var details = [];
					var key = {};
					var obj = {};
					for (var i=0; i<out.ShipmentStatusDetails.length; i++) {
						obj = out.ShipmentStatusDetails[i];
						key.time = obj.StatusDate;
						key.status = obj.Status;
						key.description = obj.TransporterRemark;
						key.location = obj.CurrentLocation;
						details.push(key);
					}
					response.details = details;
				} else {
					response.success = false;
					response.error = "Invalid AWB";
				}
				return response;
			});
			return this.post_req(url, params, cb, {url: url})
		}
	},

	cancel: function(params, cb) {
		var url = 'RTONotifyShipment';
		//if(params.get().order_type === 'delivery' || params.get().order_type === 'sbs') {
			var options = {
			  url: host + '/RTONotifyShipment',
			  method: 'POST',
			  json: true,
			  body: {"AWBNumber":params.get().awb,"XBkey": token,"RTOReason": "Cancelled by the user"},
			  headers: {
			    'Content-Type': 'application/json'
			  },
			};
			function callback(error, response, body) {
			  if (error) {
			    params.set({
				success: false
			    });
			    cb(response,params);
			  }
			  params.output(body)
			  params.set({
				success: true
			    });
			  cb(response,params);
			};
			return request(options, callback);
		// }
		// else {
		// 	params.map([], {
		// 	}, function(inp) {
		// 		var req = {
		// 			XBkey: token,
		// 			AWBNumber: inp.awb,
		// 			RTOReason: "Cancelled by the user"
		// 		}
		// 		return req;
		// 	});

		// 	params.out_map({}, function(out) {
		// 		out.success = (out[url][0].ReturnMessage === 'successful');
		// 		out.awb = out[url][0].AWBNumber;
		// 		if(!out.success) out.err = out.url[0].ReturnMessage;			
		// 		return out;
		// 	});
			
		// 	return this.post_req("/" + url, params, cb);
		// }
	},

});
