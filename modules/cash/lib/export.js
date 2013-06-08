var async = require('async');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;
var fs = require('fs');
var zlib = require('zlib');
var safe = require('safe');
var utils = require("skilap-utils");

module.exports.export = function (token,cb) {
	var self = this;
	var res = {'skilap-cash':1,transactions:[],prices:[],accounts:[],settings:{}}
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
		function getTransaction(cb) {
			self._cash_transactions.find({}).toArray(safe.sure_result(cb, function(arr) {
				_.map(arr, function(trn) { return utils._wrapTypes(trn); });
				res.transactions = arr;
			}));
		},
		function getAccounts(cb) {
			self._cash_accounts.find({}).toArray(safe.sure_result(cb, function(arr) {
				res.accounts = arr;
			}));
		},
		function getPrices(cb) {
			self._cash_prices.find({}).toArray(safe.sure_result(cb, function(arr) {
				_.map(arr, function(price) { return utils._wrapTypes(price); });
				res.prices = arr;
			}));
		},
		function getSettings(cb) {
			self._cash_settings.find({}).toArray(safe.sure_result(cb, function(arr) {
				res.settings = arr;
			}));
		}], safe.sure(cb, function (results) {
			cb(null, res);
		})
	);
};

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
			cb();
		}),
		function transpondAccounts(cb) {
			async.forEachSeries(accounts, function (acc,cb) {
				var id = new self._ctx.ObjectID();
				aidMap[acc._id]=id;
				acc._id = id;
				process.nextTick(cb);
			},cb);
		},
		function transpondAccountsTree(cb) {
			_(accounts).forEach(function (acc) {
				if (acc.parentId)
					acc.parentId=aidMap[acc.parentId];
			});
			cb();
		},
		function transpondTransactions(cb) {
			async.forEachSeries(transactions, function (trn,cb) {
				trn = utils._unwrapTypes(trn);
				async.forEachSeries(trn.splits, function (split,cb) {
					split.accountId = aidMap[split.accountId];
					var id = new self._ctx.ObjectID();
					split._id = id;
					process.nextTick(cb);
				}, safe.sure(cb, function () {
					var id = new self._ctx.ObjectID();
					trn._id = id;
					process.nextTick(cb);
				}))
			},cb)
		},
		function transpondPrices(cb) {
			async.forEachSeries(prices, function (price,cb) {
				price = utils._unwrapTypes(price);
				var id = new self._ctx.ObjectID();
				price._id = id;
				process.nextTick(cb);
			},cb)
		},
		function transpondSettings(cb) {
			async.forEachSeries(settings, function (setting,cb) {
				setting._id = new self._ctx.ObjectID();
				process.nextTick(cb);
			},cb)
		}
	], safe.sure(cb, function () {
		var ret = {tr:transactions, acc:accounts, prices:prices,settings:settings};
		process.nextTick(function(){
			cb(null,ret);
		});
	}))
}
