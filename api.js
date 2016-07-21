var express = require('express');
var app = express();
var angarum = require('./index.js');

app.get('/:name/:awb', function (req, res) {
    var partner = angarum.Partner(req.params.name);
    var track = new angarum.TrackingStatus({"awb_number": req.params.awb});
    partner.tracking_status(track, function(resp, body) {
	res.send(body.get());
    });
});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
