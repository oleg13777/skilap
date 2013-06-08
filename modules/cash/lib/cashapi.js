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
CashApi.prototype.getAccountTree = require('./accapi.js').getAccountTree;
CashApi.prototype.getChildAccountsHelper = require('./accapi.js').getChildAccountsHelper;
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
				},
				cash_accounts_stat: function (cb) {
					adb.collection('cash_accounts_stat', cb);
				},
				cash_register: function (cb) {
					adb.collection('cash_register', cb);
				},
				cash_prices_stat: function (cb) {
					adb.collection('cash_prices_stat', cb);
				}
			}, safe.sure_result(cb, function (results) {
				self._cash_accounts = results.cash_accounts;
				self._cash_transactions = results.cash_transactions;
				self._cash_prices = results.cash_prices;
				self._cash_settings = results.cash_settings;
				self._cash_accounts_stat = results.cash_accounts_stat;
				self._cash_register = results.cash_register;
				self._cash_prices_stat = results.cash_prices_stat;
			}));
		},
		function ensureIndexes(cb) {
			async.parallel([
				function (cb) {
					self._cash_accounts.ensureIndex("parentId",cb);
				},
				function (cb) {
					self._cash_accounts_stat.ensureIndex("path",cb);
				},
				function (cb) {
					self._cash_transactions.ensureIndex("datePosted",cb);
				},
				function (cb) {
					self._cash_prices.ensureIndex("date",cb);
				},
				function (cb) {
					self._cash_prices.ensureIndex("currency.id",cb);
				},
				function (cb) {
					self._cash_prices.ensureIndex("cmdty.id",cb);
				},
				function (cb) {
					self._cash_prices_stat.ensureIndex("key",cb);
				},
				function (cb) {
					self._cash_register.ensureIndex({"trId": 1 }, cb);
				},
				function (cb) {
					self._cash_register.ensureIndex({"accId": 1 }, cb);
				},
				function (cb) {
					self._cash_register.ensureIndex({ "date": 1 }, cb);
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
	var _stats = {};	
	// helper functions
	function getAccStats (accId) {
		if (_stats[accId]==null)
			_stats[accId] = {_id:accId, value:0, count:0, trDateIndex:[], type: "BANK"};
		return _stats[accId];
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

	console.time("Stats");
	self._dataReady = false;
	self._dataInCalc = true;
	var skip_calc = false;
	var defCurrency = {space:"ISO4217", id:"USD"};

	async.auto({
		def_currency: [function (cb) {
			// get global default currency because some stuff depend on it
			// store it if it absent
			self._cash_settings.findOne({'id': "currency"}, safe.sure(cb, function (v) {
				if (v && v.v) {
					defCurrency = v.v;
					cb()
				}
				else {
					self._cash_settings.update({'id':"currency"},{$set:{v:defCurrency}},{upsert:true}, cb)
				}
			}))
		}],
		db_stats: function (cb) {
			if (self._db_stats) return cb();
			self._db_stats = true;
			self._cash_accounts_stat.count(safe.sure(cb, function (c) {
				skip_calc = c!=0;
				cb();
			}))
		},
		price_tree: ['db_stats', function (cb1) {
			if (skip_calc) return cb1();
			console.time('price_tree');
			_stats.priceTree = {};
			self._cash_prices.find({}, safe.sure(cb1, function (cursor) {
				var stop = false;
				async.doUntil(function (cb) {
					cursor.nextObject(safe.sure(cb, function (price) {
						if (!price) {
							console.timeEnd('price_tree');
							stop = true;
							return cb();
						}
						var date = new Date(price.date);
						var dirs = [
							{rate:price.value,key:(price.cmdty.space+price.cmdty.id+price.currency.space+price.currency.id)},
							{rate:1/price.value,key:(price.currency.space+price.currency.id+price.cmdty.space+price.cmdty.id)}];
						async.forEachSeries(dirs, function (dir, cb) {
							var dirTree = _stats.priceTree[dir.key];
							if (!dirTree) _stats.priceTree[dir.key] = dirTree = { key: dir.key };
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
							dirTree.key = dir.key;
							delete dirTree._id;
							self._cash_prices_stat.update({ key: dir.key }, dirTree, { upsert: true, w: 1 }, cb);
						}, cb);
					}));
				}, function () { return stop; }, cb1);
			}));
		}],
		account_paths: ['db_stats', function (cb) {
			if (skip_calc) return cb();
			console.time('account_paths');
			self._cash_accounts.find({}).toArray(safe.sure(cb, function (accounts) {
				async.forEach(accounts, function (acc, cb) {
					getAccPath(acc, function (path) {
						var accStats = getAccStats(acc._id);
						accStats.path = path;
						accStats.type = acc.type;
						accStats.cmdty = acc.cmdty;
						accStats.parentId = acc.parentId;
						accStats.level = path.split("::").length;
						cb();
					})
				},function (err) { console.timeEnd('account_paths'); cb(err);});
			}));
		}],
		transaction_stats: ['db_stats', 'account_paths', function (cb1) {
			if (skip_calc) return cb1();
			console.time("Transactions");
			var ballances = [];
			self._cash_transactions.find({}, {sort: {datePosted: 1}}, safe.sure(cb1, function (cursor) {
				var stop = false;
				async.doUntil(function (cb) {
					cursor.nextObject(safe.sure(cb, function (tr) {
						if (!tr) {
							stop = true;
							return cb();
						}
						async.forEachSeries(tr.splits, function (split, cb) {
							var accStats = getAccStats(split.accountId);
							var act = assetInfo[accStats.type].act;
							accStats.value+=split.quantity*act;
							accStats.count++;
							var trs = {_id:tr._id, date:tr.datePosted, ballance: 0};
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
							var doc = _.omit(trs, '_id','recv','send');
							doc.trId = tr._id;
							doc.accId = accId;
							self._cash_register.update({ trId: tr._id, accId: accId }, doc,
									{ upsert: true, hint: { trId: 1 }, w: 1 }, cb);
						}, cb);
					}));
				}, function () { return stop; }, safe.sure(cb1, function () {
					console.timeEnd("Transactions");
					async.forEachSeries(_.keys(_stats), function (accId, cb) {
						var accStats = getAccStats(accId);
						var doc = _.omit(accStats, 'trDateIndex','cmdty','parentId');
						self._cash_accounts_stat.update({ _id: doc._id }, doc,
								{ upsert: true, w: 1 }, cb);
					}, cb1);
				}));
			}));
		}]
		}, function done (err) {
			if (err) console.log(err);
			console.timeEnd("Stats");
			self._dataReady=true;
			self._dataInCalc=false;
			self._pumpWaitQueue();
			cb();
		}
	);
};

CashApi.prototype._calcStatsDb = function (cb) {
	var self = this;
	var stats = {
		db_stats: {
			prices: 0,
			accounts: 0,
			trs: 0
		}
	};
	async.auto({
		price_tree: function (cb) {
			stats.priceTree = {};
			self._cash_prices_stat.find().each(safe.sure(cb, function (doc) {
				if (!doc) return cb();
				stats.priceTree[doc._id] = doc;
				stats.db_stats.prices++;
			}));
		},
		accounts: function (cb) {
			self._cash_accounts_stat.find().each(safe.sure(cb, function (doc) {
				if (!doc) return cb();
				stats[doc._id] = doc;
				stats.db_stats.accounts++;
			}));
		},
		registry: [ 'accounts', function (cb) {
			self._cash_register.find().each(safe.sure(cb, function (doc) {
				if (!doc) return cb();
				var acc = stats[doc.accId];
				if (acc) {
					var arr = acc.trDateIndex;
					if (!arr) acc.trDateIndex = arr = [];
					var trs = _.omit(doc, 'trId', 'accId');
					trs._id = doc.trId;
					arr.push(trs);
					stats.db_stats.trs++;
				}
			}));
		} ]
	}, safe.sure(cb, function () {
		cb(null, stats);
	}));
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
