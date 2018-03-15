var Class = require('class.extend');
var http = require('http');
var querystring = require('querystring');
var request = require('request');
var _ = require('lodash');

var headers =  {
//    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
//    "Accept-Language": "en-US,en;q=0.8",
//    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.102 Safari/537.36"
};

var handle = function(cb, params) {
    error = function(err) {
	console.log("Error");
	console.log(err);
    };
    cb = cb || function(res, body) {
	console.log(body);
    };
    return function (err, res, body) {
	if (!err) {
	    try {
		params.output(body)
	    } catch (e) {
		params.set({
		    success: false,
		    err: body
		});
	    }
	}
	else
	    params.set({
		success: false,
		err: err
	    });
	return cb(res, params);
    }
};

var Template = Class.extend('Template', {
    init: function (host) {
	this.host = host;
    },

    order: function (params) {
	
    },

    track: function () {
	
    },

    cancel: function () {
	
    },

    get_tracking_url: function() {
	
    },

    get_req: function(path, params, cb, args) {
	args = args || {};
	url = this.host + path + "?" + querystring.stringify(params.get());
	return request(_.extend({
	    url: url,
	    headers: headers,
	    method: 'GET',
	}, args), handle(cb, params));
    },

    post_req: function (path, params, cb, args) {
	var _host = this.host, heads = {};
	args = args || {};
	if (args.headers) {
	    heads = args.headers;
	    delete args['headers'];
	}
	
	return request(_.extend({
	    url: _host + path,
	    body: params.get(),
	    json: true,
	    method: 'POST',
	    headers: _.extend(heads, headers),
	}, args), handle(cb, params));
    },

    multiple_tracking_status: function(params, cb) {
	var ct = 0;
	var awb = params.get().awb_number;
	var responses = [];
	var l = awb.length;
	for (ind in awb) {
	    var new_params = _.cloneDeep(params);
	    new_params.set({
		"awb_number": awb[ind]
	    });
	    this.single_tracking_status(new_params, function(res, body) {
		responses.push(body.get());
		if (++ct == l) {
		    body.set(responses);
		    return cb(res, body);
		}
	    });
	}
	return;
    },

    single_tracking_status: function(params, cb) {
	
    },

    tracking_status: function(params, cb) {
	var awb = params.get().awb_number;
	if (_.get(awb, "constructor") == Array)
	    return this.multiple_tracking_status(params, cb);
	return this.single_tracking_status(params, cb);
    }
});

module.exports = Template;
