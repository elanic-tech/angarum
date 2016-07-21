var Class = require('class.extend');
var _ = require('lodash');

module.exports = Class.extend('Schema', {
    init: function(obj) {
	this._obj = obj;
    },
    
    map: function(omits, mapping, func) {
	omits = omits || [];
	mapping = mapping || {};
	this._obj = _.omit(this._obj, omits);
	this.map_key(mapping, func);
    },

    out_map: function(mapping, func) {
	if (mapping)
	    this._outmap = mapping;
	if (func)
	    this._outfunc = func;
    },

    map_key: function(mapping, func) {
	for(item in mapping) {
	    if (this._obj.hasOwnProperty(item)) {
		var val = mapping[item];
		if (val && Array == val.constructor)
		    for (var i in val) {
			this._obj[val[i]] = this._obj[item];
		    }
		else
		    this._obj[val] = this._obj[item];
		delete this._obj[item];
	    }
	}
	if (func) {
	    this.set(func(this.get()));
	}
    },

    get_config: function() {
	return {};
    },

    get_out_config: function() {
	return {};
    },

    output: function(out) {
	if (this._outfunc)
	    out = this._outfunc(out);
	this.set(_.extend(this.get_out_config(), out));
	this.map([], this._outmap);
    },
    
    get: function() {
	return this._obj;
    },

    set: function(obj) {
	this._obj = obj;
    },

    add: function(key, value) {
	this._obj[key] = value;
    },
});
