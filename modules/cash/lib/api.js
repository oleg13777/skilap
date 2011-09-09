var fs = require("fs");
var _ = require('underscore');
var alfred = require('alfred');
var async = require('async');
var Step = require("step");
var events = require("events");

function cashapi (ctx) {
	var self = this;
	this.ctx = ctx;
	var cash_accounts = null;
	var cash_transactions = null;
	var sema = new events.EventEmitter();
	var dataReady = false;
	var dataActive = false;
	var unloadTimeout = null;
	var stats = {};
	var coreapi;
	ctx.getModule("core",function (err, module) {
			coreapi = module.api;
	})

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
			async.apply(self.ctx.getDB)
		], function (err, results) {
			if (err) return cb(err);
			var adb = results[0];
			async.parallel([
				async.apply(adb.ensure, "cash_accounts",{type:'cached_key_map',buffered:false}),
				async.apply(adb.ensure, "cash_transactions",{type:'cached_key_map',buffered:false})
			], function (err, results) {
				if (err) return cb(err)
				cash_accounts = results[0];
				cash_transactions = results[1];
				cb();
			})
		}
	)
}; 

function unloadData() {
	stats = {};
	console.log("dataCleared");
	dataActive = dataReady = false;
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

function getAccountInfo(accId, details, cb) {
	Step (
		function start() {
			waitForData (this);
		},
		function get() {
			var res = {};
			var accStats = stats[accId];
			res.id = accId;
			_.forEach(details, function (val) {
					if (val == "value")
						res.value = accStats.value;
					else if (val == "count") 
						res.count = accStats.count;
					else if (val == "path") 
						res.path = accStats.path;
			});
			process.nextTick(function () {cb(null, res);});
		}
	)
}

function getAccountRegister(accId, offset, limit, cb ) {
	Step (
		function start() {
			waitForData (this);
		},
		function get(err) {
			var accStats = stats[accId];
			if (limit==null) {
				if (offset==0 || offset == null)
					process.nextTick(function () { cb(null, accStats.trDateIndex); });
				else
					process.nextTick(function () { cb(null, accStats.trDateIndex.slice(offset, offset + limit)); });
			} else
				process.nextTick(function () { cb(null, accStats.trDateIndex.slice(offset, offset + limit)); });
		}
	)
}

function getTransaction(trId, cb) {
	Step (
		function start() {
			waitForData (this);
		},
		function get() {
			cash_transactions.get(trId, cb);
		}
	)
}

function saveTransaction (tr,cb) {
	Step (
		function start() {
			waitForData (this);
		},
		function getExTransaction () {
			getTransaction(tr.id,this);
		},
		function updateIt (err, trUpd) {
			// update branch
			if (tr.splits !=null) {
				// ammount is changed
				_.forEach(tr.splits, function (newSplit) {
						if (newSplit.id !=null) {
							// modify existing split
							_.forEach(trUpd.splits, function (updSplit) {
								if (updSplit.id == newSplit.id) {
									if (newSplit.value != null) {
										updSplit.value = newSplit.value;
									} else if (newSplit.accountId!=null) {
										updSplit.accountId = newSplit.accountId;
									}
								}
							});
						} else {
							// add new split
						}
				});
			} else if (tr.description != null) {
				trUpd.description = tr.description;
			} else if (tr.datePosted != null) {
				trUpd.datePosted = tr.datePosted;
			} else if (tr.dateEntered != null) {
				trUpd.dateEntered = tr.dateEntered;
			}
			cash_transactions.put(trUpd.id, trUpd, this);
		},
		function postUpdate(err) {
			process.nextTick(function () { calcStats(function () {})});
			cb(null);
		}
	)
}

function getAccPath(acc, cb) {
	if (acc.id!=acc.parent && acc.parent!=1) {
		cash_accounts.get(acc.parent, function(err, parentAcc) {
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
			stats[accId] = {id:accId,value:0, count:0, trDateIndex:[]};
		return stats[accId];
	}
	async.auto({
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
					accStats.value+=split.value;
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
				accStats.trDateIndex = _.sortBy(accStats.trDateIndex,function (e) { return e.date; });
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
						ballance += send.value;
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

this.getAllAccounts = getAllAccounts;
this.getAccountInfo = getAccountInfo;
this.getAccountRegister = getAccountRegister;
this.getTransaction = getTransaction;
this.saveTransaction = saveTransaction;
this.getAccountByPath = getAccountByPath;
this.loadData = loadData;

}

module.exports.init = function (ctx,cb) {
	var api = new cashapi(ctx);
	api.loadData(function (err) {
		if (err) return cb(err);
		cb(null, api);
	})
}
