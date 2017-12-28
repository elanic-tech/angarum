var Template = require('./template.js');
var querystring = require('querystring');
var _ = require("lodash");

var host = 'http://dotzot-test.azurewebsites.net';

// Declare partner specific variables here.
// Check out other partners for more information.

module.exports = Template.extend('Dotzot', {

    init: function() {
	this._super(host);
    },

    order: function(params, cb) {
	     var url = `${host}/RestService/PushOrderDataService.svc/PushOrderData_PUDO_New`;
       const inp = params.get();
       const body = `
       <NewDataSet xmlns="http://schemas.datacontract.org/2004/07/WebX.Entity">
        <Customer>
          <CUSTCD>CC000101301</CUSTCD>
        </Customer>
        <DocketList>
          <DocketList>
            <AgentID></AgentID>
            <AwbNo></AwbNo>
            <Breath>1</Breath>
            <CollectableAmount>${_.get(inp, "cod_amount", 0)}</CollectableAmount>
            <CustomerName>${_.get(inp, "to_name", "")}</CustomerName>
            <Height>1</Height>
            <IsPudo>N</IsPudo>
            <ItemName>${_.get(inp, "item_name"), ""}</ItemName>
            <Length>1</Length>
            <Mode>C</Mode>
            <NoOfPieces>${_.get(inp, "quantity", 1)}</NoOfPieces>
            <OrderConformation>Y</OrderConformation>
            <OrderNo>${_.get(inp, "invoice_number", "")}</OrderNo>
            <ProductCode>${_.get(inp, "order_id", "")}</ProductCode>
            <PudoId></PudoId>
            <RateCalculation>N</RateCalculation>
            <ShippingAdd1>${_.get(inp, "to_address", "")}</ShippingAdd1>
            <ShippingAdd2></ShippingAdd2>
            <ShippingCity>${_.get(inp, "to_city")}</ShippingCity>
            <ShippingEmailId>""</ShippingEmailId>
            <ShippingMobileNo>${_.get(inp, "to_mobile_number", "")}</ShippingMobileNo>
            <ShippingState>${_.get(inp, "to_state", "")}</ShippingState>
            <ShippingTelephoneNo></ShippingTelephoneNo>
            <ShippingZip>${_.get(inp, "to_pin_code", "")}</ShippingZip>
            <TotalAmount>${_.get(inp, "cod_amount", "")}</TotalAmount>
            <TypeOfDelivery>Home Delivery</TypeOfDelivery>
            <TypeOfService>Express</TypeOfService>
            <UOM>Per KG</UOM>
            <VendorAddress1>${_.get(inp, "from_address", "")}</VendorAddress1>
            <VendorAddress2></VendorAddress2>
            <VendorName>${_.get(inp, "from_name", "")}</VendorName>
            <VendorPincode>${_.get(inp, "from_pin_code", "")}</VendorPincode>
            <VendorTeleNo>${_.get(inp, "from_mobile_number", "")}</VendorTeleNo>
            <Weight>400</Weight>
          </DocketList>
        </DocketList>
      </NewDataSet>`

       const postReq = unirest.post(url);
       postReq.header('Content-Type', 'application/xml');
       postReq.send(body);
       postReq.end((response) => {
         const body = _.get(response, "body");
         console.log(body)
         return cb(response, params);
       })
	  });

	return this.post_req(url, params, cb);
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

    cancel: function(params, cb) {
	var url = "/api/packages/cancel/";
	params.map(["to_be_omitted_1", "to_be_omitted_2"], {
	    "from_mapping_1" : "to_mapping_1",
	    "from_mapping_2" : "to_mapping_2",
	}, function(inp) {
	    return _.extend({
		"auth_token": 'sfwerlkjwevs',
	    }, inp);
	});

	params.out_map({}, function(out) {
	    out.success = !Boolean(out.err);
	    return out;
	});

	return this.post_req(url, params, cb);
    },

});
