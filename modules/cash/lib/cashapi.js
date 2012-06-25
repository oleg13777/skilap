/**
 * Core API
 */
var _ = require('underscore');
var alfred = require('alfred');
var async = require('async');
var events = require("events");

function CashApi (ctx) {
	var self = this;
	this._ctx = ctx;
	this._cash_accounts = null;
	this._cash_transactions = null;
	this._cash_prices = null;
	this._dataReady = false;
	this._dataInCalc = false;
	this._lastAccess = new Date();
	this._stats = {};
	this._waitQueue = [];
	this._coreapi;
	
	// set index cleanup 
	setInterval(function () {
		if (self._dataReady==false) return; // already sleep
		var d = new Date();
		if ((d.valueOf()-self._lastAccess.valueOf())>60*1000) {
			self._stats = {};
			console.log("dataCleared");
			self._dataInCalc = self._dataReady = false;
		}
	}, 60*1000);
}

CashApi.prototype.getAccount = require('./accapi.js').getAccount;
CashApi.prototype.getAllAccounts = require('./accapi.js').getAllAccounts;
CashApi.prototype.getChildAccounts = require('./accapi.js').getChildAccounts;
CashApi.prototype.getAccountByPath = require('./accapi.js').getAccountByPath;
CashApi.prototype.getAccountInfo = require('./accapi.js').getAccountInfo;
CashApi.prototype.deleteAccount = require('./accapi.js').deleteAccount;
CashApi.prototype.importAccounts = require('./accapi.js').importAccounts;
CashApi.prototype.clearAccounts = require('./accapi.js').clearAccounts;
CashApi.prototype.newRegistry = require('./accapi.js').restoreToDefaults;
CashApi.prototype.getAssetsTypes = require('./accapi.js').getAssetsTypes;
CashApi.prototype.getDefaultAccounts = require('./accapi.js').getDefaultAccounts;
CashApi.prototype.saveAccount = require('./accapi.js').saveAccount;
CashApi.prototype.getSpecialAccount = require('./accapi.js').getSpecialAccount;
CashApi.prototype.getAllCurrencies = require('./accapi.js').getAllCurrencies;
CashApi.prototype.importPrices = require('./priceapi.js').importPrices;
CashApi.prototype.clearPrices = require('./priceapi.js').clearPrices;
CashApi.prototype.getCmdtyPrice = require('./priceapi.js').getCmdtyPrice;
CashApi.prototype.getPricesByPair = require('./priceapi.js').getPricesByPair;
CashApi.prototype.savePrice = require('./priceapi.js').savePrice;
CashApi.prototype.parseGnuCashXml = require('./gnucash.js');
CashApi.prototype.getAccountRegister = require('./trnapi.js').getAccountRegister;
CashApi.prototype.getTransaction = require('./trnapi.js').getTransaction;
CashApi.prototype.saveTransaction = require('./trnapi.js').saveTransaction;
CashApi.prototype.importTransactions = require('./trnapi.js').importTransactions;
CashApi.prototype.clearTransactions = require('./trnapi.js').clearTransactions;
CashApi.prototype.getTransactionsInDateRange = require('./trnapi.js').getTransactionInDateRange;
CashApi.prototype.parseRaw = require('./export.js').import;
CashApi.prototype.exportRaw = require('./export.js').export;

CashApi.prototype._waitForData = function (cb) {
	this._lastAccess = new Date();
	if (this._dataReady) return cb(null)
		else this._waitQueue.push(cb);
	if (!this._dataInCalc) {
		this._calcStats(function () {});
	}
}

CashApi.prototype._lockData = function (cb) {
	if (!this._dataReady)
		return cb(new Error("Can't lock unready data"))
	this._dataInCalc = true;
	this._dataReady = false;
	return cb();
}

CashApi.prototype._unLockData = function (cb) {
	if (!this._dataInCalc) {
		this._calcStats(function () {});
	}
	return cb();
}

CashApi.prototype._loadData = function (cb) {
	var self = this;
	var adb;
	async.series([
		function openDb(cb) {
			self._ctx.getDB(function (err, _adb) {
				if (err) return cb(err);
				adb = _adb;
				cb();
			})
		},
		function openCollections(cb) {
			async.parallel([
				function accounts (cb) {
					console.log("open collections")						
					adb.ensure("cash_accounts",{type:'cached_key_map',buffered:false},cb);
				},
				function transactions (cb) {
					adb.ensure("cash_transactions",{type:'cached_key_map',buffered:false},cb);
				},
				function prices (cb) {
					adb.ensure("cash_prices",{type:'cached_key_map',buffered:false},cb);
				}
			], function (err, results) {
				if (err) return cb(err)
				self._cash_accounts = cash_accounts = results[0];
				self._cash_transactions = cash_transactions = results[1];
				self._cash_prices = cash_prices = results[2];
				cb();
			})
		}, 
		function ensureIndexes(cb) {
			async.parallel([
				function (cb) {
					self._cash_accounts.addIndex("parentId",function (acc) { return acc.parentId; }, cb);
				},
				function (cb) {
					self._cash_transactions.addIndex("datePosted",function (trn) { return (new Date(trn.datePosted)).valueOf(); }, cb);
				}
			], cb)
		}
	],cb)
}; 

CashApi.prototype.init = function (cb) {
	var self = this;
	async.parallel([
		function (cb) {
			self._ctx.getModule("core",function (err, module) {
				if (err) return cb1(err);
				self._coreapi = module.api;
				cb();
			})
		},
		function (cb) {
			self._loadData(cb)
		}], 
	cb);
}

var assetInfo = {
	"BANK":{act:1},
	"CASH":{act:1},
	"ASSET":{act:1},
	"CREDIT":{act:1},
	"LIABILITY":{act:-1},
	"STOCK":{act:1},
	"MUTUAL":{act:1},
	"CURENCY":{act:1},
	"INCOME":{act:-1},
	"EXPENSE":{act:1},
	"EQUITY":{act:1},
	"RECIEVABLE":{act:-1},
	"PAYABLE":{act:1}
}

CashApi.prototype.getAssetInfo = function (token, asset, cb) {
	var info = assetInfo[asset];
	if (info==null)
		return cb(new Error("Invalid asset type"));
	cb(null,info);
}

CashApi.prototype._calcStats = function _calcStats(cb) {
	var self = this;
	// helper functions
	function getAccStats (accId) {
		if (self._stats[accId]==null)
			self._stats[accId] = {id:accId, value:0, count:0, trDateIndex:[], type: "BANK"};
		return self._stats[accId];
	}
	function getAccPath (acc, cb) {
		if (acc.id!=acc.parentId && acc.parentId!=0) {
			self._cash_accounts.get(acc.parentId, function(err, parentAcc) {
				if (parentAcc==null) {
					cb("");
				} else {
					getAccPath(parentAcc, function (path) {
						cb(path + "::"+acc.name);
					});
				}
			});
		}
		else {
			cb(acc.name);
		} 
	}	
	
	console.time("Stats");
	self._dataReady = false;
	self._dataInCalc = true;
	self._stats = {};
	
	async.auto({
		price_tree: function (cb1) {
			self._stats.priceTree = {};
			cash_prices.scan(function(err, k, price) {
				if (err) return cb1(err);
				if (k==null) { 
					return cb1();
				}
				var date = new Date(price.date);
				var year = date.getFullYear();
				var month = date.getMonth();
				var dirs = [ 
					{rate:price.value,key:JSON.stringify({from:price.cmdty,to:price.currency})},
					{rate:1/price.value,key:JSON.stringify({from:price.currency,to:price.cmdty})}];
				_(dirs).forEach(function (dir) {
					var dirTree = self._stats.priceTree[dir.key];
					if (dirTree==null) self._stats.priceTree[dir.key]=dirTree={};
					var yearTree = dirTree[year];
					if (yearTree==null) dirTree[year]=yearTree={};
					var monthArray = yearTree[month];
					if (monthArray==null) yearTree[month]=monthArray=[];
					monthArray.push({date:date,rate:dir.rate});
					if (dirTree.average==null) {
						dirTree.average=dir.rate;
						dirTree.max=dir.rate;
						dirTree.min=dir.rate;
						dirTree.last = dir.rate;
						dirTree.lastDate = date;
						dirTree.quotes=1;
					}
					else {
						dirTree.average=dirTree.average*dirTree.quotes+dir.rate;
						dirTree.quotes++;
						dirTree.average/=dirTree.quotes;
					}
					if (dir.rate>dirTree.max)
						dirTree.max = dir.rate;
					if (dir.rate<dirTree.min)
						dirTree.min = dir.rate;
					if (date>dirTree.lastDate)
						dirTree.last = dir.rate;
				})
			}, true)
		},
		account_paths: function (cb1) {
			var next = this;
			var c=1;
			self._cash_accounts.scan(function(err, k, acc) {
				if (err) return cb1(err);
				if (k!=null) {
					c++;
					getAccPath(acc, function (path) { 
						getAccStats(acc.id).path = path;
						getAccStats(acc.id).type = acc.type;
						if (--c==0) cb1();
					});
				} else if (--c==0) cb1();
			}, true)
		},
		transaction_stats: ['account_paths',function (cb1) {
			console.time("Test");
			var next = this;
			self._cash_transactions.scan(function (err, k, tr) {
				if (err) return cb1(err);
				if (k==null) return cb1();
				tr.splits.forEach(function(split) {
					var accStats = getAccStats(split.accountId);
					var act = assetInfo[accStats.type].act;								
					accStats.value+=split.quantity*act;
					accStats.count++;
					accStats.trDateIndex.push({id:tr.id,date:(new Date(tr.dateEntered))});
				});
			},true)
		}],
		build_register:['transaction_stats', function (cb1) {
			console.timeEnd("Test");
			var next = this;
			async.forEach (_.keys(self._stats), function (accId, cb2) {
				var accStats = self._stats[accId];
				if (_.isUndefined(accStats.type))
					return cb2(); // not an account stats
				// sort by date
				accStats.trDateIndex = _.sortBy(accStats.trDateIndex,function (e) { return e.date.valueOf(); });
				var ballance = 0;
				var act = assetInfo[accStats.type].act;
				async.forEachSeries(accStats.trDateIndex, function (trs,cb3) {
					self._cash_transactions.get(trs.id, function (err, tr) {
						var recv = [];
						var send = null;
						tr.splits.forEach(function(split) {
							if (split.accountId == accId)
								send = split;
							else
								recv.push(split);
						})
						trs.recv = recv; trs.send = send;
						ballance += send.quantity*act;
						trs.ballance = ballance;
						process.nextTick(cb3);
					});
				},cb2
				);
			},cb1)
		}]},
		function done (err) {
			console.timeEnd("Stats");
			if (err) console.log(err);
			self._dataReady=true;
			self._dataInCalc=false;
			self._pumpWaitQueue();
			cb();
		}
	);
}

CashApi.prototype._pumpWaitQueue = function () {
	var self = this;
	// peek the first worker
	if (self._dataReady && self._waitQueue.length) {
		var wcb = self._waitQueue.shift();
		wcb(null);
	}
	// if we not get locked by first worker and still something in queue do it
	if (self._dataReady && self._waitQueue.length) {
		process.nextTick(function () {
			self._pumpWaitQueue()
		})
	}
}

module.exports.init = function (ctx,cb) {
	var api = new CashApi(ctx);
	api.init(function (err) {
		if (err) return cb(err);
		cb(null, api);
	})
}
