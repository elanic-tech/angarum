module.exports.Order = require('./Schemas/order_schema.js');
module.exports.Track = require('./Schemas/track_schema.js');
module.exports.Cancel = require('./Schemas/cancel_schema.js');
module.exports.Warehouse = require('./Schemas/warehouse_schema.js');
module.exports.TrackingStatus = require('./Schemas/tracking_status_schema.js');
module.exports.pdf = require('./utils/pdf');


var partners = {
    'pickrr': require('./Partners/pickrr.js'),
    'pyck': require('./Partners/pyck.js'),
    'pigeon': require('./Partners/pigeon.js'),
    'delhivery': require('./Partners/delhivery.js'),
    'nuvoex': require('./Partners/nuvoex.js'),
    'shadowfax': require('./Partners/shadowfax.js'),
    'xpressbees': require('./Partners/xpressbees.js'),
    'fedex': require('./Partners/fedex.js'),
    'ecomexpress': require('./Partners/ecomexpress.js'),
    'ecom express': require('./Partners/ecomexpress'),
    'rapid': require('./Partners/rapid.js'),
    'dotzot': require('./Partners/dotzot'),
    'hipship':require('./Partners/hipship'),
};

//helper methods

module.exports.Partner = function(partner) {
    if (partner.toLowerCase() in partners)
	return new partners[partner.toLowerCase()]();
    else
	throw Error("Partner: " + partner + " not found");
}
