var async = require('async');
var safe = require('safe');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;


module.exports.getSettings = function(token, id, defs, cb) {
	var self = this;

	async.series ([
		function (cb) {
			self._coreapi.checkPerm(token, ['cash.view'], cb);
		},
		function get(cb) {
			self._cash_settings.get(id, cb);
		}], function end(err, results) {
			if (err) return cb(err);
			var res = results[1];
			if (!res) res = defs;
			cb(null, res);
		}
	)
}

module.exports.saveSettings = function(token, id, settings, cb) {
	var self = this;
	async.waterfall ([
		function (cb) {
			self._coreapi.checkPerm(token, ['cash.edit'], cb);
		},
		function (cb) {
			self.getSettings(token, id, settings, cb)
		},
		function (old, cb) {
			var s = _.clone(old); 
			_.extend(s,settings);
			self._cash_settings.put(id, s, cb);
		}], 
		safe.sure(cb, function () {
			process.nextTick(cb)
		})
	)
}

module.exports.clearSettings = function (token, ids, cb) {
	var self = this;
	if (ids == null) {
		async.series ([
			function (cb) {
				async.parallel([
					function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
					function (cb) { self._waitForData(cb) }
				],cb);
			},
			function (cb) {
				self._cash_settings.clear(cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {})
		}));
	} else {
		async.series ([
			function (cb) {
				async.parallel([
					function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
					function (cb) { self._waitForData(cb) }
				],cb);
			},
			function(cb){
				async.forEach(ids, function (e,cb) {					
					self._cash_settings.put(e,null,cb);
				},cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {})
		}));
	}
}

module.exports.importSettings = function  (token, settings, cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function (cb) {
			async.forEach(_(settings).keys(), function (k, cb) {
				var v = settings[k];
				self._cash_settings.put(k,v,cb);
			},cb);
		}, 
	], safe.sure_result(cb, function () {
		self._calcStats(function () {})
	}))
}
