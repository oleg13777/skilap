var async = require('async');
var safe = require('safe');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;

module.exports.getCmdtyPrice = function (token,cmdty,currency,date,method,cb) {
	var self = this;
	if (_(cmdty).isEqual(currency)) return cb(null,1);
	// not sure what template means
	if (cmdty.id=='template') return cb(null,1);
	self._coreapi.checkPerm(token,["cash.view"],safe.sure(cb, function () {
		// note currently we ignore method, just getting last price
		self._cash_prices.findOne({'cmdty.id': cmdty.id, 'currency.id': currency.id},{sort:{'date': -1}}, safe.sure(cb, function (price) {
			if (price==null) {
				if (method == "safe")
					return cb(null, 1);
				else
					return cb(new SkilapError("Unknown price pair","UnknownRate"));
			}
			cb(null,price.value);
		}))
	}))
};

module.exports.getCmdtyLastPrices = function (token,cb) {
	var self = this;
	var res = {};
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
				function (cb) { self._waitForData(cb); }
			],cb);
		}, 
		function get(cb) {
			_.each(self._stats.priceTree, function (v,k) {
				res[k]=v.last;
			})
			cb();
		}], safe.sure(cb, function (results) {
			cb(null, res);
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
			self._cash_prices.find({'cmdty.id': pair.from, 'currency.id': pair.to}).sort({'date': -1}).toArray(cb);
		}], safe.sure(cb, function (results) {
			process.nextTick( function () {
				cb(null, results[1]);
			});
		})
	);
};

module.exports.getPriceById = function (token,id,cb) {
	var self = this;	
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
				function (cb) { self._waitForData(cb); }
			], cb);
		}, 
		function get(cb) {
			self._cash_prices.findOne({'_id': new self._ctx.ObjectID(id)}, cb);
		}], safe.sure(cb, function (results) {
			cb(null, results[1]);
		})
	);
};

module.exports.savePrice = function (token,price,cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
				function (cb) { self._waitForData(cb); }
			],cb);
		}, 
		function (cb) {
			if (price._id && price._id != 0) {
				self._cash_prices.findOne({'_id': new self._ctx.ObjectID(price._id)},safe.sure_result(cb, function (price_) {
					_.defaults(price,price_);
					price._id = price_._id;
				}));		
			} else {
				price._id = new self._ctx.ObjectID();
				cb();
			}
		}, 
		function (cb) {
			self._cash_prices.save(price, cb);
		}], safe.sure(cb, function () {			
			self._calcStats(function () {});
			cb(null, price);
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
				self._cash_prices.remove({'_id': {$in: _.map(ids, function(id) { return new self._ctx.ObjectID(id); })}}, cb);
			} 
		], safe.sure_result(cb, function () {
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
	}));
};
