var async = require('async');
var _ = require('underscore');

module.exports.getCmdtyPrice = function (token,cmdty,currency,date,method,cb) {
	var self = this;
	if (_(cmdty).isEqual(currency)) return cb(null,1);
	// not sure what template means
	if (cmdty.id=='template') return cb(null,1);
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function get(cb) {
			var key = JSON.stringify({from:cmdty,to:currency});
			var ptree = self._stats.priceTree[key];
			if (ptree==null) return cb(new Error("Unknown price pair"));
			cb(null,ptree.last);
		}], function end(err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
	)
}

module.exports.clearPrices = function (token, ids, cb) {
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
				self._cash_prices.clear(cb);
			} 
		], function (err) {
			if (err) return cb(err);
			self._calcStats(function () {})
			cb(null);
		});
	} else {
		cb(null);
	}
}

module.exports.importPrices = function  (token, prices, cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function (cb) {
			async.forEach(prices, function (e, cb) {
				self._cash_prices.put(e.id,e,cb);
			},cb);
		}, 
	], function (err) {
		if (err) return cb(err);
		self._calcStats(function () {})
		cb(null);
	})
}	
