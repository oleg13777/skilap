var async = require('async');
var safe = require('safe');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;

module.exports.getCmdtyPrice = function (token,cmdty,currency,date,method,cb) {
	var self = this;
	if (_(cmdty).isEqual(currency)) return cb(null,1);
	// not sure what template means
	if (cmdty._id=='template') return cb(null,1);
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
				function (cb) { self._waitForData(cb); }
			],cb);
		}, 
		function get(cb) {
			var key = (cmdty.space+cmdty._id+currency.space+currency._id);			
			//console.log(key);
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
	);
};

module.exports.getPricesByPair = function (token,pair,cb) {
	var self = this;	
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
				function (cb) { self._waitForData(cb); }
			], cb);
		}, 
		function get(cb) {
			self._cash_prices.find({'cmdty._id': pair.from, 'currency._id': pair.to}).sort({'date': -1}).toArray(cb);
			/*
			var prices = [];
			self._cash_prices.scan(function (err, key, price) {
				if (err) cb(err);
				if (key) { 
					if (price.cmdty._id == pair.from && price.currency._id == pair.to){
						prices.push(price);							
					}
				}
				else {
					prices = _.sortBy(prices, function(price){ return -new Date(price.date).valueOf() });
					cb(null, prices);
				}
			}, true);
			*/
		}], safe.sure(cb, function (results) {
			process.nextTick( function () {
				cb(null, results[1]);
			});
		})
	);
};

module.exports.savePrice = function (token,price,cb) {
	var self = this;
	var pricen = {};	
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
				function (cb) { self._waitForData(cb); }
			],cb);
		}, 
		function (cb) {					
			if (price._id) {
				self._cash_transactions.findOne({'_id': new self._ctx.ObjectID(price._id)},safe.sure_result(cb, function (price_) {
					pricen = _.extend(price,price_);
				}));		
			} else {
				self._ctx.getUniqueId(safe.sure_result(cb,function (id) {
					pricen = price;					
					pricen._id = id;
				}));
			}
		}, 
		function (cb) {			
			self._cash_prices.save(pricen, cb);			
		}], safe.sure(cb, function () {			
			self._calcStats(function () {});
			cb(null,pricen);
		})
	);
};

module.exports.clearPrices = function (token, ids, cb) {
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
				self._cash_prices.remove(cb);
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
				self._cash_prices.remove({'_id': {$in: ids}}, cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {});
		}));
	}
};

module.exports.importPrices = function  (token, prices, cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
				function (cb) { self._waitForData(cb); }
			],cb);
		},
		function (cb) {
			async.forEach(prices, function (e, cb) {
				self._cash_prices.save(e, cb);
			},cb);
		}, 
	], safe.sure_result(cb, function () {
		self._calcStats(function () {});
	}));
};
