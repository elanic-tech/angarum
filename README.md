This Library attempts to unify the API of different delivery providers in India.

##Installation
npm install angarum

##Instructions

To add a new partner, use

`./generate partner_name`

To generate a new partner as partner_name.js . Preferably use lower case letters and underscore.

##Usage
```javascript
var ang = require("angarum");

//To access a partner (case insensitive), we use:
var partner = ang.Partner("delhivery");

//To Create a new order, we use:
var newOrder = new ang.Order({}); //Checkout Schemas/order_schema.js for information on what to pass to ang.Order.
partner.order(newOrder, function(res, body) {
    console.log(res); //Network response object
    console.log(body); // Checkout Schemas/order_schema.js for output json object
})

//Similarly, for tracking url, tracking status and cancellation respectively,
var track = new a.Track();
var tracking_status = new a.TrackingStatus({"awb_number" : "some_awb_no:"});
var cancel = new a.Cancel({});
partner.track(track, (res, body) => {console.log(res, body);});
partner.tracking_status(tracking_status, (res, body) => {console.log(res, body);});
partner.cancel(cancel, (res, body) => {console.log(res, body);});

//See their schemas inside Schemas/ for more information