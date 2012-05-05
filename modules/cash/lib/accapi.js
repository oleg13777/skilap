var async = require('async');
var _ = require('underscore');
var extend = require('node.extend');
var SkilapError = require("skilap-utils").SkilapError;

module.exports.getAccount = function (token, id, cb) {
	var self = this;
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function get(cb) {
			self._cash_accounts.get(id, function (err, acc) {
				if (err) cb(err);
				cb(null, acc);
			},
			true);
		}], function end(err, result) {
			if (err) return cb(err);
			cb(null, result[1]);
		}
	)
}

module.exports.getAllAccounts = function (token, cb) {
	var self = this;
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function get(cb) {
			var accounts = [];
			self._cash_accounts.scan(function (err, key, acc) {
				if (err) cb(err);
				if (key) accounts.push(acc);
					else cb(null, accounts);
				},
			true);
		}], function end(err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
	)
}

module.exports.getChildAccounts = function(token, parentId, cb) {
	var self = this;
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function get(cb) {
			self._cash_accounts.find({parentId: {$eq: parentId}}).all(function (err, accounts) {
				if (err) return cb(err);
				cb(null, _(accounts).map(function (e) {return e.value;}));
			});
		}
		], function end(err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
	)
}

module.exports.getAccountByPath = function (token,path,cb) {		
	var self = this;
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function get(cb) {
			var newAccId = null;
			_.forEach(self._stats, function (accStat,key) {
				if (accStat.path == path)
					newAccId = key;
			});				
			if (newAccId==null)
				process.nextTick(function () { cb(new SkilapError("No such account","NO_SUCH_ACCOUNT")); });
			else 
				process.nextTick(function () { cb(null, newAccId); });
		}
		], function end(err, results) {
			if (err) return cb(err);
			self.getAccount(token,results[1],cb);
		}
	)
}

module.exports.getSpecialAccount = function (token,type,cmdty,cb) {
	var self = this;
	var name = "";
	if (type == "disballance")
		name = self._ctx.i18n(token, 'cash', 'Disballance') + "_" + cmdty.id;
	else
		return cb(new Error("Unsupported type"));
	
	self.getAccountByPath(token,name, function (err, acc) {
		if (err) {
			if (err.skilap && err.skilap.subject == "NO_SUCH_ACCOUNT") {
				// create one
				var acc = {"parentId":0,"cmdty":cmdty,"name":name,"type":"EQUITY"}
				return self.saveAccount(token,acc,cb);
			} else
				return cb(err); // unknown error
		}
		if (!_(acc.cmdty).isEqual(cmdty)) 
			return cb(new Error("Special account exist, but has wrong currency"))
		if (acc.type!="EQUITY") 
			return cb(new Error("Special account exist, but has wrong type"))			
		cb(null, acc)
	})
}

module.exports.getAccountInfo = function (token, accId, details, cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function (cb) {
			var res = {};
			var accStats = self._stats[accId];
			if (accStats==null)
				return cb(new Error("Invalid account Id: "+accId));
			res.id = accId;
			_.forEach(details, function (val) {
				if (val == "value")
					res.value = accStats.value;
				if (val == "count") 
					res.count = accStats.count;
				if (val == "path") 
					res.path = accStats.path;
			});				
			process.nextTick(function () {cb(null, res);});
		}], function (err, results) {
			if (err) return cb(err);
			cb(null,results[1]);
		}
	)
}

module.exports.deleteAccount = function (token, accId, options, cb){
	var self = this;
	async.series([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function processTransactions(cb) {
			var updates = [];
			self._cash_transactions.scan(function (err, key, tr) {
				if (err) return cb(err);
				if (key==null) {
					// scan done, propagate changes
					async.forEach(updates, function (u, cb) {
						self._cash_transactions.put(u.key, u.tr, cb);
					}, cb)
				} else {
					// collecte transactions that need to be altered
					_(tr.splits).forEach(function (split) {							
						if (split.accountId == accId) {
							if (options.newParent) {
								split.accountId = options.newParent;
								updates.push({key:key,tr:tr});
							} else
								updates.push({key:key,tr:null});
						}
					});
				}
			},true);
		},
		function processSubAccounts(cb){
			if (options.newSubParent) {
				self.getChildAccounts(token, accId, function(err, childs){
					if (err) return cb(err);
					async.forEach(childs, function(ch,cb) {
						ch.parentId = options.newSubParent;
						self._cash_accounts.put(ch.id, ch, cb);
					},cb);
				});
			} else {
				var childs = [];
				async.waterfall([
					function(cb){
						self._getAllChildsId(token, accId, childs, cb);
					},
					function (cb){
						var updates = [];
						self._cash_transactions.scan(function (err, key, tr) {
							if (err) return cb(err);
							if (key==null) {
								// scan done, propagate changes
								async.forEach(updates, function (u, cb) {
									self._cash_transactions.put(u.key, u.tr, cb);
								}, cb)
							} else {								
								// collect transactions to alter
								_(tr.splits).forEach(function (split) {
									if (_(childs).indexOf(split.accountId) > -1){
										if (options.newSubAccTrnParent) {
											split.accountId = options.newSubAccTrnParent;
											updates.push({key:key,tr:tr});											
										} else
											updates.push({key:key,tr:null});
									}
								})
							};
						},true);
					},
					function (cb) {
						async.forEach(childs, function (ch, cb) {
							self._cash_accounts.put(ch, null, cb);
						},cb);
					}
				],cb);
			}
		},
		function deleteAcc(cb) {
			self._cash_accounts.put(accId, null, cb);
		}
	], function (err) {
		if (err) return cb(err);
		self._calcStats(function () {})
		cb(null);
	});
}

module.exports._getAllChildsId = function (token, parentId, buffer, cb) {
	var self = this;
	async.waterfall([
		function (cb) { self.getChildAccounts(token, parentId,cb) },
		function(childs, cb){
			async.forEach(childs, function (ch, cb) {
				buffer.push(ch.id);
				self._getAllChildsId(token, ch.id, buffer, cb);
			}, cb);
		}
	],cb);
}

module.exports.clearAccounts = function (token, ids, cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function (cb) {
			self._cash_accounts.clear(cb);
		} 
	], function (err) {
		if (err) return cb(err);
		self._calcStats(function () {})
		cb(null);
	});
}

module.exports.importAccounts = function  (token, accounts, cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function (cb) {
			async.forEachSeries(accounts, function (e, cb) {
				self._cash_accounts.put(e.id,e,cb);
			},cb);
		}, 
	], function (err) {
		if (err) return cb(err);
		self._calcStats(function () {})
		cb(null);
	})
}

module.exports.getDefaultAccounts = function (token, cb){
	var self = this;
	var ctx = self._ctx;
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
	async.forEachSeries(accounts, function(acc, cb) {
		self._ctx.getUniqueId(function(err, uniqId) {
			ret.push({parentId:0, cmdty:cmdty, name:acc.name, id:uniqId, type:acc.type});
			
			async.forEachSeries(acc.ch, function(name, cb) {
				self._ctx.getUniqueId(function(err, id) {
					ret.push({parentId:uniqId, cmdty:cmdty, name:name, id:id, type:acc.type});
					cb();
				});
			}, cb);
		});
	}, function(err) {
		cb(err, ret);
	});
}

module.exports.restoreToDefaults = function (token, cb){
	var self = this;
	async.waterfall([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function (results ,cb) {
			self._cash_prices.clear(cb);
		},
		function (cb) {
			self._cash_transactions.clear(cb);
		},
		function (cb){
			self._cash_accounts.clear(cb);
		},
		function (cb) {
			self.getDefaultAccounts(token, cb);
		},
		function (accounts, cb) {
			async.forEachSeries(accounts, function (e, cb) {
				self._cash_accounts.put(e.id,e,cb);
			},cb);
		}
	], function (err) {
		if (err) return cb(err);
		self._calcStats(function () {});
		cb(null);
	});
}

module.exports.getAssetsTypes = function (cb) {
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

module.exports.saveAccount = function (token, account, cb) {
	var self = this;
	async.waterfall ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function (t, cb) {
			if (account.id)
				cb(null, account.id);
			else
				self._ctx.getUniqueId(cb);
		},
		function get(id, cb) {
			account.id = id;
			self._cash_accounts.put(account.id, account, cb);
		}], function end(err, result) {
			if (err) return cb(err);
			self._calcStats(function () {})
			cb(null, account);
		}
	)
}
