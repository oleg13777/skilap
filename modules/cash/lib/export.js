var async = require('async');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;

module.exports.export = function (token,cb) {
	var self = this;
	var res = {'skilap-cash':1,transactions:[],prices:[],accounts:[]}
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function getTransaction(cb) {
			self._cash_transactions.scan(function(err, k, v) {
				if (err) cb(err);
				if (k==null) process.nextTick(cb);
				res.transactions.push(v);
			},true);
		},
		function getAccounts(cb) {
			self._cash_accounts.scan(function(err, k, v) {
				if (err) cb(err);
				if (k==null) process.nextTick(cb);
				res.accounts.push(v);
			},true);
		},
		function getPrices(cb) {
			self._cash_prices.scan(function(err, k, v) {
				if (err) cb(err);
				if (k==null) process.nextTick(cb);
				res.prices.push(v);
			},true);
		}], function end(err, results) {
			if (err) return cb(err);
			cb(null, res);
		}
	)
}
