require('dotenv').config();
a = require("./index.js");

partners = [
    "Pickrr",
    "Pyck",
    "Pigeon",
    "Delhivery",
    "NuvoEx",
];

awbs = [
    ["2176623089901", "2176623089901"],
    "",
    ["UNIPINC358428", "UNIPINC358428"],
    ["988110029595", "988110029595"],
    ["ELC0000900", "ELC0000900"]
];

var test_order = {
    to_city: "a new Delhi d",
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
    var order = new a.Order(test_order);
    var track = new a.Track();
    var cancel = new a.Cancel();
    var tracking_status = new a.TrackingStatus({"awb_number" : awbs[ind]});
    var partner = a.Partner(name);
    partner.order(order, add(name + " place order"));
    partner.cancel(cancel, add(name + " cancel order"));
    partner.track(track, add(name + " track order"));
    partner.tracking_status(tracking_status, add(name + " tracking status order"));
}
