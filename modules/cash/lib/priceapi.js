var async = require('async');
var safe = require('safe');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;

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
			var key = (cmdty.space+cmdty.id+currency.space+currency.id);			
			var ptree = self._stats.priceTree[key];
			if (ptree==null) {
				if (method == "safe")
					return cb(null, 1);
				else
					return cb(new SkilapError("Unknown price pair","UnknownRate"));
			}
			cb(null,ptree.last);
		}], safe.sure(cb, function (results) {
			cb(null, results[1]);
		})
	)
}

module.exports.getPricesByPair = function (token,pair,cb) {
	var self = this;	
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function get(cb) {
			var prices = [];
			self._cash_prices.scan(function (err, key, price) {
				if (err) cb(err);
				if (key) { 
					if (price.cmdty.id == pair.from && price.currency.id == pair.to){
						prices.push(price);							
					}
				}
				else {
					prices = _.sortBy(prices, function(price){ return -new Date(price.date).valueOf() });
					cb(null, prices);
				}
			}, true);
		}], safe.sure(cb, function (results) {
			process.nextTick( function () {
				cb(null, results[1]);
			})
		})
	)
}

module.exports.savePrice = function (token,price,cb) {
	var self = this;
	var pricen = {};	
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function (cb) {					
			if (price.id) {
				self._cash_transactions.get(price.id,safe.sure_result(cb, function (price_) {
					pricen = _.extend(price,price_);
				}));		
			} else {
				self._ctx.getUniqueId(safe.sure_result(function (id) {
					pricen = price;					
					pricen.id = id;
				}));
			}
		}, 
		function (cb) {			
			self._cash_prices.put(pricen.id, pricen, cb);			
		}], safe.sure(cb, function () {			
			self._calcStats(function () {});
			cb(null,pricen);
		})
	);
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
					self._cash_prices.put(e,null,cb);
				},cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {})
		}));
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
	], self.sure_result(cb, function () {
		self._calcStats(function () {})
	}))
}
