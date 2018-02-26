//require('dotenv').config();
a = require("./index.js");

partners = [
   "Pickrr",
   "Pyck",
   "Pigeon",
   "Delhivery",
   //"NuvoEx",
   "ShadowFax",
   //"XpressBees",
   "HipShip"
];

awbs = [
    ["2176623089901", "2176623089901"],
    "",
    ["UNIPINC358428", "UNIPINC358428"],
    ["988110029595", "988110029595"],
    ["ELC0000900", "ELC0000900"],
    ["P54010228"],
    ["110AP04007955"],
];

var test_order = {
   "cod_amount":0,
   "is_cod":false,
   "to_pin_code":"560067",
   "to_alternate_mobile_number":"",
   "to_mobile_number":"8787475673",
   "to_country":"India",
   "to_state":"Arunachal Pradesh",
   "to_city":"Itanagar",
   "to_address":"Chetum Dene Hostel Near Don Bosco College Jollang Itanagar Itanagar",
   "to_name":"Heri Roshna",
   "from_pin_code":"560068",
   "from_alternate_mobile_number":"",
   "from_mobile_number":"7005362766",
   "from_country":"India",
   "from_state":"Arunachal Pradesh",
   "from_city":"Itanagar",
   "from_address":"16Type 216 Polo Colony Naharlagun Naharlagun",
   "from_name":"Karnga Riba",
   "quantity":1,
   "item_name":"[632939] Lace Black Dress ",   
   "invoice_number":"632939",
   "tracks":[
      "5a9001a5f3e24202c29874f1"
   ],
   "orders":[
      632939
   ],
   "order_ids":[
      "5a9001a5f3e24202c29874f9"
   ]
}

queue = {};
function add(type) {    
    return function(res, body) {
	if (res)
	    body.add('response_code', res.statusCode);
	else
	    body.add('response_code', "Das lakh");
	queue[type] = body;
	if (Object.keys(queue).length == Object.keys(partners).length * 4)
	    print_results();
    };
};

function print_results() {
    console.log("Results:");
    var keys = Object.keys(queue);
    keys.sort();
    keys.forEach(function(elem) {
	console.log(elem);
	console.log(queue[elem].get());
    });
};

for (ind in partners) {
    var name = partners[ind];
    var partner = a.Partner(name);

    var order = new a.Order(test_order);
    partner.order(order, add(name + " place order"));

    var cancel = new a.Cancel();
    partner.cancel(cancel, add(name + " cancel order"));

    var track = new a.Track();    
    var tracking_status = new a.TrackingStatus({"awb_number" : awbs[ind]});    
    partner.track(track, add(name + " track order"));
    partner.tracking_status(tracking_status, add(name + " tracking status order"));
}


