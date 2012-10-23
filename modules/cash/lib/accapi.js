var async = require('async');
var safe = require('safe');
var _ = require('underscore');
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
			self._cash_accounts.get(id, cb);
		}], safe.sure_result(cb, function (result) {
			return result[1];
		})
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
		}], safe.sure_result(cb, function (results) {
			return results[1];
		})
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
			self._cash_accounts.find({parentId: {$eq: parentId}}).all(safe.sure(cb, function (accounts) {
				cb(null, _(accounts).map(function (e) {return e.value;}));
			}));
		}
		], safe.sure_result(cb,function (results) {
			return results[1];
		})
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
		function find(cb) {
			var newAccId = null;
			var stats = self._stats;
			var accStats = _.find(stats, function (e) { return e.path == path; });
			newAccId = accStats.id;
			if (newAccId==null)
				return cb(new SkilapError("No such account","NO_SUCH_ACCOUNT"));
			self.getAccount(token,newAccId,cb);
		}
		], safe.sure_result(cb,function (results) {
			return results[1];
		})
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
	var accInfo = null;
	var accStats = null
	var assInfo = null;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function (cb) {
			accStats = self._stats[accId];
			if (accStats==null)
				return cb(new Error("Invalid account Id: "+accId));
			cb();
		},
		function (cb) {
			if (!_(details).include("verbs"))
				return cb();
			self.getAssetsTypes(token, safe.sure(cb,function (assets) {
				accInfo = _(assets).find(function (e) { return e.value == accStats.type; } );
				if (accInfo==null)
					return cb(new Error("Wrong account type"));
				cb();
			}))
		},
		function (cb) {
			if (!_(details).include("act"))
				return cb();
			self.getAssetInfo(token,accStats.type, safe.sure_result(cb,function (info) {
				assInfo = info;
			}))
		},		
		safe.trap(function (cb) {
			var res = {};
			res.id = accId;
			_.forEach(details, function (val) {
				switch(val) {
					case 'value':
						res.value = accStats.value;
						break;
					case 'count':
						res.count = accStats.count;
						break;
					case 'path':
						res.path = accStats.path;
						break;
					case 'verbs':
						res.verbs = {};
						res.verbs.recv = accInfo.recv;
						res.verbs.send = accInfo.send;
						break;
					case 'act':
						res.act = assInfo.act
						break;
					case 'level':
						res.level = accStats.level;
					break;
				}
			});				
			cb(null, res);
		})], safe.sure_result(cb, function (results) {
			return results[4];
		})
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
			self._cash_transactions.scan(safe.trap_sure(cb, function (key, tr) {
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
			},true));
		},
		function processSubAccounts(cb){
			if (options.newSubParent) {
				self.getChildAccounts(token, accId, safe.trap_sure(cb,function(childs){
					async.forEach(childs, function(ch,cb) {
						ch.parentId = options.newSubParent;
						self._cash_accounts.put(ch.id, ch, cb);
					},cb);
				}));
			} else {
				var childs = [];
				async.series([
					function(cb){
						self._getAllChildsId(token, accId, childs, cb);
					},
					function (cb){
						var updates = [];
						self._cash_transactions.scan(safe.trap_sure(cb,function (key, tr) {
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
						},true));
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
	], self.sure_result(cb, function () {
		self._calcStats(function () {})
	}));
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
	], safe.sure_result(cb, function () {
		self._calcStats(function () {})
	}));
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
	], safe.sure_result(cb,function () {
		self._calcStats(function () {})
	}))
}

module.exports.getDefaultAccounts = function (token, cmdty, cb){
	var self = this;
	var ctx = self._ctx;
	var accounts = [
		{name:ctx.i18n(token, 'cash', 'Cash'), type:'CASH', ch:[ctx.i18n(token, 'cash', 'My wallet')]},
		{name:ctx.i18n(token, 'cash', 'Bank'), type:'BANK', ch:[ctx.i18n(token, 'cash', 'My account')]},
		{name:ctx.i18n(token, 'cash', 'Credit Cards'), type:'CREDIT', ch:[ctx.i18n(token, 'cash', 'My card')]},
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
	async.forEachSeries(accounts, function(acc, cb) {
		self._ctx.getUniqueId(safe.trap_sure(cb, function (uniqId) {
			ret.push({parentId:0, cmdty:cmdty, name:acc.name, id:uniqId, type:acc.type});
			
			async.forEachSeries(acc.ch, function(name, cb) {
				self._ctx.getUniqueId(safe.trap_sure_result(cb,function(id) {
					ret.push({parentId:uniqId, cmdty:cmdty, name:name, id:id, type:acc.type});
				}));
			}, cb);
		}));
	}, safe.sure_result(cb, function() {
		return ret;
	}));
}

module.exports.restoreToDefaults = function (token, cmdty, type, cb){
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
		function (cb){
			self._cash_settings.clear(cb);
		},
		function (cb) {
			if (type == "default")
				self.getDefaultAccounts(token, cmdty, cb);
			else 
				cb(null, []);
		},
		function (accounts, cb) {
			async.forEachSeries(accounts, function (e, cb) {
				self._cash_accounts.put(e.id,e,cb);
			},cb);
		},
		function (cb) {
			self.saveSettings(token,"currency",cmdty,cb);
		}
	], safe.sure_result(cb, function () {
		self._calcStats(function () {});
	}));
}

module.exports.getAssetsTypes = function (token,cb) {
	var self = this;	
	var types = [
			{value:"BANK", name:self._ctx.i18n(token, 'cash', 'Bank'),act:1,recv:self._ctx.i18n(token, 'cash', 'Deposited'),send:self._ctx.i18n(token, 'cash', 'Withdrawal')},
			{value:"CASH", name:self._ctx.i18n(token, 'cash', 'Cash'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"ASSET", name:self._ctx.i18n(token, 'cash', 'Asset'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"CREDIT", name:self._ctx.i18n(token, 'cash', 'Credit card'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"LIABILITY", name:self._ctx.i18n(token, 'cash', 'Liability'),act:-1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"STOCK", name:self._ctx.i18n(token, 'cash', 'Stock'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"MUTUAL", name:self._ctx.i18n(token, 'cash', 'Mutual found'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"CURENCY", name:self._ctx.i18n(token, 'cash', 'Curency'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"INCOME", name:self._ctx.i18n(token, 'cash', 'Income'),act:-1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"EXPENSE", name:self._ctx.i18n(token, 'cash', 'Expense'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"EQUITY", name:self._ctx.i18n(token, 'cash', 'Equity'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"RECIEVABLE", name:self._ctx.i18n(token, 'cash', 'Recievable'),act:-1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')},
			{value:"PAYABLE", name:self._ctx.i18n(token, 'cash', 'Payable'),act:1,recv:self._ctx.i18n(token, 'cash', 'Received'),send:self._ctx.i18n(token, 'cash', 'Spent')}
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
		}], safe.sure_result(cb,function (result) {
			self._calcStats(function () {})
			return account;
		})
	)
}

module.exports.getAllCurrencies = function(token,cb){
	var self = this;
	async.waterfall ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
				function (cb) { self._waitForData(cb); }
			],
			safe.sure(cb, function(){ cb(); }));			
		}, 		
		function(cb){
			async.parallel({
				curr:function (cb) {				
					self._ctx.i18n_getCurrencies(token, cb);
				},
				usedCurr:function (cb) {
					var usedCurrencies = {};					
					self._cash_accounts.scan(safe.trap_sure(cb, function (key, acc) {						
						if (key){
							usedCurrencies[acc.cmdty.id] = acc.cmdty;
						}
						else cb(null, usedCurrencies);
					}),
					true);							
				}
			},function (err, result) {																	
				cb(err, result.curr,result.usedCurr);
			});			
		},
		function(currencies,usedCurrencies,cb){			
			_.forEach(currencies,function(curr){				
				curr.used = _.has(usedCurrencies, curr.iso) ? 1 : 0;				
			});
			cb(null,currencies);
		}
	], cb
	);
	
}

module.exports.createAccountsTree = function(accounts){
	var oAccounts = _.reduce(accounts,function(memo,item){		
		memo[item.id] = _.clone(item);
		memo[item.id].childs=[];
		return memo;
	},{});
	
	_.forEach(_.keys(oAccounts),function(key){		
		if(oAccounts[key].parentId != 0){			
			oAccounts[oAccounts[key].parentId].childs.push(oAccounts[key]);
		}		
	});	
	return _.filter(_.values(oAccounts),function(item){
		return (item.parentId == 0 && !item.hidden);
	});
}
