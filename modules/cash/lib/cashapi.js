/**
 * Core API
 */
var _ = require('underscore');
var async = require('async');
var events = require("events");
var safe = require('safe');

function CashApi (ctx) {
	var self = this;
	this._ctx = ctx;
	this._cash_accounts = null;
	this._cash_transactions = null;
	this._cash_prices = null;
	this._cash_settings = null;
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
	
	// set index cleanup 
	setInterval(function () {
		console.log("Wait queue: " + self._waitQueue.length);
	}, 60*1000);	
}

CashApi.prototype.getAccount = require('./accapi.js').getAccount;
CashApi.prototype.getAllAccounts = require('./accapi.js').getAllAccounts;
CashApi.prototype.getChildAccounts = require('./accapi.js').getChildAccounts;
CashApi.prototype._getAllChildsId = require('./accapi.js')._getAllChildsId; 
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
CashApi.prototype.createAccountsTree = require('./accapi.js').createAccountsTree;
CashApi.prototype.importPrices = require('./priceapi.js').importPrices;
CashApi.prototype.clearPrices = require('./priceapi.js').clearPrices;
CashApi.prototype.getCmdtyPrice = require('./priceapi.js').getCmdtyPrice;
CashApi.prototype.getCmdtyLastPrices = require('./priceapi.js').getCmdtyLastPrices;
CashApi.prototype.getPricesByPair = require('./priceapi.js').getPricesByPair;
CashApi.prototype.savePrice = require('./priceapi.js').savePrice;
CashApi.prototype.parseGnuCashXml = require('./gnucash.js');
CashApi.prototype.getAccountRegister = require('./trnapi.js').getAccountRegister;
CashApi.prototype.getTransaction = require('./trnapi.js').getTransaction;
CashApi.prototype.saveTransaction = require('./trnapi.js').saveTransaction;
CashApi.prototype.importTransactions = require('./trnapi.js').importTransactions;
CashApi.prototype.clearTransactions = require('./trnapi.js').clearTransactions;
CashApi.prototype.getTransactionsInDateRange = require('./trnapi.js').getTransactionsInDateRange;
CashApi.prototype.parseRaw = require('./export.js').import;
CashApi.prototype.exportRaw = require('./export.js').export;
CashApi.prototype.getSettings = require('./settings.js').getSettings;
CashApi.prototype.saveSettings = require('./settings.js').saveSettings;
CashApi.prototype.clearSettings = require('./settings.js').clearSettings;
CashApi.prototype.importSettings = require('./settings.js').importSettings;

CashApi.prototype._waitForData = function (cb) {
	this._lastAccess = new Date();
	if (this._dataReady) return cb(null);
		else this._waitQueue.push(cb);
	if (!this._dataInCalc) {
		this._calcStats(function () {});
	}
};

CashApi.prototype._lockData = function (cb) {
	if (!this._dataReady)
		return cb(new Error("Can't lock unready data"));
	this._dataInCalc = true;
	this._dataReady = false;
	return cb();
};

CashApi.prototype._unLockData = function (cb) {
	if (!this._dataInCalc) {
		this._calcStats(function () {});
	}
	return cb();
};

CashApi.prototype._loadData = function (cb) {
	var self = this;
	var adb = null;
	async.series([
		function openDb(cb) {
			self._ctx.getDB(function (err, _adb) {
				if (err) return cb(err);
				adb = _adb;
				cb();
			});
		},
		function openCollections(cb) {
			async.parallel({
				cash_accounts:function (cb) {
					adb.collection('cash_accounts',cb);
				},
				cash_transactions:function (cb) {
					adb.collection('cash_transactions',cb);
				},
				cash_prices:function (cb) {
					adb.collection('cash_prices',cb);
				},
				cash_settings:function (cb) {
					adb.collection('cash_settings',cb);
				}
			}, safe.sure_result(cb, function (results) {
				self._cash_accounts = results.cash_accounts;
				self._cash_transactions = results.cash_transactions;
				self._cash_prices = results.cash_prices;
				self._cash_settings = results.cash_settings;	
			}));
		}, 
		function ensureIndexes(cb) {
			async.parallel([
				function (cb) {
					self._cash_accounts.ensureIndex("parentId",cb);
				},
				function (cb) {
					self._cash_transactions.ensureIndex("datePosted",cb);
				},
				function (cb) {
					self._cash_transactions.ensureIndex({"splits._id": 1},cb);
				},
				function (cb) {
					self._cash_transactions.ensureIndex({"splits.accountId": 1},cb);
				}
				
			], cb)
		}
	],cb);
}; 

CashApi.prototype.init = function (cb) {
	var self = this;
	async.parallel([
		function (cb) {
			self._ctx.getModule("core",function (err, module) {
				if (err) return cb1(err);
				self._coreapi = module.api;
				cb();
			});
		},
		function (cb) {
			self._loadData(cb);
		}], 
	cb);
};

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
};

CashApi.prototype.getAssetInfo = function (token, asset, cb) {
	var info = assetInfo[asset];
	if (info==null)
		return cb(new Error("Invalid asset type"));
	cb(null,info);
};

CashApi.prototype._calcStats = function _calcStats(cb) {
	var self = this;
	// helper functions
	function getAccStats (accId) {
		if (self._stats[accId]==null)
			self._stats[accId] = {_id:accId, value:0, count:0, trDateIndex:[], type: "BANK"};
		return self._stats[accId];
	}
	function getAccPath (acc, cb) {
		if (acc._id != acc.parentId && acc.parentId) {
			self._cash_accounts.findOne({'_id': acc.parentId}, function(err, parentAcc) {
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
	
	function getAccLevel(acc,startLevel,cb){		
		if(acc.parentId == 0){
			cb(startLevel);
		}
		else{			
			self._cash_accounts.findOne({'_id': acc.parentId}, function(err, parentAcc) {
				if (parentAcc==null) {
					cb(startLevel);
				} else {
					getAccLevel(parentAcc, ++startLevel, function (level) {
						cb(level);
					});
				}
			});
		}
	}	
	
	console.time("Stats");
	self._dataReady = false;
	self._dataInCalc = true;
	self._stats = {};
	
	async.auto({
		price_tree: function (cb1) {
			self._stats.priceTree = {};
			self._cash_prices.find({}, function(err, cursor) {
				if (err) return cb1(err);
				cursor.each(function(err, price) {
					if (err || !price) return cb1(err);
					var date = new Date(price.date);
					var year = date.getFullYear();
					var month = date.getMonth();
					var dirs = [ 
						{rate:price.value,key:(price.cmdty.space+price.cmdty.id+price.currency.space+price.currency.id)},
						{rate:1/price.value,key:(price.currency.space+price.currency.id+price.cmdty.space+price.cmdty.id)}];
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
					});
				});
			});
		},
		account_paths: function (cb1) {
			self._cash_accounts.find({}, function(err, cursor) {
				if (err) return cb1(err);
				cursor.each(function(err, acc) {
					if (err || !acc) return cb1(err);
					getAccPath(acc, function (path) { 
						getAccStats(acc._id).path = path;
						getAccStats(acc._id).type = acc.type;
						getAccStats(acc._id).cmdty = acc.cmdty;
						getAccStats(acc._id).parentId = acc.parentId;
					});
					getAccLevel(acc, 1, function(level) { 
						getAccStats(acc._id).level = level;
					});
				});
			});
		},
		transaction_stats: ['account_paths',function (cb1) {
			console.time("Test");
			var ballances = [];
			self._cash_transactions.find({}, {sort: {datePosted: 1}}, function (err, cursor) {
				if (err) return cb1(err);
				cursor.each(function (err, tr) {
					if (err || !tr) return cb1(err);
					tr.splits.forEach(function(split) {
						var accStats = getAccStats(split.accountId);
						var act = assetInfo[accStats.type].act;								
						accStats.value+=split.quantity*act;
						accStats.count++;
						var trs = {_id:tr._id, date:new Date(tr.datePosted), ballance: 0};
						accStats.trDateIndex.push(trs);
						//!!!!
						var accId = split.accountId;
						if (!ballances[accId])
							ballances[accId] = 0;
						var recv = [];
						var send = null;
						tr.splits.forEach(function(split) {
							if (split.accountId == accId)
								send = split;
							else
								recv.push(split);
						});
						trs.recv = recv; trs.send = send;
						ballances[accId] += send.quantity*act;
						trs.ballance = ballances[accId];
						//!!!!
					});
				});
			});
		}],
		accounts_tree_sum: ['transaction_stats','price_tree', function (cb) {
			function getAccountTree(id) {
				// filter this level data
				var level = _(self._stats).values().filter(function (e) { 
					if (!e.type) return false;
					if (id==null)
						return e.parentId==null || e.parentId.toString()==0
					else
						return e.parentId && e.parentId.toString() == id.toString(); 
				});
				var res = [];
				_(level).forEach (function (acc) {
					acc.avalue = acc.value;
					acc.gvalue = acc.avalue;					
					res.push(acc)
					var childs = getAccountTree(acc._id);
					_.each(childs, function (c) {
						var key = (acc.cmdty.space+acc.cmdty.id+c.space+c.id);			
						var ptree = self._stats.priceTree[key];
						var rate = ptree?ptree.last:1;
						acc.avalue +=c.avalue*rate;
						acc.gvalue = acc.avalue;
					})
				})
				return res;
			}			
			getAccountTree()
			cb();
		}]
		}, function done (err) {
			if (err) console.log(err);
			console.timeEnd("Test");
			console.timeEnd("Stats");			
			self._dataReady=true;
			self._dataInCalc=false;
			self._pumpWaitQueue();
			cb();
		}
	);
};

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
			self._pumpWaitQueue();
		});
	}
};

module.exports.init = function (ctx,cb) {
	var api = new CashApi(ctx);
	api.init(function (err) {
		if (err) return cb(err);
		cb(null, api);
	});
};

/* Don't touch this, this can be used to debug/profile cash api 
var profile = {};
_.forEach(CashApi.prototype, function (f,k) {
	var p = function () {
		var start = new Date().valueOf();
		var cb = arguments[arguments.length-1];
		if (_.isFunction(cb)) {
			arguments[arguments.length-1] = function () {
				var end = new Date().valueOf();
				console.log(k + " = " + (end-start));
				if (!profile[k])
					profile[k]={name:k,count:0,total:0};
				profile[k].count++;
				profile[k].total+=(end-start);
				cb.apply(this,arguments);
			}
		}
		var pf = f;
		return f.apply(this, arguments);
	}
	CashApi.prototype[k] = p;
});
setInterval(function () {
	console.log("Profile dump");
	_.forEach(profile, function (e) {
		console.log(e);
	})
}, 10000);
*/
