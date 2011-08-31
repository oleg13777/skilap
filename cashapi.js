var fs = require("fs");
var _ = require('underscore');
var alfred = require('alfred');
var adb = null;
var cash_accounts = null;
var cash_transactions = null;

console.time("DB load");
alfred.open('/home/pushok/work/joker/data', function(err, db) {
	if (err) { throw err; }
	adb = db;
	adb.ensure("cash_accounts",{type:'cached_key_map',buffered:false},function(err,_cash_accounts) {
		if (err) { throw err; }
		cash_accounts = _cash_accounts;
		adb.ensure("cash_transactions",{type:'cached_key_map',buffered:false},function(err,_cash_transactions) {
			if (err) { throw err; }
			cash_transactions = _cash_transactions;
			console.timeEnd("DB load");
			calcStats();
		});
	});
}); 

var stats = {};

function getAllAccounts(cb) {
	var accounts = []
	cash_accounts.scan(function (err, key, acc) {
		if (key!=null) accounts.push(acc);
			else cb(accounts);
		}, true);
}

function getAccountByPath(path) {
	var newAccId = null;
	_.forEach(stats, function (accStat,key) {
		if (accStat.path == path)
			newAccId = key;
	});
	return newAccId;
}

function getAccountInfo(accId, details) {
	var res = {};
	var accStats = stats[accId];
	_.forEach(details, function (val) {
			if (val == "value")
				res.value = accStats.value;
			else if (val == "count") 
				res.count = accStats.count;
			else if (val == "path") 
				res.path = accStats.path;

	});
	return res;
}

function getAccountRegister(accId, offset, limit ) {
	var accStats = stats[accId];
	if (limit==null) {
		if (offset==0 || offset == null)
			return accStats.trDateIndex;
		else
			return accStats.trDateIndex.slice(offset, offset + limit);
	} else
		return accStats.trDateIndex.slice(offset, offset + limit);
}

function getTransaction(trId, cb) {
	cash_transactions.get(trId, function (err, tr) {
		cb(tr);
	})
}

function saveTransaction (tr) {
	if (tr.id!=null) {
		getTransaction(tr.id, function (trUpd) {
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
			cash_transactions.put(trUpd.id, trUpd, function (err) {
				calcStats();
			});
		});
	} else {
		// add new branch
	}
}

function calcStats() {
	console.time("Stats");
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
	// calc accounts stats
	cash_accounts.scan(function(err, k, acc) {
		if (k!=null) {
			stats[acc.id]={count:0,value:0,trDateIndex:[]};
			getAccPath(acc, function (path) { stats[acc.id].path = path; });
		} else {
			console.time("Test");
			cash_transactions.scan(function (err, k, tr) {
				if (k!=null) {
					tr.splits.forEach(function(split) {
						var accStats = stats[split.accountId];
						accStats.value+=split.value;
						accStats.count++;
						accStats.trDateIndex.push({id:tr.id,date:tr.dateEntered});
					});
				} else {
					console.timeEnd("Test");
					var c1 = _.size(stats)-2;
					_.forEach (stats, function (accStats, accId) {
						c1--;
						// sort by date
						accStats.trDateIndex = _.sortBy(accStats.trDateIndex,function (e) { return e.date; });
						var ballance = 0;
						var c2 =_.size(accStats.trDateIndex);
						_.forEach (accStats.trDateIndex, function (trs) {
							cash_transactions.get(trs.id, function (err, tr) {
								c2--;
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
								/* console.log({c1:c1, c2:c2}); */ if (c1==0 && c2==0) {
									console.timeEnd("Stats");
								}
							})
						});
					});
				}
			}, true);
		}
	},true);
}

module.exports.getAllAccounts = getAllAccounts;
module.exports.getAccountInfo = getAccountInfo;
module.exports.getAccountRegister = getAccountRegister;
module.exports.getTransaction = getTransaction;
module.exports.saveTransaction = saveTransaction;
module.exports.getAccountByPath = getAccountByPath;
