const _ = require('lodash');
var fs = require('fs');
var pdf = require('html-pdf');
var ejs = require('ejs');
var s3WriteStream = require('s3-write-stream');

var s3_upload = s3WriteStream({
	accessKeyId: process.env['AWS_S3_ACCESS_KEY_ID'],
    secretAccessKey: process.env['AWS_S3_SECRET_ACCESS_KEY'],
	Bucket: process.env['AWS_S3_LOGISTIC_BUCKET_NAME']
});

var ejs_options = {};

var renderBarcodeHtml = fs.readFileSync(__dirname + '/../views/shipping-label.html', 'UTF-8');
var renderLabelTemplate = ejs.compile(renderBarcodeHtml, ejs_options);

var renderFedexBarcodeHtml = fs.readFileSync(__dirname + '/../views/fedex-shipping-label.html', 'UTF-8');
var renderFedexLabelTemplate = ejs.compile(renderFedexBarcodeHtml, ejs_options);

const pdf_options = {
  "format": "A4",
  "orientation": "portrait"
};
//
// Helper to generate and upload to amazon s3.
function generatePDF(pdf_name, data, html,cb) {
	pdf.create(html, pdf_options).toStream(function (err, stream) {
		if (err) {
			console.log(err);
			return cb(err);
		} else {
			var s3_file_name = data.partner +'/'+ data.awb.replace(/ /g,'') + '-shipping-label.pdf';
			var templateUrl = process.env['AWS_S3_LABEL_URL_PATH'] + process.env['AWS_S3_LOGISTIC_BUCKET_NAME'] + '/' + s3_file_name;
			var s3stream = stream.pipe(s3_upload(s3_file_name));
			s3stream.on('finish',function() {
				cb(err,templateUrl);
			});
		}
	});
}

function GetFormattedDate(date) {
	var time;
	if(!date)
		time = new Date();
	else
		time = new Date(date);
	var month = time.getMonth() + 1;
	var day = time.getDate() + 1;
	var year = time.getFullYear();
	day = (day.toString().length === 1) ? "0" + day+"" : day;
	month = (month.toString().length === 1) ? "0" + month+"" : month;
	return month + "/" + day + "/" + year;
}

// Helper to parse order and generate pdf
function parseOrder(object,done) {
	var data = {};
	data.partner = object.partner_name;
	data.awb = object.reference_number;
	data.invoice_id = object.orders[0];
	// @TODO: support multiple orders for pickup
	data.routing_code = object.order_ids[0];
	data.product_desc = object.item_name;
	data.product_desc_label = object.item_name.trim().length >= 22 ? object.item_name.slice(22)+"..." : object.item_name;
	data.cod_amount = object.cod_amount;
	data.payment_mode = (object.is_cod) ? "cod" : "prepaid";
	data.declaration = object.declaration;
	data.invoice_date = GetFormattedDate(object.invoice_date);
	data.order_type = object.order_type;
	data.destination_code = (object.destination_code) ? object.destination_code : undefined;
	data.fromAddress = {
		name : object.from_name,
		address : object.from_address,
		city : object.from_city,
		state : object.from_state,
		pin : object.from_pin_code,
		number : /*_.get(object, "order_type", "") === "forward_p2p" ? "CONFIDENTIAL" :*/ object.from_mobile_number,
		email : 'None'
	}
	data.toAddress = {
		name : object.to_name,
		address : object.to_address,
		city : object.to_city,
		state : object.to_state,
		pin : object.to_pin_code,
		number : /*_.get(object, "order_type", "") === "forward_p2p" ? "CONFIDENTIAL" :*/ object.to_mobile_number,
		email : 'None'
	}
	const result = renderLabelTemplate(data);
	generatePDF('label', data, result,function(err,url) {
		done(err,url);
	});
};

// Helper to parse order and generate pdf
function parseFedexOrder(object,done) {
	var data = {};
	var today = new Date().toDateString();
	var date_part = today.split(" ");
	data.partner = object.partner_name;
	data.awb = object.awb.replace(/(.{4})/g,"$1 ");
	data.cod_awb = (object.is_cod) ? object.cod_awb.replace(/(.{4})/g,"$1 ") : '';
	data.barcodeValue = object.barcodeValue;
	data.codBarcodeValue = (object.is_cod) ? object.codBarcodeValue : '';
	data.payment_mode = (object.is_cod) ? "COD" : "PREPAID";
	data.cod_payment_mode = (object.is_cod) ? "COD RETURN" : "";
	data.declaration = object.declaration;
	data.is_cod = object.is_cod;
	data.formId = object.formId;
	data.codFormId = (object.is_cod) ? object.codFormId : '';
	data.routing = object.routing_number;
	data.date = date_part[1] + " " + date_part[2] + ", " + date_part[3];
	data.service_type = (object.delivery_type && object.delivery_type === 'surface') ? 'FEDEX_EXPRESS_SAVER' : 'STANDARD OVERNIGHT';
	data.cod_service_type = (object.is_cod) ? object.cod_service_type.split("_").join(" ") : '';
	data.weight = (object.delivery_type && object.delivery_type === 'surface') ? "8" : "0.4KG";
	data.carrier = object.carrier;
	data.meter = object.meter_number;
	data.invoice_id = object.orders[0];
	data.invoice_date = GetFormattedDate(object.invoice_date);
	data.order_type = object.order_type;
	data.routing_code = object.order_ids[0];
	data.product_desc = object.item_name;
	data.cod_amount = object.cod_amount;
	data.declaration = object.declaration;
	data.shipDate = GetFormattedDate();
	data.AirportId = object.AirportId;
	data.AstraPlannedServiceLevel = object.AstraPlannedServiceLevel;
	data.CountryCode = object.CountryCode;
	data.fromAddress = {
		name : object.from_name,
		address : object.from_address,
		city : object.from_city,
		state : object.from_state,
		pin : object.from_pin_code,
		number : /*_.get(object, "order_type", "") === "forward_p2p" ? "CONFIDENTIAL" :*/ object.from_mobile_number,
		email : 'None'
	}
	data.toAddress = {
		name : object.to_name,
		address : object.to_address,
		city : object.to_city,
		state : object.to_state,
		pin : object.to_pin_code,
		number : /*_.get(object, "order_type", "") === "forward_p2p" ? "CONFIDENTIAL" :*/ object.to_mobile_number,
		email : 'None'
	}
	const result = renderFedexLabelTemplate(data);
	generatePDF('label', data, result,function(err,url) {
		done(err,url);
	});
};

exports.generateFedexPdf = parseFedexOrder;
exports.generatePdf = parseOrder;
