var fs = require("fs");
var _ = require('underscore');
var alfred = require('alfred');
var async = require('async');
var Step = require("step");
var events = require("events");
var adb = null;
var cash_accounts = null;
var cash_transactions = null;
var sema = new events.EventEmitter();
var dataReady = false;
var dataLoaded = false;
var unloadTimer = null;
var stats = {};

function touchUnloadTimer () {
	if (unloadTimer!=null) clearTimeout(unloadTimer);
	unloadTimer = setTimeout(unloadData,10000);
}

function waitForData (cb) {
	if (dataReady) cb(null);
		else sema.once("dataReady",cb);
	if (!dataLoaded) {
		loadData();
		dataLoaded = true;
	} else 
		touchUnloadTimer();
}

function loadData () {
	console.time("DB load");
	Step (
		function opeDB() {
			alfred.open('/home/pushok/work/joker/data', this);
		},
		function openAccounts(err,db) {
			adb = db;
			adb.ensure("cash_accounts",{type:'cached_key_map',buffered:false},this);
		},
		function openTransactions(err,_cash_accounts) {
			cash_accounts = _cash_accounts;
			adb.ensure("cash_transactions",{type:'cached_key_map',buffered:false},this);
		},
		function done(err,_cash_transactions) {
			cash_transactions = _cash_transactions;
			console.timeEnd("DB load");
			touchUnloadTimer();
			calcStats();
		}
	);
}; 

loadData();
dataLoaded = true;

function unloadData() {
	Step (
		function doJob() {
			adb.close(this);
		},
		function done (err) {
			console.log("dataCleared");
			stats = {};
			adb = null;
			cash_transaction = null;
			cash_accounts = null;
			dataLoaded = dataReady = false;
		}
	)
}

function getAllAccounts(cb) {
	Step (
		function start() {
			waitForData (this);
		},
		function get() {
			var accounts = []
			cash_accounts.scan(function (err, key, acc) {
				if (err) cb(err);
				if (key) accounts.push(acc);
					else cb(null, accounts);
				},
			true);
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
			process.nextTick(calcStats);
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

function calcStats() {
	console.time("Stats");
	dataReady = false;
	Step (
		function getAccountsStats() {
			var next = this;
			cash_accounts.scan(function(err, k, acc) {
				if (k==null) next();
				else {
					stats[acc.id]={id:acc.id,count:0,value:0,trDateIndex:[]};
					getAccPath(acc, function (path) { stats[acc.id].path = path; });
				}
			}, true)
		},
		function getTransactionStats() {
			console.time("Test");
			var next = this;
			cash_transactions.scan(function (err, k, tr) {
				if (k==null) next();
				else {
					tr.splits.forEach(function(split) {
						var accStats = stats[split.accountId];
						accStats.value+=split.value;
						accStats.count++;
						accStats.trDateIndex.push({id:tr.id,date:tr.dateEntered});
					});
				}
			},true)
		},
		function buildRegister() {
			console.timeEnd("Test");
			var next = this;
			async.forEach (_.keys(stats), function (accId, cb1) {
				accStats = stats[accId];
				// sort by date
				accStats.trDateIndex = _.sortBy(accStats.trDateIndex,function (e) { return e.date; });
				var ballance = 0;
				async.forEachSeries(accStats.trDateIndex, function (trs,cb2) {
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
						process.nextTick(cb2);
					});
				},cb1
				);
			},next)
		},
		function done (err) {
			if (err) console.log(err);
			fs.writeFileSync("./stats.json",JSON.stringify(stats));
			dataReady=true;
			sema.emit("dataReady");
			console.timeEnd("Stats");
		}
	);
}

module.exports.getAllAccounts = getAllAccounts;
module.exports.getAccountInfo = getAccountInfo;
module.exports.getAccountRegister = getAccountRegister;
module.exports.getTransaction = getTransaction;
module.exports.saveTransaction = saveTransaction;
module.exports.getAccountByPath = getAccountByPath;
