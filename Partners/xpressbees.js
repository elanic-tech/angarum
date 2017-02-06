var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
var moment = require("moment");
var host = process.env['XPRESSBEES_HOST'];
var token = process.env['XPRESSBEES_TOKEN'];

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('XpressBees', {

	init: function() {
	this._super(host);
	},
	
	order: function(params, cb) {
		var url;
		// Check out Order schema file for more information.
		params.map([], {
			// "from_mapping_1" : "to_mapping_1",
			// "from_mapping_2" : "to_mapping_2",
		}, function(inp) {
			url = (inp.order_type === 'delivery' || inp.order_type === 'sbs') ? "AddManifestDetails" : "PushReverseManifestDetails" ;
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
						"ProductDesc": inp.product_desc,
						"NetPayment": inp.cod_amount,
						"OctroiMRP": inp.declared_value,
						"BillableWeight": 0,
						"VolWeight": 0,
						"PhyWeight": 0,
						"ShipLength": 0,
						"ShipWidth": 0,
						"ShipHeight": 0,
						"AirWayBillNO": inp.reference_number,
						"ServiceType": "SD",
						"Quantity": inp.quantity,
						"PickupVendorCode": "M34"
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
							
						Length: 0,
						Width: 0,
						Height: 0,
						PhyWeight: 0,
						VolWeight: 0,
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
			return req;	 
		});

		params.out_map({}, function(out) {
			out.success = (out[url][0].ReturnMessage === 'successful');
			out.awb = out[url][0].AWBNo;
			if(!out.success) out.err = out.url[0].ReturnMessage;			
			return out;
		});		
		return this.post_req("/" + url, params, cb);
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
		params.map([], {
			"awb_number" : "AWBNo",
		},function(inp) {
			type = inp.order_type;	
			url = (inp.order_type === 'delivery' || inp.order_type === 'sbs') ?  host + "/GetShipmentStatus" :  host + "/GetReverseManifestStatus";	
			delete inp.order_type;
			inp.XBkey = token;
			return inp;			
		});
		
		params.out_map({		    
		}, function(out) {
			var response = {};
			if(type === 'delivery' || type === 'sbs') {
				if(out.ShipmentStatusDetails[0].ReturnMessage === 'Successful') {
					response.success = true;
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
				}
				else {
					esponse.success = false;
					response.error = out.ShipmentStatusDetails[0].ReturnMessage;
				}
			}
			else {
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
			}
			return response;
		});
		return this.post_req(url, params, cb, {url: url})
	},

	cancel: function(params, cb) {
		var url = "RTONotifyShipment";
		params.map([], {
		}, function(inp) {
			var req = {
				XBkey: token,
				AWBNumber: inp.awb,
				RTOReason: "Cancelled by the user"
			}
			return req;
		});

		params.out_map({}, function(out) {
			out.success = (out[url][0].ReturnMessage === 'successful');
			out.awb = out[url][0].AWBNumber;
			if(!out.success) out.err = out.url[0].ReturnMessage;			
			return out;
		});
		
		return this.post_req("/" + url, params, cb);
	},

});
