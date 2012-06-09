var async = require('async');
var _ = require('underscore');
var extend = require('node.extend');
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
			var key = JSON.stringify({from:cmdty,to:currency});			
			var ptree = self._stats.priceTree[key];
			if (ptree==null) return cb(new SkilapError("Unknown price pair","UnknownRate"));
			cb(null,ptree.last);
		}], function end(err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
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
					if (key){ 
						if(price.cmdty.id == pair.from && price.currency.id == pair.to){
							prices.push(price);							
						}
					}
					else cb(null, prices);
				},
			true);
		}], function end(err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
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
				self._cash_transactions.get(price.id,function (err, price_) {
					if (err) return cb(err);
					pricen = extend(price,price_);
					cb()
				});		
			} else {
				self._ctx.getUniqueId(function (err, id) {
					if (err) return cb(err);
					pricen = price;					
					pricen.id = id;
					cb()
				});
			}
		}, 
		function (cb) {			
			self._cash_prices.put(pricen.id, pricen, cb);			
		}], function (err){			
			if (err) return cb(err);
			self._calcStats(function () {});
			cb(null,pricen);
		}
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
		], function (err) {
			if (err) return cb(err);
			self._calcStats(function () {})
			cb(null);
		});
	} else {
		var prs = [];
		async.series ([
			function (cb1) {
				async.parallel([
					function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
					function (cb) { self._waitForData(cb) }
				],cb1);
			},
			function (cb1) {				
				async.forEach(ids,function(id,cb2){
					self._cash_prices.get(id,function (err, pr) {
						if (err) return cb2(err);
						prs.push(pr);				
						process.nextTick(cb2);
					});		
				},cb1);				
			},
			function(cb1){
				async.forEach(prs, function (e,cb2) {					
					self._cash_prices.put(e.id,null,cb2);
				},cb1);
			} 
		], function (err) {
			if (err) return cb(err);
			self._calcStats(function () {})
			cb(null);
		});
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
