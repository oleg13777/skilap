var async = require('async');
var safe = require('safe');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;

module.exports.getSettings = function(token, id, defs, cb) {
	var self = this;
	self._coreapi.checkPerm(token, ['cash.view'], safe.sure(cb, function () {
		self._cash_settings.findOne({'id': id}, safe.sure(cb, function (v) {
			if (!v)
				cb(null,defs)
			else
				cb(null, v.v)
		}))
	}))
};

module.exports.saveSettings = function(token, id, settings, cb) {	
	var self = this;
	self._coreapi.checkPerm(token, ['cash.edit'], safe.sure(cb, function () {
		self._cash_settings.update({'id':id},{$set:{v:settings}},{upsert:true}, safe.sure(cb, function () {
			if (id == 'checkRate') {
				if (settings)
					self.startExchangeRate();
				else
					self.stopExchangeRate();
			}
			cb();
		}))
	}))
};

module.exports.clearSettings = function (token, ids, cb) {
	var self = this;
	async.series ([
	   			function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
	   			function (cb) {	
	   				if (ids == null)
	   					self._cash_settings.remove(cb);
	   				else
	   					self._cash_settings.remove({'_id': {$in: _.map(ids, function(id) { return new self._ctx.ObjectID(id); })}}, cb);
	   			}
	   		], safe.sure_result(cb, function () {
	   		}));
};

module.exports.importSettings = function  (token, settings, cb) {
	var self = this;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
		function (cb) {
			async.forEach(settings, function (e, cb) {
				self._cash_settings.update({'id':e.id},{$set:{v:e.v}},{upsert:true},cb)
			},cb);
		}, 
	], safe.sure_result(cb, function () {
	}));
};
