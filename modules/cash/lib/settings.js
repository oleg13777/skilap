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
		self._cash_settings.update({'id':id},{$set:{v:settings}},{upsert:true}, cb)
	}))
};

module.exports.clearSettings = function (token, ids, cb) {
	console.log("clearSettings", arguments);
	
	var self = this;
	if (ids == null) {
		async.series ([
			function (cb) {
				async.parallel([
					function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
					function (cb) { self._waitForData(cb); }
				],cb);
			},
			function (cb) {
				self._cash_settings.remove(cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {});
		}));
	} else {
		async.series ([
			function (cb) {
				async.parallel([
					function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
					function (cb) { self._waitForData(cb); }
				],cb);
			},
			function(cb){
				self._cash_settings.remove(_.map(ids, function(id) { return new self._ctx.ObjectID(id); }),cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {});
		}));
	}
};

module.exports.importSettings = function  (token, settings, cb) {
	console.log("importSettings", arguments);	
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
				function (cb) { self._waitForData(cb); }
			],cb);
		},
		function (cb) {
			async.forEach(settings, function (e, cb) {
				self._cash_settings.save(e, cb);
			},cb);
		}, 
	], safe.sure_result(cb, function () {
		self._calcStats(function () {});
	}));
};
