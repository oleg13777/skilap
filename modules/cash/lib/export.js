var async = require('async');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;
var fs = require('fs');
var zlib = require('zlib');
var safe = require('safe');

module.exports.export = function (token,cb) {
	var self = this;
	var res = {'skilap-cash':1,transactions:[],prices:[],accounts:[],settings:{}}
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function getTransaction(cb) {
			self._cash_transactions.scan(safe.sure(cb, function(k, v) {
				if (k==null) return process.nextTick(cb);
				res.transactions.push(v);
			}),true);
		},
		function getAccounts(cb) {
			self._cash_accounts.scan(safe.sure(cb, function(k, v) {
				if (k==null) return process.nextTick(cb);
				res.accounts.push(v);
			}),true);
		},
		function getPrices(cb) {
			self._cash_prices.scan(safe.sure(cb, function(k, v) {
				if (k==null) return process.nextTick(cb);
				res.prices.push(v);
			}),true);
		},
		function getSettings(cb) {
			self._cash_settings.scan(safe.sure(cb, function(k, v) {
				if (k==null) return process.nextTick(cb);
				res.settings[k]=v;
			}),true);
		}], safe.sure(cb, function (results) {
			cb(null, res);
		})
	)
}

module.exports.import = function (fileName, cb){
	var self = this;
	var aidMap={};
	var transactions = null;
	var accounts = null;
	var prices = null;
	var settings = null;
	async.waterfall([
		function readFile(cb) {
			fs.readFile(fileName, cb);
		},
		safe.trap(function gnuzipFile(buffer, cb) {
			if (buffer[0] == 31 && buffer[1] == 139 && buffer[2] == 8)
				zlib.gunzip(buffer,cb)
			else 
				cb(null, buffer)
		}),
		safe.trap(function parse(plain, cb) {
			var data = JSON.parse(plain);
			transactions = data.transactions;
			accounts = data.accounts;
			prices = data.prices;
			settings = data.settings;
			cb()
		}),
		function transpondAccounts(cb) {
			async.forEachSeries(accounts, function (acc,cb) {
				self._ctx.getUniqueId(safe.sure(cb, function (id) {
					aidMap[acc._id]=id;
					acc._id = id;
					process.nextTick(cb);
				}))
			},cb)
		},
		function transpondAccountsTree(cb) {
			_(accounts).forEach(function (acc) {
				if (acc.parentId!=0)
					acc.parentId=aidMap[acc.parentId];
			})
			cb();
		},
		function transpondTransactions(cb) {
			async.forEachSeries(transactions, function (trn,cb) {
				async.forEachSeries(trn.splits, function (split,cb) {
					split.accountId = aidMap[split.accountId];
					self._ctx.getUniqueId(safe.sure(cb, function (id) {
						split._id = id;
						process.nextTick(cb);
					}))
				}, safe.sure(cb, function () {
					self._ctx.getUniqueId(safe.sure(cb, function (id) {
						trn._id = id;
						process.nextTick(cb);
					}))
				}))
			},cb)
		},
		function transpondPrices(cb) {
			async.forEachSeries(prices, function (price,cb) {
				self._ctx.getUniqueId(safe.sure(function (id) {
					price._id = id;
					process.nextTick(cb);
				}))
			},cb)
		},
	], safe.sure(cb, function () {
		var ret = {tr:transactions, acc:accounts, prices:prices,settings:settings};
		process.nextTick(function(){
			cb(null,ret);
		});
	}))
}
