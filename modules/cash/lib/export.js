var async = require('async');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;
var fs = require('fs');
var zlib = require('zlib');

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
				if (k==null) return process.nextTick(cb);
				res.transactions.push(v);
			},true);
		},
		function getAccounts(cb) {
			self._cash_accounts.scan(function(err, k, v) {
				if (err) cb(err);
				if (k==null) return process.nextTick(cb);
				res.accounts.push(v);
			},true);
		},
		function getPrices(cb) {
			self._cash_prices.scan(function(err, k, v) {
				if (err) cb(err);
				if (k==null) return process.nextTick(cb);
				res.prices.push(v);
			},true);
		}], function end(err, results) {
			if (err) return cb(err);
			cb(null, res);
		}
	)
}

module.exports.import = function (fileName, callback){
	var self = this;
	var aidMap={};
	var transactions = null;
	var accounts = null;
	var prices = null;
	async.waterfall([
		function readFile(cb) {
			fs.readFile(fileName, cb);
		},
		function gnuzipFile(buffer, cb) {
			if (buffer[0] == 31 && buffer[1] == 139 && buffer[2] == 8)
				zlib.gunzip(buffer,cb)
			else 
				cb(null, buffer)
		},
		function parse(plain, cb) {
			var data = JSON.parse(plain);
			transactions = data.transactions;
			accounts = data.accounts;
			prices = data.prices;
			cb()
		},
		function transpondAccounts(cb) {
			async.forEachSeries(accounts, function (acc,cb) {
				self._ctx.getUniqueId(function (err, id) {
					if (err) return cb(err);
					aidMap[acc.id]=id;
					acc.id = id;
					cb();
				})
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
					self._ctx.getUniqueId(function (err, id) {
						if (err) return cb(err);
						split.id = id;
						cb();
					})
				}, function (err) {
					if (err) return cb(err);
					self._ctx.getUniqueId(function (err, id) {
						if (err) return cb(err);
						trn.id = id;
						cb();
					})
				})
			},cb)
		},
		function transpondPrices(cb) {
			async.forEachSeries(prices, function (price,cb) {
				self._ctx.getUniqueId(function (err, id) {
					if (err) return cb(err);
					price.id = id;
					cb();
				})
			},cb)
		},
	], function (err) {
		if (err) return cb(err);
		var ret = {tr:transactions, acc:accounts, prices:prices};
		process.nextTick(function(){
			callback(null,ret);
		});
	})
}
