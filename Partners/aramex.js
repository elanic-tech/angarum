const Template = require('./template.js');
const querystring = require('querystring');
const _ = require("lodash");
const soap = require('soap');
const path = require('path');
const oneDay = 24 * 60 * 60 * 1000;

const defaults = {
	env: 'test',
}

const hosts = {
	test: 'https://ws.dev.aramex.net',
	live: '',
};

function getClientInfo() {
	const condition = defaults.env !== 'test';
	return {
		UserName: condition ?
			process.env['ARAMEX_USER_NAME'] : 'testingapi@aramex.com',
		Password: condition ?
			process.env['ARAMEX_PASSWORD'] : 'R123456789$r',
		Version: condition ?
			process.env['ARAMEX_VERSION'] : 'v1.0',
		AccountNumber: condition ?
			process.env['ARAMEX_ACCOUNT_NUMBER'] : '36669982',
		AccountPin: condition ?
			process.env['ARAMEX_ACCOUNT_PIN'] : '331431',
		AccountEntity: condition ?
			process.env['ARAMEX_ACCOUNT_ENTITY'] : 'BOM',
		AccountCountryCode: condition ?
			process.env['ARAMEX_ACCOUNT_COUNTRY_CODE'] : 'IN',
	}
}
function handleResponseError(params, result, cb) {
	console.info("handleResponseError : ", result);
	params.set({
		success: false,
		err: (result && result.Notifications) ? result.Notifications[0].Message : ''
	})
	return cb(result, params);
}

function getShipments(inp) {
	const date = new Date();
	return {
		Shipment: {
			Shipper: {
				Reference1: inp.invoice_number,
				Reference2: inp.reference_number,
				AccountNumber: getClientInfo().AccountNumber,
				PartyAddress: {
					Line1: _.isEmpty(inp.from_address) ?
						inp.from_address_line_1 + inp.from_address_line_2 : inp.from_address,
					Line2: "",
					Line3: "",
					City: inp.from_city,
					StateOrProvinceCode: inp.from_state,
					PostCode: inp.from_pin_code,
					CountryCode: "IN"
				},
				Contact: {
					Department: "",
					PersonName: inp.from_name,
					Title: "",
					CompanyName: inp.from_name,
					PhoneNumber1: inp.from_mobile_number,
					PhoneNumber1Ext: "",
					PhoneNumber2: _.isEmpty(inp.from_alternate_mobile_number) ?
						inp.from_alternate_mobile_number : "",
					PhoneNumber2Ext: "",
					FaxNumber: "",
					CellPhone: inp.from_mobile_number,
					EmailAddress: "ops@elanic.in",
					Type: ""
				}
			},
			Consignee: {
				Reference1: inp.invoice_number,
				Reference2: inp.reference_number,
				AccountNumber: "",
				PartyAddress: {
					Line1: _.isEmpty(inp.to_address) ?
						inp.to_address_line_1 + inp.to_address_line_2 : inp.to_address,
					Line2: "",
					Line3: "",
					City: inp.to_city,
					StateOrProvinceCode: inp.to_state,
					PostCode: inp.to_pin_code,
					CountryCode: "IN"
				},
				Contact: {
					Department: "",
					PersonName: inp.to_name,
					Title: "",
					CompanyName: inp.to_name,
					PhoneNumber1: inp.to_mobile_number,
					PhoneNumber1Ext: "",
					PhoneNumber2: _.isEmpty(inp.to_alternate_mobile_number) ?
						inp.to_alternate_mobile_number : "",
					PhoneNumber2Ext: "",
					FaxNumber: "",
					CellPhone: inp.to_mobile_number,
					EmailAddress: "ops@elanic.in",
					Type: ""
				}
			},
			ShippingDateTime: new Date(date.getTime() + oneDay).toISOString(),
			DueDate: new Date(date.getTime() + 3 * oneDay).toISOString(),
			PickupLocation: "",
			OperationsInstructions: "",
			AccountingInstrcutions: "",
			Services: inp.is_cod ? "CODS" : "",
			Details: {
				Dimensions: {
					Length: "10",
					Width: "10",
					Height: "10",
					Unit: "cm"
				},
				ActualWeight: {
					Unit: "Kg",
					Value: "0.5"
				},
				ChargeableWeight: {
					Unit: "Kg",
					Value: "0.5"
				},
				DescriptionOfGoods: inp.item_name,
				GoodsOriginCountry: inp.from_country,
				NumberOfPieces: inp.quantity,
				ProductGroup: "DOM",
				ProductType: inp.is_cod ? "CDA" : "ONP",
				PaymentType: "P",
				PaymentOptions: "ACCT",
				CustomsValueAmount: {
					CurrencyCode: "INR",
					Value: inp.cod_amount
				},
				// CashOnDeliveryAmount: {
				// 	CurrencyCode: "INR",
				// 	Value: inp.declared_value
				// },
			}
		}
	}
}

function getPickupRequestData(inp, { Shipment }) {
	const date = new Date((new Date()).getTime() + oneDay); // one day after today
	date.setHours(10, 0, 0, 0);
	const PickupDate = date.toISOString();
	date.setHours(15, 0, 0, 0);
	const ReadyTime = date.toISOString();
	date.setHours(22, 0, 0, 0);
	const LastPickupTime = date.toISOString();
	const ClosingTime = date.toISOString();

	return {
		PickupAddress: Shipment.Shipper.PartyAddress,
		PickupContact: Shipment.Shipper.Contact,
		PickupLocation: "office",
		PickupDate,
		ReadyTime,
		LastPickupTime,
		ClosingTime,
		Comments: "",
		Reference1: Shipment.Shipper.Reference1,
		Reference2: Shipment.Shipper.Reference2,
		Vehicle: "",
		PickupItems: {
			PickupItemDetail: {
				ProductGroup: "DOM",
				ProductType: "ONP",
				NumberOfShipments: "1",
				PackageType: "CLOTHES",
				Payment: "P",
				ShipmentWeight: Shipment.Details.ActualWeight,
				ShipmentVolume: Shipment.Details.ActualWeight,
				NumberOfPieces: Shipment.Details.NumberOfPieces,
				CashAmount: {
					CurrencyCode: "INR",
					Value: "0"
				},
				ExtraCharges: {
					CurrencyCode: "INR",
					Value: "0"
				},
				ShipmentDimensions: Shipment.Details.Dimensions,
				Comments: ""
			}
		},
		Status: "Ready"
	}
}

function track_awb(awb, cb) {
	const wsdlLink = path.join(__dirname, 'wsdl', 'aramex', 'Tracking.wsdl');
	const trackRequest = {
		ClientInfo: getClientInfo(),
		Shipments: { string: awb },
	}
	soap.createClient(wsdlLink,
		{ endpoint: hosts[defaults.env] + '/ShippingAPI.V2/Tracking/Service_1_0.svc' },
		function (err, client) {
			if (err) {
				return cb(err, params);
			}
			client.TrackShipments(trackRequest, function (err, result) {
				if (err || result.HasErrors) {
				}
				return cb(err, result);

			});
		})

}
// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Aramex', {

	init: function () {
		this._super(hosts[defaults.env]);
	},

	order: function (params, cb) {
		const inputParams = params.get();

		const ClientInfo = getClientInfo();
		const Shipments = getShipments(inputParams);
		const shipmentRequestData = {
			ClientInfo,
			Shipments
		};
		const Pickup = getPickupRequestData(inputParams, Shipments);

		const wsdlLink = path.join(__dirname, 'wsdl', 'aramex', 'shipping-services-api-wsdl.wsdl');
		soap.createClient(wsdlLink,
			{ endpoint: hosts[defaults.env] + '/shippingapi/shipping/service_1_0.svc' },
			function (err, client) {
				if (err) {
					return cb(err, params);
				}
				client.CreatePickup({
					ClientInfo,
					Pickup
				}, function (err, result) {
					if (err || result.HasErrors
						|| _.isUndefined(result.ProcessedPickup.GUID)) {
						return handleResponseError(params, result, cb);
					}

					const { GUID } = result.ProcessedPickup;
					shipmentRequestData.Shipments.Shipment.PickupGUID = GUID;
					client.CreateShipments(shipmentRequestData, function (err, shipmentResult) {
						if (err || result.HasErrors
							|| _.isUndefined(shipmentResult.Shipments.ProcessedShipment[0].ID)) {
							return handleResponseError(params, result, cb);
						}
						const awb = shipmentResult.Shipments.ProcessedShipment[0].ID;
						return cb(err, {
							success: true,
							awb,
							tracking_url: "",
						});
					});
				});
			});
	},

	track: function (params, cb) {
		// params.set({
		// 	"tracking_url": this.get_tracking_url(params.get().awb_number),
		// });
		// return cb(null, params);
		track_awb(params.get().awb_number, cb);
	},

	get_tracking_url: function (awb) {
		return host + "/api/packages/track/?awb=" + awb;
	},

	cancel: function (params, cb) {

	},
});
