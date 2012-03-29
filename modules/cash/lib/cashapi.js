/**
 * Core API
 */
var fs = require("fs");
var _ = require('underscore');
var alfred = require('alfred');
var async = require('async');
var Step = require("step");
var events = require("events");
var sax = require("sax");
var util = require("util");
var zlib = require("zlib");
var extend = require('node.extend');

function CashApi (ctx) {
	var self = this;
	this.ctx = ctx;
	var cash_accounts = null;
	var cash_transactions = null;
	var cash_prices = null;
	var sema = new events.EventEmitter();
	var dataReady = false;
	var dataActive = false;
	var unloadTimeout = null;
	var stats = {};
	var coreapi;

	function touchTimer() {
		if (unloadTimeout!=null)
			clearTimeout(unloadTimeout);
		unloadTimeout = setTimeout(unloadData, 20000);
	}

	function waitForData (cb) {
		if (dataReady) cb(null);
			else sema.once("dataReady",cb);
		if (!dataActive) {
			calcStats(function () {});
			dataActive = true;
		}
		touchTimer();
	}

	function loadData (cb) {
		var adb;
		async.series([
			function openDb(cb) {
				self.ctx.getDB(function (err, _adb) {
					if (err) return cb(err);
					adb = _adb;
					cb();
				})
			},
			function openCollections(cb) {
				async.parallel([
					function accounts (cb) {
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
					cash_accounts = results[0];
					cash_transactions = results[1];
					cash_prices = results[2];
					cb();
				})
			}, 
			function ensureIndexes(cb) {
				async.parallel([
					function (cb) {
						cash_accounts.addIndex("parentId",function (acc) { return acc.parentId; }, cb);
					},
					function (cb) {
						cash_transactions.addIndex("datePosted",function (trn) { return (new Date(trn.datePosted)).valueOf(); }, cb);
					}
				], cb)
			}
		],cb)
	}; 

	function unloadData() {
		stats = {};
		console.log("dataCleared");
		dataActive = dataReady = false;
	}

	this.init = function (cb) {
		async.parallel([
			function (cb1) {
				ctx.getModule("core",function (err, module) {
					if (err) return cb1(err);
					coreapi = module.api;
					cb1();
				})
			},
			function (cb1) {
				loadData(cb1)
			}], 
		cb);
	}

	function getAccount(token, id, cb) {
		async.series ([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function get(cb1) {
				cash_accounts.get(id, function (err, acc) {
					if (err) cb1(err);
					cb1(null, acc);
				},
				true);
			}], function end(err, result) {
				if (err) return cb(err);
				cb(null, result[1]);
			}
		)
	}


	function getCmdtyPrice(token,cmdty,currency,date,method,cb) {
		if (_(cmdty).isEqual(currency)) return cb(null,1);
		// not sure what template means
		if (cmdty.id=='template') return cb(null,1);
		async.series ([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function get(cb1) {
				var key = JSON.stringify({from:cmdty,to:currency});
				var ptree = stats.priceTree[key];
				if (ptree==null) return cb(new Error("Unknown price pair"));
				cb1(null,ptree.last);
			}], function end(err, results) {
				if (err) return cb(err);
				cb(null, results[1]);
			}
		)
	}

	function getAllAccounts(token, cb) {
		async.series ([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function get(cb1) {
				var accounts = [];
				cash_accounts.scan(function (err, key, acc) {
					if (err) cb1(err);
					if (key) accounts.push(acc);
						else cb1(null, accounts);
					},
				true);
			}], function end(err, results) {
				if (err) return cb(err);
				cb(null, results[1]);
			}
		)
	}

	function getChildAccounts(token, parentId, cb) {
		async.series ([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function get(cb1) {
				cash_accounts.find({parentId: {$eq: parentId}}).all(function (err, accounts) {
					if (err) cb1(err);
					cb1(null, _(accounts).map(function (e) {return e.value;}));
				});
			}
			], function end(err, results) {
				if (err) return cb(err);
				cb(null, results[1]);
			}
		)
	}

	function getAccountByPath(path,cb) {		
		Step (
			function start() {
				waitForData (this);
			},
			function get() {
				var newAccId = null;
				_.forEach(stats, function (accStat,key) {
					if (accStat.path == path)
						newAccId = key;
				});				
				if (newAccId==null)
					process.nextTick(function () { cb(new Error("No such account")); });
				else 
					process.nextTick(function () { cb(null, newAccId); });
			}
		)
	}

	function getAccountInfo(token, accId, details, cb) {
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function (cb1) {
				var res = {};
				var accStats = stats[accId];
				res.id = accId;
				_.forEach(details, function (val) {
					if (val == "value")
						res.value = accStats.value;
					if (val == "count") 
						res.count = accStats.count;
					if (val == "path") 
						res.path = accStats.path;
				});				
				process.nextTick(function () {cb1(null, res);});
			}], function (err, results) {
				if (err) return cb(err);
				cb(null,results[1]);
			}
		)
	}

	function getAccountRegister(token,accId, offset, limit, cb ) {
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function (cb1) {
				var accStats = stats[accId];
				if (limit==null) {
					if (offset==0 || offset == null)
						process.nextTick(function () { cb1(null, accStats.trDateIndex); });
					else
						process.nextTick(function () { cb1(null, accStats.trDateIndex.slice(offset, offset + limit)); });
				} else
					process.nextTick(function () { cb1(null, accStats.trDateIndex.slice(offset, offset + limit)); });
			}], function (err, results) {
				if (err) return cb(err);
				cb(null,results[1]);
			}
		)
	}

	function getTransaction(token, trId, cb) {
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function (cb1) {
				cash_transactions.get(trId, cb1);
			}
		], function (err, results) {
			if (err) return cb(err);
			cb(null,results[1]);
		})
	}

	function saveTransaction (token,tr,cb) {		
		var trUpd;
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function (cb1) {
				cash_transactions.get(tr.id,function (err, tr_) {
					trUpd = tr_;
					cb1(err);
				});
			}, 
			function (cb1) {
				// update branch
				console.log('tr.splits = ');
				console.log(tr.splits);
				console.log('trUpd.splits =');
				console.log(trUpd.splits);
				if (tr.splits !=null) {
					// ammount is changed
					_.forEach(tr.splits, function (newSplit) {
							if (newSplit.id !=null) {
								// modify existing split
								_.forEach(trUpd.splits, function (updSplit) {
									if (updSplit.id == newSplit.id) {
										if (newSplit.value != null) {
											updSplit.value = newSplit.value;
										}
										if (newSplit.accountId!=null) {
											updSplit.accountId = newSplit.accountId;
										}
									}
								});
							} else {
								// add new split
							}
					});
				} 
				if (tr.description != null) {
					trUpd.description = tr.description;
				} 
				if (tr.datePosted != null) {
					trUpd.datePosted = tr.datePosted;
				} 
				if (tr.dateEntered != null) {
					trUpd.dateEntered = tr.dateEntered;
				}				
				cash_transactions.put(trUpd.id, trUpd, cb1);
			}
		], function (err) {
			if (err) return cb(err);
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		})
	}
	
	function saveAccount(token, account, cb) {
		async.waterfall ([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			},
			function (t, cb1) {
				if (account.id)
					cb1(null, account.id);
				else
					ctx.getUniqueId(cb1);
			},
			function get(id, cb1) {
				account.id = id;
				cash_accounts.put(account.id, account, cb1);
			}], function end(err, result) {
				if (err) return cb(err);
				process.nextTick(function () { calcStats(function () {})});
				cb(null, account);
			}
		)
	}
	
	function updateTransaction (token,modifiedTr,cb) {		
		var updatedTr={};
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function (cb1) {				
				cash_transactions.get(modifiedTr.id,function (err, tr_) {
					updatedTr = tr_;									
					extend(updatedTr,modifiedTr);					
					cb1(err);
				});				
			}, 
			function (cb1) {
				async.forEachSeries(updatedTr.splits,function(split,cb2){
					if(split.id){
						cb2();
					}
					else{
						ctx.getUniqueId(function (err, id) {
							if (err){
								return cb1(err);
							}
							split.id = id;
							cb2();
						});
					}
					
				},cb1);
			},
			function(cb1){
				console.log('updated tr = ');	
				console.log(updatedTr);	
				cash_transactions.put(updatedTr.id, updatedTr, cb1);
			}			
		], function (err) {
			if (err) return cb(err);
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		})
	}
	
	function addTransaction(token,newTr,cb){		
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			}, 			
			function (cb1) {
				async.forEachSeries(newTr.splits,function(split,cb2){					
					ctx.getUniqueId(function (err, id) {
						if (err){
							return cb1(err);
						}
						split.id = id;
						cb2();
					});					
				},cb1);				
			},
			function(cb1){				
				ctx.getUniqueId(function (err, id) {
					if (err){
						return cb1(err);
					}
					newTr.id = id;
					cb1();
				});	
			
			},
			function(cb1){
				console.log('newTr = ');
				console.log(newTr);
				cash_transactions.put(newTr.id, newTr, cb1);
			}
		], function (err) {
			if (err) return cb(err);
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		})
	}

	function clearAccaunts (token, ids, cb) {
		if (ids == null) {
			async.series ([
				function (cb1) {
					async.parallel([
						async.apply(coreapi.checkPerm,token,["cash.edit"]),
						async.apply(waitForData)
					],cb1);
				},
				function (cb1) {
					cash_accounts.clear(cb1);
				} 
			], function (err) {
				if (err) return cb(err);
				process.nextTick(function () { calcStats(function () {})});
				cb(null);
			});
		} else {
			cb(null);
		}
	}

	function importAccaunts (token, accounts, cb) {
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			},
			function (cb1) {
				accounts.forEach(function (e) {
					cash_accounts.put(e.id,e,function (err) {if (err) { throw err; }});
				});
				cb1();
			}, 
		], function (err) {
			if (err) return cb(err);
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		})
	}
	
	function clearPrices (token, ids, cb) {
		if (ids == null) {
			async.series ([
				function (cb1) {
					async.parallel([
						async.apply(coreapi.checkPerm,token,["cash.edit"]),
						async.apply(waitForData)
					],cb1);
				},
				function (cb1) {
					cash_prices.clear(cb1);
				} 
			], function (err) {
				if (err) return cb(err);
				process.nextTick(function () { calcStats(function () {})});
				cb(null);
			});
		} else {
			cb(null);
		}
	}

	function importPrices (token, prices, cb) {
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			},
			function (cb1) {
				prices.forEach(function (e) {
					cash_prices.put(e.id,e,function (err) {if (err) { throw err; }});
				});
				cb1();
			}, 
		], function (err) {
			if (err) return cb(err);
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		})
	}	

	function clearTransaction (token, ids, cb) {
		if (ids == null) {
			async.series ([
				function (cb1) {
					async.parallel([
						async.apply(coreapi.checkPerm,token,["cash.edit"]),
						async.apply(waitForData)
					],cb1);
				},
				function (cb1) {
					cash_transactions.clear(cb1);
				} 
			], function (err) {
				if (err) return cb(err);
				process.nextTick(function () { calcStats(function () {})});
				cb(null);
			});
		} else {
			cb(null);
		}
	}

	function importTransactions (token, transactions, cb) {
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			},
			function (cb1) {
				transactions.forEach(function (e) {
					cash_transactions.put(e.id,e,function (err) {if (err) { throw err; }});
				});
				cb1();
			}, 
		], function (err) {
			if (err) return cb(err);
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		})
	}

	function getAccPath(acc, cb) {
		if (acc.id!=acc.parentId && acc.parentId!=0) {
			cash_accounts.get(acc.parentId, function(err, parentAcc) {
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

	function calcStats(cb) {
		console.time("Stats");
		dataReady = false;
		stats = {};
		function getAccStats(accId) {
			if (stats[accId]==null)
				stats[accId] = {id:accId, value:0, count:0, trDateIndex:[]};
			return stats[accId];
		}
		async.auto({
			price_tree: function (cb1) {
				stats.priceTree = {};
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
						{rate:1/price.value,key:JSON.stringify({to:price.currency,from:price.cmdty})}];
					_(dirs).forEach(function (dir) {
						var dirTree = stats.priceTree[dir.key];
						if (dirTree==null) stats.priceTree[dir.key]=dirTree={};
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
				cash_accounts.scan(function(err, k, acc) {
					if (err) return cb1(err);
					if (k!=null) {
						c++;
						getAccPath(acc, function (path) { 
							getAccStats(acc.id).path = path;
							if (--c==0) cb1();
						});
					} else if (--c==0) cb1();
				}, true)
			},
			transaction_stats: function (cb1) {
				console.time("Test");
				var next = this;
				cash_transactions.scan(function (err, k, tr) {
					if (err) return cb1(err);
					if (k==null) return cb1();
					tr.splits.forEach(function(split) {
						var accStats = getAccStats(split.accountId);
						accStats.value+=split.quantity;
						accStats.count++;
						accStats.trDateIndex.push({id:tr.id,date:tr.dateEntered});
					});
				},true)
			},
			build_register:['transaction_stats', function (cb1) {
				console.timeEnd("Test");
				var next = this;
				async.forEach (_.keys(stats), function (accId, cb2) {
					accStats = stats[accId];
					// sort by date
					accStats.trDateIndex = _.sortBy(accStats.trDateIndex,function (e) { return e.date.valueOf(); });
					var ballance = 0;
					async.forEachSeries(accStats.trDateIndex, function (trs,cb3) {
						cash_transactions.get(trs.id, function (err, tr) {
							var recv = [];
							var send = null;
							tr.splits.forEach(function(split) {
								if (split.accountId == accId)
									send = split;
								else
									recv.push(split);
							})
							trs.recv = recv; trs.send = send;
							ballance += send.quantity;
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
				dataReady=true;
				sema.emit("dataReady");
				cb();
			}
		);
	}
	
	function getTransactionInDateRange(token, range, cb) {
		var res = [];
		async.series([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.view"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function (cb1) {
				var stream = cash_transactions.find({datePosted: {$range: [range[0].valueOf(),range[1].valueOf(),range[2],range[3]]}}).stream();
				stream.on('record', function (key,tr) {
					res.push(tr);
				});
				stream.on('end',cb1);
				stream.on('error',cb1);
			}],
			function done (err) {
				if (err) console.log(err);
				process.nextTick(function () {
					cb(err, res);
				});
			}
		);
	}

	function getDefaultsAccounts(token, cb){
		var accounts = [
			{name:ctx.i18n(token, 'cash', 'Cash'), type:'CASH', ch:[ctx.i18n(token, 'cash', 'My wallet')]},
			{name:ctx.i18n(token, 'cash', 'Bank'), type:'BANK', ch:[ctx.i18n(token, 'cash', 'My account')]},
			{name:ctx.i18n(token, 'cash', 'Credit Cards'), type:'CREDIT CARD', ch:[ctx.i18n(token, 'cash', 'My card')]},
			{name:ctx.i18n(token, 'cash', 'Income'), type:'INCOME', ch:[ctx.i18n(token, 'cash', 'Salary'), ctx.i18n(token, 'cash', 'Interest'), ctx.i18n(token, 'cash', 'Assets sale'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Car'), type:'EXPENSE', ch:[ctx.i18n(token, 'cash', 'Fuel'), ctx.i18n(token, 'cash', 'Insurance'), ctx.i18n(token, 'cash', 'Service'), ctx.i18n(token, 'cash', 'Repair'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Life'), type:'EXPENSE', ch:[ctx.i18n(token, 'cash', 'Food'), ctx.i18n(token, 'cash', 'Drugs'), ctx.i18n(token, 'cash', 'Transport'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Utilities'), type:'EXPENSE', ch:[ctx.i18n(token, 'cash', 'Mobile links'), ctx.i18n(token, 'cash', 'Fixed links'), ctx.i18n(token, 'cash', 'House'), ctx.i18n(token, 'cash', 'Education'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Hobby'), type:'EXPENSE', ch:[ctx.i18n(token, 'cash', 'Sport'), ctx.i18n(token, 'cash', 'Garden'), ctx.i18n(token, 'cash', 'Charuty'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Real assets'), type:'EXPENSE', ch:[ctx.i18n(token, 'cash', 'Transport'), ctx.i18n(token, 'cash', 'Furniture'), ctx.i18n(token, 'cash', 'Estate'), ctx.i18n(token, 'cash', 'Goods'), ctx.i18n(token, 'cash', 'Insurance'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Recreation'), type:'EXPENSE', ch:[ctx.i18n(token, 'cash', 'Travel'), ctx.i18n(token, 'cash', 'Pleasures'), ctx.i18n(token, 'cash', 'Food & drinks'), ctx.i18n(token, 'cash', 'Events'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Accidental'), type:'EXPENSE', ch:[ctx.i18n(token, 'cash', 'Stolen'), ctx.i18n(token, 'cash', 'Gifts'), ctx.i18n(token, 'cash', 'Bad debts'), ctx.i18n(token, 'cash', 'Other')]},
			{name:ctx.i18n(token, 'cash', 'Debts'), type:'EQUITY', ch:[ctx.i18n(token, 'cash', 'Friends')]}
		];

		var ret = [];
		var cmdty = {space:"ISO4217",id:"RUB"};
		async.forEachSeries(accounts, function(acc, cb1) {
			ctx.getUniqueId(function(err, uniqId) {
				ret.push({parentId:0, cmdty:cmdty, name:acc.name, id:uniqId, type:acc.type});
				
				async.forEachSeries(acc.ch, function(name, cb2) {
					ctx.getUniqueId(function(err, id) {
						ret.push({parentId:uniqId, cmdty:cmdty, name:name, id:id, type:acc.type});
						cb2();
					});
				}, cb1);
			});
		}, function(err) {
			cb(err, ret);
		});
	}

	function restoreToDefaults(token, cb){
		async.waterfall([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function (results ,cb1) {
				cash_prices.clear(cb1);
			},
			function (cb1) {
				cash_transactions.clear(cb1);
			},
			function (cb1){
				cash_accounts.clear(cb1);
			},
			function (cb1) {
				getDefaultsAccounts(token, cb1);
			},
			function (accounts, cb1) {
				accounts.forEach(function (e) {
					cash_accounts.put(e.id,e,function (err) {if (err) { throw err; }});
				});
				cb1();
			}
		], function (err) {
			if (err) return cb(err);
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		});
	}

	function getAssetsTypes(cb) {
		var types = [
				{value:"BANK", name:"Bank"},
				{value:"CASH", name:"Cash"},
				{value:"ASSET", name:"Asset"},
				{value:"CREDIT", name:"Credit card"},
				{value:"LIABILITY", name:"Liability"},
				{value:"STOCK", name:"Stock"},
				{value:"MUTUAL", name:"Mutual found"},
				{value:"CURENCY", name:"Curency"},
				{value:"INCOME", name:"Income"},
				{value:"EXPENSE", name:"Expense"},
				{value:"EQUITY", name:"Equity"},
				{value:"RECIEVABLE", name:"Recievable"},
				{value:"PAYABLE", name:"Payable"}
			]
		cb (null, types);
	}

	function deleteAccount(token, accId, options, cb){
		async.series([
			function start(cb1) {
				async.parallel([
					async.apply(coreapi.checkPerm,token,["cash.edit"]),
					async.apply(waitForData)
				],cb1);
			}, 
			function processTransactions(cb1) {
				cash_transactions.scan(function (err, key, tr) {
					if (err) cb1(err);
					_(tr.splits).forEach(function (split) {							
						if ((split.accountId == accId) && options.newParent){
							split.accountId = options.newParent;
							cash_transactions.put(key, tr, function(err){if (err) throw err;});
						} else if (split.accountId == accId) {
							cash_transactions.put(key, null, function(err){if (err) throw err;});
						}
					});
				});
				cb1();
			},
			function processSubAccounts(cb1){
				if (options.newSubParent) {
					getChildAccounts(token, accId, function(err, childs){
						_(childs).forEach(function(ch){
							ch.parentId = options.newSubParent;
							console.log(ch);
							cash_accounts.put(ch.id, ch, function(err){if (err) throw err;});
						});
					});
				} else {
					var childs = [];
					async.waterfall([
						function(cb2){
							getAllChildsId(token, accId, childs, cb2);
						},
						function (cb2){
							cash_transactions.scan(function (err, key, tr) {
								_(tr.splits).forEach(function (split) {
									if (_(childs).indexOf(split.accountId) > -1){
										if (options.newSubAccTrnParent) {
											process.nextTick(function(){ cash_transactions.put(key, tr, function(err){ if (err) throw err; }); });
										} else {
											split.accountId = options.newSubAccTrnParent;
											process.nextTick(function() { cash_transactions.put(key, null, function(err){ if (err) throw err; });
											});
										}
									}
								});
							});
							cb2();
						},
						function (cb2) {
							childs.forEach(function (ch){
								process.nextTick(function() { cash_accounts.put(ch, null, function(err){if (err) throw err;}); });
							});
							cb2();
						}
					],cb1);
				}
				cb1();
			},
			function deleteAcc(cb1) {
				process.nextTick( function () { cash_accounts.put(accId, null, function (err) {if (err) throw err; }); });
				cb1();
			}
		], function (err) {
			if (err) { console.log(err); cb(err);}
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		});
	}

	function getAllChildsId(token, parentId, buffer, cb) {
		async.waterfall([
			async.apply(getChildAccounts, token, parentId),
			function(childs, cb1){
				_(childs).forEach(function(ch){
					buffer.push(ch.id);
					getAllChildsId(token, ch.id, buffer, cb1);
				});
			}
		],cb);
	}

this.getAllAccounts = getAllAccounts;
this.getAccountInfo = getAccountInfo;
this.getAccountRegister = getAccountRegister;
this.getTransaction = getTransaction;
this.saveTransaction = saveTransaction;
this.updateTransaction = updateTransaction;
this.addTransaction = addTransaction;
this.getAccountByPath = getAccountByPath;
this.getChildAccounts = getChildAccounts;
this.importTransactions = importTransactions;
this.importAccounts = importAccaunts;
this.importPrices = importPrices;
this.parseGnuCashXml = require('./gnucash.js');
this.clearAccounts = clearAccaunts;
this.clearTransactions = clearTransaction;
this.clearPrices = clearPrices;
this.getCmdtyPrice = getCmdtyPrice;
this.getAccount = getAccount;
this.getTransactionsInDateRange = getTransactionInDateRange;
this.restoreToDefaults = restoreToDefaults;
this.saveAccount = saveAccount;
this.getAssetsTypes = getAssetsTypes;
this.deleteAccount = deleteAccount;
}

module.exports.init = function (ctx,cb) {
	var api = new CashApi(ctx);
	api.init(function (err) {
		if (err) return cb(err);
		cb(null, api);
	})
}

