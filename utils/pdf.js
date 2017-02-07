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

var renderBarcodeHtml = fs.readFileSync('../views/shipping_label.html', 'UTF-8');
var renderLabelTemplate = ejs.compile(renderBarcodeHtml, ejs_options);

const pdf_options = {
	format: 'Letter',
	orientation: "landscape"
};
//
// Helper to generate and upload to amazon s3.
 function generatePDF(pdf_name, data, html,cb) {
	pdf.create(html, pdf_options).toStream(function (err, stream) {
		if (err) {
			console.log(err);
			return cb(err);
		} else {
			var s3_file_name = data.partner +'/' + data.awb + '-shipping-label.pdf';
			var templateUrl = 'https://s3-ap-southeast-1.amazonaws.com/' + process.env['AWS_S3_LOGISTIC_BUCKET_NAME'] + '/' + s3_file_name;
			var s3stream = stream.pipe(s3_upload(s3_file_name));
			s3stream.on('finish', () => {
				cb(err,templateUrl);
			});
			
		}
	});
}
// Helper to parse order and generate pdf
function parseOrder(object,done) {
	var data = {};
	data.partner = object.partner_name;
	data.awb = object.waybill;
	data.invoice_id = object.orders[0];
	data.routing_code = object.order_ids[0];
	data.product_desc = object.product_desc;
	data.cod_amount = object.cod_amount;
	data.payment_mode = (object.is_cod) ? "code" : "prepaid";
	data.declaration = object.declaration;
	data.fromAddress = {
		name : object.from_name,
		address : object.from_add,
		city : object.from_city,
		state : object.from_state,
		pin : object.from_pin,
		number : object.from_phone,
		email : 'None'
	}
	data.toAddress = {
		name : object.to_name,
		address : object.to_add,
		city : object.to_city,
		state : object.to_state,
		pin : object.to_pin,
		number : object.to_phone,
		email : 'None'
	}
	const result = renderLabelTemplate(data);
	generatePDF('label', data, result,function(err,url) {
		done(err,url);
	});
};

exports.generatePdf = generate;
