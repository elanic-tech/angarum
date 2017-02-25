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
			var s3_file_name = data.partner +'/'+ data.awb + '-shipping-label.pdf';
			var templateUrl = process.env['AWS_S3_LABEL_URL_PATH'] + process.env['AWS_S3_LOGISTIC_BUCKET_NAME'] + '/' + s3_file_name;
			var s3stream = stream.pipe(s3_upload(s3_file_name));
			s3stream.on('finish',function() {
				cb(err,templateUrl);
			});
		}
	});
}
// Helper to parse order and generate pdf
function parseOrder(object,done) {
	var data = {};
	data.partner = object.partner_name;
	data.awb = object.reference_number;
	data.invoice_id = object.orders[0];
	data.routing_code = object.order_ids[0];
	data.product_desc = object.item_name;
	data.cod_amount = object.cod_amount;
	data.payment_mode = (object.is_cod) ? "cod" : "prepaid";
	data.declaration = object.declaration;
	data.destination_code = (object.destination_code) ? object.destination_code : undefined;
	data.fromAddress = {
		name : object.from_name,
		address : object.from_address,
		city : object.from_city,
		state : object.from_state,
		pin : object.from_pin_code,
		number : object.from_mobile_number,
		email : 'None'
	}
	data.toAddress = {
		name : object.to_name,
		address : object.to_address,
		city : object.to_city,
		state : object.to_state,
		pin : object.to_pin_code,
		number : object.to_mobile_number,
		email : 'None'
	}
	const result = renderLabelTemplate(data);
	generatePDF('label', data, result,function(err,url) {
		done(err,url);
	});
};

exports.generatePdf = parseOrder;