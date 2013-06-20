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

module.exports.initScheduler = function (cb) {
	var self = this;

	self.scheduler_rate = new cronJob('0 0 * * * *', function() {
		process.nextTick(function () {
			try {
				self.exchangeRate();
			} catch (e) {
				console.log(e);
			}
		});
	});
	self._cash_settings.findOne({'id': "checkRate"}, safe.sure_result(cb, function (v) {
		if (v && v.v)
			self.scheduler_rate.start();
	}));
};

module.exports.startExchangeRate = function () {
	this.scheduler_rate.start();
};

module.exports.stopExchangeRate = function () {
	this.scheduler_rate.stop();
};

module.exports.exchangeRate = function () {
	var	self = this,
		col = null,
		curency = {},
		pairs = [], 
		prices = [];
	console.log("Start cron");

	async.waterfall([
   		function (cb) {
	        self._cash_accounts.distinct('cmdty', {}, cb);
		},
   		function (cmdtys, cb) {
			for (var i = 0; i<cmdtys.length; i++)
				for (var j = i+1; j<cmdtys.length; j++) {
	        		var key = cmdtys[i].id.toString() + cmdtys[j].id.toString();
	        		pairs[key] = {'cmdty': cmdtys[i], 'currency': cmdtys[j]} ;
	        		key = cmdtys[j].id.toString() + cmdtys[i].id.toString();
	        		pairs[key] = {'cmdty': cmdtys[j], 'currency': cmdtys[i]} ;
				}
			async.eachSeries(_.values(pairs), function(pair, cb) {
				self._cash_prices.findOne(pair, {sort: {date: -1}}, safe.sure_result(cb, function(price) {
	        		var key = pair.cmdty.id.toString() + pair.currency.id.toString();
	        		if (price)
	        			pairs[key].date = price.date;
	        		else
	        			pairs[key].date = new Date(0);
				}));
			}, cb);
		},
		function (cb) {
			console.log('Do check rates with currencies: ' + _.keys(pairs));
			async.forEach(_.keys(pairs), function (e, cb) {
				request('http://download.finance.yahoo.com/d/quotes.csv?s='+e+'=X&f=sl1d1t1ba&e=.csv', function (err, response, body) {
					if (response.statusCode == 200 && body) {
						var arr = body.trim().split(",");
						if (parseFloat(arr[1]) && arr[2] && moment.utc(arr[2]).format("YYYY/MM/DD")) {
							curency["date"] = moment.utc(arr[2]).format("YYYY/MM/DD");
							curency[e] = parseFloat(arr[1]);
						}
					}
					cb();
				});
			}, cb);
		},
		function (cb) {
			curency = prefixify(curency);
			var cdate = new Date(curency.date);
			_.each(_.keys(pairs), function(pair) {
				if (cdate - pairs[pair].date < 1000*60*60*24)
					return;
				prices.push({
					'_id': new self._ctx.ObjectID(),
					'cmdty': pairs[pair].cmdty,
					'currency': pairs[pair].currency,
					'date': cdate,
					'source': 'yahoo',
					'value': curency[pair]
				});
			});
			if (prices.length)
				self._cash_prices.insert(prices, {w:1}, cb);
		}
	], function (err) {
		if (err)
			console.log(err);
		else {
			self._calcPriceStatsAdd(prices, function() {});
			console.log('Done exchange rate import.');
		}
	});
};
