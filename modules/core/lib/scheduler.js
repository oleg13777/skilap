var cronJob = require('cron').CronJob;
var cronParser = require('later').cronParser;
var cronLater = require('later').later;
var _ = require('underscore');
var async = require('async');
var safe = require('safe');
safe.get = require("pok_utils").safeGet;
var ApiError = require("pok_utils").ApiError;
safe.get = require("pok_utils").safeGet;
var prefixify = require("pok_utils").prefixify;
var moment = require("moment");
var deepExtend = require('deep-extend');
var request = require('request');

/**
 * Private helper class to store context
 * @ignore
 */
function SchedulerApi(ctx) {
	this._ctx = ctx;
	this._sessions = {};
	this._api = {};
}

SchedulerApi.prototype.init = function (cb) {
	var self = this;
	self._api.core = self._ctx.getModuleSync('core').api;
	self._api.cash = self._ctx.getModuleSync('cash').api;

	self.rate = new cronJob('0 * * * * *', function() {
//	self.rate = new cronJob('0 0 * * * *', function() {
		process.nextTick(function () {
			try {
				self.exchangeRate();
			} catch (e) {
				console.log(e);
			}
		});
	});
	self._api.cash._cash_settings.findOne({'id': "checkRate"}, safe.sure_result(cb, function (v) {
		if (v && v.v)
			self.rate.start();
	}));

//	self.rate.start();
//	self.exchangeRate();

};

SchedulerApi.prototype.startExchangeRate = function () {
	this.rate.start();
};

SchedulerApi.prototype.stopExchangeRate = function () {
	this.rate.stop();
};

SchedulerApi.prototype.exchangeRate = function () {
	var	self = this,
		col = null,
		curency = {},
		pairs = []; 
	console.log("Start cron");

	async.waterfall([
   		function (cb) {
	        self._api.cash._cash_prices.find({}).toArray(safe.sure(cb, function (prices) {
	        	_.each(prices, function(price) {
	        		var key = price.cmdty.id.toString() + price.currency.id.toString();
	        		if (pairs[key] && pairs[key].date > price.date)
	        			return;
	        		pairs[key] = 
	        		{
	        			'cmdty': price.cmdty,
	        			'currency': price.currency,
	        			'date': price.date
	        			};
	        	});
	        	cb(null, pairs);
	        }));
		},
		function (pair, cb) {
			console.log('Do check rates with currencies: ' + _.keys(pairs));
			async.forEachLimit(_.keys(pairs), 20, function (e, cb1) {
				request('http://download.finance.yahoo.com/d/quotes.csv?s='+e+'=X&f=sl1d1t1ba&e=.csv', safe.trap_sure(cb1, function (response,body) {
					if (response.statusCode == 200 && body) {
						var arr = body.trim().split(",");
						if (parseFloat(arr[1]) && arr[2] && moment.utc(arr[2]).format("YYYY/MM/DD")) {
							curency["date"] = moment.utc(arr[2]).format("YYYY/MM/DD");
							curency[e] = parseFloat(arr[1]);
						}
					}
					cb1();
				}));
			}, cb);
		},
		function (cb) {
			curency = prefixify(curency);
			var cdate = new Date(curency.date);
			_.each(_.keys(pairs), function(pair) {
				if (cdate - pairs[pair].date < 1000*60*60*24)
					return;
				var price = {
					'_id': new self._ctx.ObjectID(),
					'cmdty': pairs[pair].cmdty,
					'currency': pairs[pair].currency,
					'date': cdate,
					'source': 'yahoo',
					'value': curency[pair]
				};
				self._api.cash._cash_prices.save(price, function() {} );
			});
			cb();
		}
	], function (err) {
		if (err)
			console.log(err);
		else
			console.log('Done exchange rate import.');
	});
};

/**
 * Internal init function
 * @ignore
 */
module.exports.init = function (ctx, cb) {
	var api = new SchedulerApi(ctx);
	var m = {api:api};

	m.getPermissionsList = function (token, cb) {
		cb(null,[]);
	};

	m.getModuleInfo = function (token, cb) {
		var i = {};
		i.name = ctx.i18n(token, 'scheduler', 'scheduler module');
		i.desc = ctx.i18n(token, 'scheduler', 'Schedulers module. Provides scheduler functionality');
		i.url = '/scheduler/';
		i.id = 'scheduler';
		cb(null, i);
	};

	m.init2 = function (cb) {
		api.init(cb)
	};

	cb(null, m);
};
