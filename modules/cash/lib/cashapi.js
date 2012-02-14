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
var gunzip = require("gzbz2/gunzipstream");

function CashApi (ctx) {
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
				var accounts = [];
				cash_accounts.scan(function (err, key, acc) {
					if (err) cb1(err);
					if (key) {
						var id = acc.parent;
						if (id == parentId) {
							accounts.push(acc);
						}
					} else { 
						cb1(null, accounts);
					}
				}, true);
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

	function chPerm(token, cb) {
		async.parallel([
			async.apply(coreapi.checkPerm,token,["cash.view"])
		],cb);
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
					else if (val == "count") 
						res.count = accStats.count;
					else if (val == "path") 
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
				stats[accId] = {id:accId, value:0, count:0, trDateIndex:[]};
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

	function parseGnuCashXml(fileName, callback){
		// stream usage
		// takes the same options as the parser
		var saxStream = sax.createStream();

		saxStream.on("error", function (e) {
			// unhandled errors will throw, since this is a proper node
			// event emitter.
			console.error("error!", e)
			// clear the error
			this._parser.error = null
			this._parser.resume()
		})

		var tr;
		var acc;
		var split;
		var nodetext;
		var transactions = [];
		var accounts = [];
		var accMap = {};
		var path = [];
		var gluid = 1;
		var gluMap = {};
		saxStream.on("opentag", function (node) {
			path.push(node.name);
			if (node.name == "GNC:TRANSACTION") {
				tr = {splits:[]};
			} else if (node.name == "GNC:ACCOUNT") {
				acc = {};
			} else if (node.name == "TRN:SPLIT") {
				split = {};
			}
		})

		saxStream.on("text", function (text) {
			nodetext = text;
		})

		saxStream.on("closetag", function (name) {
			var node = {name:name};
			path.pop();
			if (name == "GNC:TRANSACTION") {
				transactions.push(tr);
			} else if (node.name == "TRN:DESCRIPTION") {
				tr.description = nodetext;
			} else if (node.name == "TRN:ID") {
				gluMap[nodetext]=gluid;
				tr.id = gluid; gluid++;
			} else if (node.name == "TS:DATE") {
				if (path[path.length-1]=="TRN:DATE-ENTERED") {
					tr.dateEntered = new Date(nodetext);
				}
			} else if (node.name == "ACT:NAME") {
				acc.name = nodetext;
			} else if (node.name == "ACT:TYPE") {
				acc.type = nodetext;
			} else if (node.name == "ACT:ID") {
				gluMap[nodetext]=gluid;
				acc.id = gluid; gluid++;
			} else if (node.name == "ACT:PARENT") {
				acc.parent = gluMap[nodetext];
			} else if (node.name == "CMDTY:ID") {
				if (path[path.length-1]=="ACT:COMMODITY") {
					acc.cmdtyId = nodetext;
				} else if (path[path.length-1]=="TRN:CURRENCY") {
					tr.currency = nodetext;
				}
			} else if (node.name == "GNC:ACCOUNT") {
				if (acc.type != "ROOT") {
					accounts.push (acc);
					accMap[acc.id]=acc;
				}
			} else if (node.name == "SPLIT:QUANTITY") {
				split.quantity = eval(nodetext);
			} if (node.name == "SPLIT:VALUE") {
				split.value = eval(nodetext);
			} if (node.name == "SPLIT:MEMO") {
				split.memo = nodetext;
			} if (node.name == "SPLIT:ID") {
				gluMap[nodetext]=gluid;
				split.id = gluid; gluid++;
			}  if (node.name == "SPLIT:ACCOUNT") {
				split.accountId = gluMap[nodetext];
			} else if (node.name == "TRN:SPLIT") {
				if (accMap[split.accountId]==null) {
					exit(0);
				}
				tr.splits.push(split);
			}
		})

		saxStream.on("end", function (node) {
			var ret = {tr:transactions, acc:accounts};
			process.nextTick(function(){
				callback(ret);
			});
		})
		
		var buffer = new Buffer(3);
		var fd = fs.openSync(fileName, 'r');
		fs.readSync(fd, buffer, 0, 3, 0);
		fs.closeSync(fd);

		if (buffer[0] == 31 && buffer[1] == 139 && buffer[2] == 8)
			gunzip.wrap(fileName, {encoding: "utf8"}).pipe(saxStream);
		else 
			fs.createReadStream(fileName).pipe(saxStream);
	}

this.getAllAccounts = getAllAccounts;
this.getAccountInfo = getAccountInfo;
this.getAccountRegister = getAccountRegister;
this.getTransaction = getTransaction;
this.saveTransaction = saveTransaction;
this.getAccountByPath = getAccountByPath;
this.getChildAccounts = getChildAccounts;
this.chPerm = chPerm;
this.importTransactions = importTransactions;
this.importAccaunts = importAccaunts;
this.parseGnuCashXml = parseGnuCashXml;
this.clearAccaunts = clearAccaunts;
this.clearTransaction = clearTransaction;
}

module.exports.init = function (ctx,cb) {
	var api = new CashApi(ctx);
	api.init(function (err) {
		if (err) return cb(err);
		cb(null, api);
	})
}
