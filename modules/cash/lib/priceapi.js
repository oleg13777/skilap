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
		function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
		function get(cb) {
			self._cash_prices_stat.find({}, safe.trap_sure(cb, function (cursor) {
				cursor.each(safe.trap_sure(cb, function (stat) {
					if (stat == null) return cb();
					res[stat.key] = stat.last;
				}));
			}));
		}], safe.sure(cb, function (results) {
			cb(null, res);
		})
	);
};

module.exports.getPricesByPair = function (token,pair,cb) {
	var self = this;	
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
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
		function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
		function get(cb) {
			self._cash_prices.findOne({'_id': new self._ctx.ObjectID(id)}, cb);
		}], safe.sure(cb, function (results) {
			cb(null, results[1]);
		})
	);
};

module.exports.savePrice = function (token,price,cb) {
	var self = this;
	var bAdd = false;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
		function (cb) {
			price.date = new Date(new Date(price.date).getTime() - (new Date()).getTimezoneOffset()*60*1000);
			price.value = parseFloat(price.value);
			if (price._id && price._id != 0) {
				self._cash_prices.findOne({'_id': new self._ctx.ObjectID(price._id)},safe.sure_result(cb, function (price_) {
					_.defaults(price,price_);
					price._id = price_._id;
				}));		
			} else {
				price._id = new self._ctx.ObjectID();
				bAdd = true;
				cb();
			}
		}, 
		function (cb) {
			self._cash_prices.save(price, cb);
		}], safe.sure(cb, function () {
			if (bAdd)
				self._calcPriceStatsAdd([price], function () { cb(null, price); });
			else
				self._calcPriceStatsPartial(price.cmdty, price.currency, function () { cb(null, price); });
		})
	);
};

module.exports.clearPrices = function (token, ids, cb) {
	var self = this;
	var objs = [];
	async.series ([
	   function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
	   function (cb) {
		   if (ids)
			   self._cash_prices.find({'_id': {$in: _.map(ids, function(id) { return new self._ctx.ObjectID(id); })}}, {fields: {cmdty: 1, currency: 1}}).toArray(safe.sure_result(cb, function(vals) {
				   _.each(vals, function (val) {
					  objs[val.cmdty.space+val.cmdty.id+val.currency.space+val.currency.id] = val; 
				   });
			   }));
		   else
			   cb();
	   },
	   function (cb) {
		   if (ids == null)
			   self._cash_prices.remove(cb);
		   else
			   self._cash_prices.remove({'_id': {$in: _.map(ids, function(id) { return new self._ctx.ObjectID(id); })}}, cb);
	   } 
   ], safe.sure(cb, function () {
	   if (ids == null)
		   self._calcPriceStatsPartial(null, null, function() {cb();});
	   else {
		   async.eachSeries(_.values(objs), function (obj, cb) {
			   self._calcPriceStatsPartial(obj.cmdty, obj.currency, cb);
		   }, function() {cb();});
	   }
   }));
};

module.exports.importPrices = function  (token, prices, cb) {
	var self = this;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
		function (cb) { self._cash_prices.insert(prices, cb); } 
	], safe.sure_result(cb, function () {
	}));
};
