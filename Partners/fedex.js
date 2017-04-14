var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");
var https = require('https');
var parser = require('xml2js');
var soap = require('soap');
var path = require('path');
var Putter = require('base64-string-s3');
var pdf = require('../utils/pdf');
var async = require('async');

var defaults = {
	imperial: false,
	currency: 'INR',
	language: 'en-US',
	environment: 'live',
	key: process.env['FEDEX_AUTH_KEY'],
	password: process.env['FEDEX_PASSWORD'],
	account_number: process.env['FEDEX_ACCOUNT_NUMBER'],
	meter_number: process.env['FEDEX_METER_NUMBER'],
	user_agent: 'Elanic'
};

var options = {
    key: process.env['AWS_S3_ACCESS_KEY_ID'],
    secret: process.env['AWS_S3_SECRET_ACCESS_KEY'],
    bucket: process.env['AWS_S3_LOGISTIC_BUCKET_NAME']
}

var hosts = {
	sandbox: 'https://wsbeta.fedex.com:443',
	live: 'https://ws.fedex.com:443'
};


function config(args) {
    var options = _.extend(defaults, args);
    return options;
};
function handleResponseError(params,result,cb) {
	params.set({
		success : false,
		err : (result) ? result.Notifications[0].message : ''
	})
	return cb(result,params);
}

function generateAuthentication(data,resource) {
	var options = defaults;
    var params = {
      WebAuthenticationDetail: {
        UserCredential: {
          Key: options.key,
          Password: options.password
        }
      },
      ClientDetail: {
        AccountNumber: options.account_number,
        MeterNumber: options.meter_number
      }
    };
    if(resource && resource.version) {
      params['Version'] = {
        ServiceId: resource.version.ServiceId,
        Major: resource.version.Major,
        Intermediate: resource.version.Intermediate,
        Minor: resource.version.Minor
      };
    }
    return _.extend(params, data);
}

function track_awb(awb,cb) {
	var data = {
	  	SelectionDetails: {
	    	PackageIdentifier: {
	      		Type: 'TRACKING_NUMBER_OR_DOORTAG',
	      		Value: awb
	    	}
	    },
	    ProcessingOptions: 'INCLUDE_DETAILED_SCANS'
	}
	soap.createClient(path.join(__dirname,  'wsdl', 'TrackService_v12.wsdl'), {endpoint: hosts[defaults.environment] + '/web-services'}, function(err, client) {
	    if (err) {
	    	return cb(err);
	    }
	    var resource =  { version: {ServiceId: 'trck', Major: 12, Intermediate: 0, Minor: 0}};
		var track_object = generateAuthentication(data,resource);
	    client.track(track_object, function(err, result) {
	    	return cb(err,result);
	    });
	});
}

function upload_label_to_s3(shipping_object,done) {
	var putter = new Putter(options);
	 
	// put arguments: base64 string, object key, mime type, permissions 
	var templateUrl = process.env['AWS_S3_LABEL_URL_PATH'] + process.env['AWS_S3_LOGISTIC_BUCKET_NAME'] + '/' + shipping_object.partner +'/'+ shipping_object.awb + '-shipping-label.pdf';
	putter.put(shipping_object.Image, shipping_object.partner +'/'+ shipping_object.awb + '-shipping-label.pdf', 'application/pdf', 'public-read');
	 
	putter.on('response', function (data) {
	    done(null,templateUrl);
	});
	 
	putter.on('error', function (err) {
	    console.error(err);
	    done(err);
	});
}

module.exports = Template.extend('FedEx', {

    init: function() {
	this._super(hosts[defaults.environment]);
    },
    order: function(params, cb) {
		var inp = params.get();
		var date = new Date();
		var from_street_line_1 = inp.from_address.substring(0,35);
		var from_street_line_2 = inp.from_address.substring(35);
		var to_street_line_1 = inp.to_address.substring(0,35);
		var to_street_line_2 = inp.to_address.substring(35);
		if(inp.is_cod) {
		var data = {
		  RequestedShipment: {
		    ShipTimestamp: new Date(date.getTime() + (24*60*60*1000)).toISOString(),
		    DropoffType: 'REGULAR_PICKUP',
		    ServiceType: (inp.is_cod) ? 'STANDARD_OVERNIGHT' : 'PRIORITY_OVERNIGHT',
		    PackagingType: 'YOUR_PACKAGING',
		    Shipper: {
		      Contact: {
		        PersonName: inp.from_name,
		        PhoneNumber: inp.from_mobile_number
		      },
		      Address: {
		        StreetLines: [
		        	from_street_line_1,
		        	from_street_line_2
		        ],
		        City: inp.from_city,
		        StateOrProvinceCode: inp.from_state,
		        PostalCode: inp.from_pin_code,
		        CountryCode: 'IN'
		      }
		    },
		    Recipient: {
		      Contact: {
		        PersonName: inp.to_name,
		        PhoneNumber: inp.to_mobile_number
		      },
		      Address: {
		        StreetLines: [
		        	to_street_line_1,
		        	to_street_line_2
		        ],
		        City: inp.to_city,
		        StateOrProvinceCode: inp.to_state,
		        PostalCode: inp.to_pin_code,
		        CountryCode: 'IN',
		        Residential: true
		      }
		    },
		    ShippingChargesPayment: {
		      PaymentType: 'SENDER',
		      Payor: {
		        ResponsibleParty: {
		          AccountNumber: defaults.account_number
		        }
		      }
		    },
		    SpecialServicesRequested : {
		    	SpecialServiceTypes : 'COD',
		    	CodDetail : {
		    		CodCollectionAmount : {
		    			Currency : 'INR',
		    			Amount : inp.cod_amount
		    		},
		    		CollectionType : 'CASH'
		    	}
		    },
		    CustomsClearanceDetail : {
		    	DutiesPayment : {
		    		PaymentType: 'SENDER',
				      Payor: {
				        ResponsibleParty: {
				          AccountNumber: defaults.account_number
				        }
				    }
		    	},
		    	CustomsValue : {
		    		Currency : 'INR',
		    		Amount :'20'
		    	},
		    	CommercialInvoice : {
		    		Purpose : (inp.is_cod) ? 'SOLD' : 'NOT_SOLD'
		    	},
		    	Commodities : {
		    		Name : inp.item_name,
		    		NumberOfPieces : '1',
		    		Description : inp.item_name,
		    		CountryOfManufacture : 'IN',
		    		Weight : {
		    			Units : 'KG',
		    			Value : '.400'
		    		},
		    		Quantity : '1',
		    		QuantityUnits : 'EA',
		    		UnitPrice : {
		    			Currency : 'INR',
		    			Amount : '20'
		    		},
		    		CustomsValue : {
		    			Currency : 'INR',
		    			Amount : '20'
		    		}
		    	}
		    },
		    LabelSpecification: {
		      LabelFormatType: 'COMMON2D',
		      ImageType: 'PDF',
		      LabelStockType: 'PAPER_4X6'
		    },
		    PackageCount: inp.quantity+'',
		    RequestedPackageLineItems: [{
		      SequenceNumber: 1,
		      GroupPackageCount: 1,
		      Weight: {
		        Units: 'KG',
		        Value: '.400'
		      }
		    }]
		  } 
		}
		if(!inp.is_cod) {
		  	delete data.RequestedShipment.SpecialServicesRequested;
		}
		soap.createClient(path.join(__dirname,  'wsdl', 'ShipService_v19.wsdl'), {endpoint: hosts[defaults.environment] + '/web-services'}, function(err, client) {
	      if (err) {
	        return cb(err, params);
	      }
	      var resource =  { version: {ServiceId: 'ship', Major: 19, Intermediate: 0, Minor: 0}};
	      var ship_object = generateAuthentication(data,resource);
	      client.processShipment(ship_object, function(err, result) {
	        if(err || result.HighestSeverity === 'ERROR') {
	          	return handleResponseError(params,result, cb);
	        }
	        inp.meter_number = defaults.meter_number;
	        inp.carrier = 'FEDEX';
	        inp.routing_number = result.CompletedShipmentDetail.OperationalDetail.UrsaPrefixCode + " "+
	         					 result.CompletedShipmentDetail.OperationalDetail.UrsaSuffixCode;
	        inp.AirportId = result.CompletedShipmentDetail.OperationalDetail.AirportId;
	        inp.AstraPlannedServiceLevel = result.CompletedShipmentDetail.OperationalDetail.AstraPlannedServiceLevel;
	        inp.CountryCode = result.CompletedShipmentDetail.OperationalDetail.CountryCode;
	      	inp.barcodeValue = result.CompletedShipmentDetail.CompletedPackageDetails[0].OperationalDetail.Barcodes.StringBarcodes[0].Value;
	       	inp.awb = result.CompletedShipmentDetail.CompletedPackageDetails[0].TrackingIds[0].TrackingNumber;
	       	inp.formId = result.CompletedShipmentDetail.CompletedPackageDetails[0].TrackingIds[0].FormId;
	       	if(inp.is_cod) {
	       		inp.codBarcodeValue = result.CompletedShipmentDetail.AssociatedShipments[0].PackageOperationalDetail.Barcodes.StringBarcodes[0].Value;
	       		inp.cod_awb = result.CompletedShipmentDetail.AssociatedShipments[0].TrackingId.TrackingNumber;
	       		inp.codFormId = result.CompletedShipmentDetail.AssociatedShipments[0].TrackingId.FormId;
	       		inp.cod_service_type = result.CompletedShipmentDetail.AssociatedShipments[0].ServiceType;
	       	}
	      	pdf.generateFedexPdf(inp,function(err,tracking_url){
				params.set({
	        		success : true,
	        		err : null,
	        		tracking_url : tracking_url,
	        		awb : inp.awb,
	        		cod_awb : inp.cod_awb
	        	});
	        	return cb(result,params);
			});
	      });
		});
		}
		else {
		var data = {
		  RequestedShipment: {
		    ShipTimestamp: new Date(date.getTime() + (24*60*60*1000)).toISOString(),
		    DropoffType: 'REGULAR_PICKUP',
		    ServiceType: 'PRIORITY_OVERNIGHT',
		    PackagingType: 'YOUR_PACKAGING',
		    Shipper: {
		      Contact: {
		        PersonName: inp.from_name,
		        PhoneNumber: inp.from_mobile_number
		      },
		      Address: {
		        StreetLines: [
		        	from_street_line_1,
		        	from_street_line_2
		        ],
		        City: inp.from_city,
		        StateOrProvinceCode: inp.from_state,
		        PostalCode: inp.from_pin_code,
		        CountryCode: 'IN'
		      }
		    },
		    Recipient: {
		      Contact: {
		        PersonName: inp.to_name,
		        PhoneNumber: inp.to_mobile_number
		      },
		      Address: {
		        StreetLines: [
		        	to_street_line_1,
		        	to_street_line_2
		        ],
		        City: inp.to_city,
		        StateOrProvinceCode: inp.to_state,
		        PostalCode: inp.to_pin_code,
		        CountryCode: 'IN',
		        Residential: true
		      }
		    },
		    ShippingChargesPayment: {
		      PaymentType: 'SENDER',
		      Payor: {
		        ResponsibleParty: {
		          AccountNumber: defaults.account_number
		        }
		      }
		    },
		    CustomsClearanceDetail : {
		    	DutiesPayment : {
		    		PaymentType: 'SENDER',
				      Payor: {
				        ResponsibleParty: {
				          AccountNumber: defaults.account_number
				        }
				    }
		    	},
		    	CustomsValue : {
		    		Currency : 'INR',
		    		Amount :'20'
		    	},
		    	CommercialInvoice : {
		    		Purpose : 'NOT_SOLD'
		    	},
		    	Commodities : {
		    		Name : inp.item_name,
		    		NumberOfPieces : '1',
		    		Description : inp.item_name,
		    		CountryOfManufacture : 'IN',
		    		Weight : {
		    			Units : 'KG',
		    			Value : '.400'
		    		},
		    		Quantity : '1',
		    		QuantityUnits : 'EA',
		    		UnitPrice : {
		    			Currency : 'INR',
		    			Amount : '20'
		    		},
		    		CustomsValue : {
		    			Currency : 'INR',
		    			Amount : '20'
		    		}
		    	}
		    },
		    LabelSpecification: {
		      LabelFormatType: 'COMMON2D',
		      ImageType: 'PDF',
		      LabelStockType: 'PAPER_4X6'
		    },
		    PackageCount: inp.quantity+'',
		    RequestedPackageLineItems: [{
		      SequenceNumber: 1,
		      GroupPackageCount: 1,
		      Weight: {
		        Units: 'KG',
		        Value: '.400'
		      }
		    }]
		  } 
		}
		if(inp.isCod) {
		  	data.PackageSpecialServiceType = 'COD';
		}
		soap.createClient(path.join(__dirname,  'wsdl', 'ShipService_v19.wsdl'), {endpoint: hosts[defaults.environment] + '/web-services'}, function(err, client) {
	      if (err) {
	        return cb(err, params);
	      }
	      var resource =  { version: {ServiceId: 'ship', Major: 19, Intermediate: 0, Minor: 0}};
	      var ship_object = generateAuthentication(data,resource);
	      client.processShipment(ship_object, function(err, result) {
	        if(err || result.HighestSeverity === 'ERROR') {
	          	return handleResponseError(params,result, cb);
	        }
	      	var Image = result.CompletedShipmentDetail.CompletedPackageDetails[0].Label.Parts[0].Image;
	      	var awb = result.CompletedShipmentDetail.CompletedPackageDetails[0].TrackingIds[0].TrackingNumber;
	      	var record = {
	      		Image : Image,
	      		awb : awb,
	      		partner : 'fedex'
	      	}
	    	upload_label_to_s3(record,function(error,url) {
	    		params.set({
	        		success : true,
	        		err : null,
	        		tracking_url : url,
	        		awb : awb
	        	});
	        	return cb(result,params);
	    	});
	      });
		});
		}
	},

    track: function(params, cb) {
	params.set({
	    "tracking_url": this.get_tracking_url(params.get().awb_number),
	});
	return cb(null, params);
    },

    get_tracking_url: function(awb) {
	return host + "/api/packages/track/?awb=" + awb;
    },
    single_tracking_status: function(params, cb) {
		track_awb(params.get().awb_number,function(err,result) {
			if(err || result.HighestSeverity === 'ERROR') {
	        	return handleResponseError(params,result, cb);
	        }
	        var details = [];
	        var obj = {};
	        var return_awb;
	        if(result.CompletedTrackDetails[0].TrackDetails[0].OtherIdentifiers) {
	        	return_awb = result.CompletedTrackDetails[0].TrackDetails[0].OtherIdentifiers[0].PackageIdentifier.Value;
	    	}
	        async.parallel([
	        	function track_return_awb(callback) {
	        		if(return_awb) {
	        			track_awb(return_awb,function(err,result) {
	        				callback(err,result);
	        			});
	        		}
	        		else {
	        			callback();
	        		}
	        	}
	        	],function(err,results) {
	        	if(err || (results[0] && results[0].HighestSeverity === 'ERROR')) {
	        		return handleResponseError(params,results[0], cb);
	        	}
	        	if(results[0] && results[0].CompletedTrackDetails[0].TrackDetails[0].Events) {
	        		for (var i=0; i<results[0].CompletedTrackDetails[0].TrackDetails[0].Events.length; i++) {
			        	obj = results[0].CompletedTrackDetails[0].TrackDetails[0].Events[i];
			        	var key = {};
			        	key.status = 'RTO-' + obj.EventType;
			        	key.time = obj.Timestamp;
			        	key.description = obj.EventDescription;
			        	key.location = obj.Address.City;
			        	details.push(key);
			        }
	        	}
	        	if(result.CompletedTrackDetails[0].TrackDetails[0].Events) {
			        for (var i=0; i<result.CompletedTrackDetails[0].TrackDetails[0].Events.length; i++) {
			        	obj = result.CompletedTrackDetails[0].TrackDetails[0].Events[i];
			        	var key = {};
			        	key.status = obj.EventType;
			        	key.time = obj.Timestamp;
			        	key.description = obj.EventDescription;
			        	key.location = obj.Address.City;
			        	details.push(key);
			        }
			    }
		        params.set({
	        		success : true,
	        		err : null,
	        		details : details,
	        		awb : params.get().awb_number
	        	});
	        	return cb(result,params);
	        });
	    })
    },
    cancel: function(params, cb) {
		var data = {
			TrackingId: {
	    		TrackingIdType: 'EXPRESS',
	        	TrackingNumber: params.get().awb
	    	},
	    	DeletionControl: 'DELETE_ONE_PACKAGE' 
		}
		soap.createClient(path.join(__dirname,  'wsdl', 'ShipService_v19.wsdl'), {endpoint: hosts[defaults.environment] + '/web-services'}, function(err, client) {
	      if (err) {
	        return cb(err, params);
	      }
	      var resource =  { version: {ServiceId: 'ship', Major: 19, Intermediate: 0, Minor: 0}};
	      var cancel_object = generateAuthentication(data,resource);
	      client.deleteShipment(cancel_object, function(err, result) {
	        if(err || result.HighestSeverity !== 'SUCCESS') {
	          return handleResponseError(params,result, cb);
	        }
	        params.set({
        		success : true,
        		err : null,
        		details : result.Notifications[0].Message,
        	});
	      	return cb(result,params);
	      });
		});
    }
});