var async = require('async');
var safe = require('safe');
var _ = require('underscore');

module.exports.getAccountRegister = function (token, accId, offset, limit, cb ) {
	var self = this;
	async.waterfall ([
		function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
		function (cb) {
			var order = (limit < 0)?-1:1;
			var cursor = self._cash_register.find({'accId': new self._ctx.ObjectID(accId)}).sort( { 'order': order } );
			if (offset)
				cursor.skip(offset);
			if (limit)
				cursor.limit(limit);
			cursor.toArray(safe.sure_result(cb, function(data) {
				if (data && limit < 0)
					data.reverse();
				return _.map(data, function(d) { d._id = d.trId; return d;});
			}));
		},
		function (data, cb) {
			async.eachSeries(data, function(d, cb) {
				self._cash_transactions.findOne({'_id': d.trId}, safe.sure_result(cb, function(tr) {
					var recv = [];
					var send = null;
					tr.splits.forEach(function(split) {
						if (split.accountId == accId)
							send = split;
						else
							recv.push(split);
					});
					d.recv = recv; d.send = send;
				}));
			}, function (err) {
				cb(null, data);
			});
		}], safe.sure(cb,function (result) {
			cb(null,result);
		})
	);
};

module.exports.getTransaction = function (token, trId, cb) {
	var self = this;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
		function (cb) {	self._cash_transactions.findOne({'_id': trId}, cb); }
	], safe.sure(cb, function (results) {
		cb(null,results[1]);
	}));
};

module.exports.updateTransactionExcangeRate = function (token, trId, newRate, cb) {
	var self = this;
	var tr = null;
	var updated = false;
	var accIds = [];
	var accs = {};
	var accInfoIds = [];
	
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
		function (cb) {	
			self._cash_transactions.findOne({'_id': new self._ctx.ObjectID(trId)}, safe.sure_result(cb, function (transaction) {
				tr = transaction;
			})); 
		}, 
		function (cb) {
			self._cash_accounts.find({'_id': {$in: _.pluck(tr.splits, 'accountId')}}).toArray(safe.sure_result(cb, function (accounts) {
				_.each(accounts, function(acc) {
					accs[acc._id] = acc;
				});
			}));
		}, 
		function (cb) {	
			_(tr.splits).forEach(function (split) {
				if (accs[split.accountId].cmdty.id != tr.currency.id) {
					split.quantity = split.value*parseFloat(newRate);
					accIds.push(split.accountId);
					updated = true;
				}
			});
			cb();
		}, 
		function (cb) {
			if (updated)
				self._cash_transactions.findAndModify({_id: tr._id}, [], tr, { upsert: true, w: 1 }, cb);
			else cb();
		}, 
		function (cb) {
			if (updated)
				self._calcStatsPartial(_.values(accIds), tr.datePosted, cb);
			else cb();
		} 
	], safe.sure(cb, function () {
		cb(null, tr);
	}));
};

module.exports.saveTransaction = function (token,tr,leadAccId,cb) {
	var debug = false;
	if (debug) { console.log("Received"); console.log(arguments); console.log(arguments[1].splits); }
	if (_.isFunction(leadAccId)) {
		cb = leadAccId;
		leadAccId = null;
	}
	var self = this;
	var trn={};
	var leadAcc = null;
	var oldTrn = null;
	var accIds = {};
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
		// get lead account, if any
		function (cb) {
			if (leadAccId==null) {
				if (tr.splits.legth>0) // if not provided assume lead is first split
					leadAccId = tr.splits[0].accountId;
				else
					return cb();
			}
			self.getAccount(token,leadAccId,safe.sure_result(cb, function(acc) {
				leadAcc = acc;
			}));
		},
		// fix current user id
		function (cb) {
			self._coreapi.getUser(token,safe.sure_result(cb, function (user) {
				tr.uid = user._id;
			}));
		},
		// sync with existing transaction or get new id for insert
		// detect also split modify status
		function (cb) {
			if (debug) { console.log("Before sync on update"); console.log(tr); }
			if (tr._id) {
				self._cash_transactions.findOne({'_id': new self._ctx.ObjectID(tr._id)}, safe.trap_sure_result(cb,function (tr_) {
					_(tr_.splits).forEach(function (split) {
						accIds[split.accountId] = split.accountId;
					});
					// get all the missing properties from existing transaction except splits
					var fprops = _.without(_(tr_).keys(),"splits");
					var ftr = _.pick(tr_,fprops);
					trn = _(tr).defaults(ftr);
					trn._id = new self._ctx.ObjectID(tr._id);
					// now we have to adjust splits
					_(trn.splits).forEach(function (split) {
						split.isModified = true;
						split.isNew = true;
						var oldSplit = _(tr_.splits).find(function (split2) { return split2._id==split._id; });
						if (!oldSplit) return;
						split.isNew = false;
						// if both new values are defined and not the same as previous nothing to do
						if (!_.isUndefined(split.value) && split.value!= oldSplit.value && !_.isUndefined(split.quantity) && split.quantity != oldSplit.quantity)
							return; // changed both split and quantity, nothing to do
						if (!_.isUndefined(split.value) && split.value != oldSplit.value) {
							// changed value, adjust quantity
							var part = oldSplit.value/split.value;
							if (part==0) {
								if (!_.isUndefined(split.quantity))
									delete split.quantity;
							}
							else {
								split.quantity = oldSplit.quantity/part;
							}
						} else if (!_.isUndefined(split.quantity) && split.quantity != oldSplit.quantity) {
							// changed quantity, adjust value
							var part = oldSplit.quantity/split.quantity;
							if (part==0){
								if (!_.isUndefined(split.value))
									delete split.value;
							}
							else {
								split.value = oldSplit.value/part;
							}
						} else
							split.isModified = false;
					});
				}));
			} else {
				trn=tr;
				trn._id = new self._ctx.ObjectID();
				cb();
			}
		},
		// ensue that transaction has currency, this is required
		function (cb) {
			if (trn.currency) return cb();
			if (!trn.currency && !(leadAcc && leadAcc.cmdty.space=="ISO4217") )
				return cb(new Error("Transaction should have base currency"));
			trn.currency=_(leadAcc.cmdty).clone();
			cb();
		},
		// ensure that all splits have valid account ids
		function (cb) {
			if (debug) { console.log("Before account ids verififcation"); console.log(trn); }
			var splits = trn.splits;
			trn.splits = [];
			async.forEachSeries(splits,function(spl,cb) {
				// with lead account we can use conversion
				self.getAccount(token,spl.accountId,function (err, splitAccount) {
					if (!err && splitAccount) 
						trn.splits.push(spl)
					cb();
				})
			},cb)
		},
		// ensure that slits has valid quantity and values
		function (cb) {
			if (debug) { console.log("Before value quantity restore"); console.log(trn); }
			async.forEachSeries(trn.splits,function(spl,cb) {
				// with lead account we can use conversion
				self.getAccount(token,spl.accountId,safe.trap_sure(cb,function (splitAccount) {
					// if split cmdty equals to transaction currency then both value
					// and quantity should be the same, quantity takes preference
					spl.cmdty = splitAccount.cmdty;
					if (_(splitAccount.cmdty).isEqual(trn.currency)) {
						var val = 0;
						if (!_.isUndefined(spl.quantity))
							val = spl.quantity;
						else if (!_.isUndefined(spl.value))
							val = spl.value;
						spl.value = spl.quantity = val;
						return cb();
					}

					// if split cmdty not equal to trn currency and both values defined, nothing to do
					// except save rate
					if (!_.isUndefined(spl.value) && spl.value != 0 && !_.isUndefined(spl.quantity) && spl.quantity != 0){
						if (spl.quantity > 0)
							var rate = (spl.quantity/spl.value).toFixed(5);
						else
							var rate = (spl.value/spl.quantity).toFixed(5);
						if (tr.saveRate) {
							if (spl.quantity > 0)
								var price = {cmdty: trn.currency, currency: splitAccount.cmdty, date: trn.dateEntered, value: rate, source: "transaction"};
							else
								var price = {currency: trn.currency, cmdty: splitAccount.cmdty, date: trn.dateEntered, value: rate, source: "transaction"};
							self.savePrice(token, price, cb);
						} else cb();
					}
					else{
						// otherwise lets try to fill missing value
						var irate = 1;
						// value is known
						self.getCmdtyPrice(token, trn.currency, splitAccount.cmdty, null, null, function(err,rate){
							if(err && !(err.data && err.data.subject == "UnknownRate")) {
								return cb(err);
							}

							if (!err && rate!=0)
								irate = rate;

							// depending on which part are known, restore another part
							if (spl.value)
								spl.quantity = spl.value*irate;
							else
								spl.value = spl.quantity/irate;

							cb();
						});
					}
				}));
			}, cb);
		},
		// avoid dis-balance
		safe.trap(function (cb) {
			if (debug) { console.log("Before dis-balance"); console.log(trn); }
			// check what we have
			var value=0; var leadSplit = false; var nonEditedSplit = false;
			_(trn.splits).forEach(function (split) {
				if (leadAcc && split.accountId==leadAcc._id && split.value != 0)
					leadSplit = split;
				if (split.isModified==false)
					nonEditedSplit = split;
				value += split.value;
			});
			// simplest, put dis-ballance to missing lead split
			if (leadAcc && !leadSplit) {
				trn.splits.push({value:-1*value, quantity:-1*value, accountId:leadAcc._id, _id:new self._ctx.ObjectID(), description:""});
				return cb();
			}  // when we have two splits we can compensate thru non modified one
			else if (trn.splits.length==2 && nonEditedSplit) {
				var newVal = nonEditedSplit.value-value;
				if (newVal==0) {
					nonEditedSplit.value = leadSplit.quantity = 0;
				} else {
					var part = nonEditedSplit.value/newVal;
					if (part==0) part = 1;
					nonEditedSplit.value=newVal;
					nonEditedSplit.quantity/=part;
				}
				cb();
			} else {
				// TODO: currently we didn't ballance values less than 0.01
				// bad exact minimal value must depend on currency settings
				if (Math.abs(value)<0.01) return cb();
				
				// overwise just add disballance account
				self.getSpecialAccount(token,"disballance",trn.currency, safe.sure_result(cb, function(acc) {
					trn.splits.push({value:-1*value,quantity:-1*value,accountId:acc._id,_id:new self._ctx.ObjectID(),description:""});
				}));
			}
		}),
		// collapse splits of same accounts
		safe.trap(function (cb) {
			if (debug) { console.log("Before collapse"); console.log(trn); }
			var newSplits = [];
			var mgroups = {};
			// reduce all splits to reducable groups (same accountId+description)
			_(trn.splits).reduce(function (ctx, value) {
				var key = "_"+value.accountId+value.description;
				key = key.replace(/^\s*|\s*$/g, ''); // trim
				if (!ctx[key])
					ctx[key]=[];
				ctx[key].push(value);
				return ctx;
			},mgroups);
			// merge reducable groups
			_.forEach(_(mgroups).values(), function (splits) {
				var newSplit = _(splits[0]).clone();
				for (var i=1; i<splits.length; i++) {
					var e = splits[i];
					newSplit.value+=e.value;
					newSplit.quantity+=e.quantity;
				}
				newSplits.push(newSplit);
			});
			// filter splits with zero values
			var meaningSplits = _(newSplits).filter(function (s) { return s.value!=0; });
			// check if we have some splits at the end, if not restore split from leading account
			// when possible
			if (meaningSplits.length==0 && leadAcc) {
				var lSplit = _(newSplits).find(function (s) {return s._id = leadAcc._id;} );
				if (lSplit)	meaningSplits.push(lSplit);
			}
			trn.splits = meaningSplits;
			cb();
		}),
		// obtain ids for new splits
		function (cb) {
			if (debug) { console.log("Before split ids"); console.log(trn);	}
			async.forEachSeries(trn.splits,function(split,cb){
				if (split.accountId) split.accountId = new self._ctx.ObjectID(split.accountId.toString());
				if(split._id) return cb();
				split._id = new self._ctx.ObjectID();
				cb();
			},cb);
		},
		// final verification
		safe.trap(function (cb) {
			if (!(_.isArray(trn.splits) && trn.splits.length>0))
				return cb(new Error("Transaction should have splits"));
			if (!(_.isObject(trn.currency)))
				return cb(new Error("Transaction should have currency"));
			if (_.isUndefined(trn._id))
				return cb(new Error("Transaction should have id"));
			if (!(_.isDate(trn.datePosted) || !_.isNaN(Date.parse(trn.datePosted))))
				return cb(new Error("Transaction should have date posted"));
			if (!(_.isDate(trn.dateEntered) || !_.isNaN(Date.parse(trn.dateEntered))))
				return cb(new Error("Transaction should have date entered"));
			// check splits
			var fails = _(trn.splits).find(function (s) {
				if (_.isUndefined(s._id)) {
					cb(new Error("Every split should have an id"));
					return true;
				}
				if (_.isUndefined(s.value)) {
					cb(new Error("Every split should have value"));
					return true;
				}
				if (_.isUndefined(s.quantity)) {
					cb(new Error("Every split should have quantity"));
					return true;
				}
				if (_.isUndefined(s.accountId)) {
					cb(new Error("Every split should have accountId"));
					return true;
				}
			});
			if (!fails)
				cb();
		}),
		// sanify transaction
		safe.trap(function (cb) {
			var str = _(trn).pick(["_id","datePosted","dateEntered","currency","splits","description","num","uid"]);
			for (var i=0; i<str.splits.length; i++) {
				var split = _(str.splits[i]).pick("_id","value","quantity","rstate","description","accountId","num");
				str.splits[i]= split;
			}
			trn = str;
			cb();
		}),
		// finally save or update
		function(cb){
			trn.datePosted = new Date(trn.datePosted);
			trn.dateEntered = new Date(trn.dateEntered);
			if (debug) { console.log("Before save"); console.log(trn);	}
			self._cash_transactions.findAndModify({_id: trn._id}, [], trn, { upsert: true, w: 1 }, safe.sure_result(cb, function(obj) {
				if (!obj || _.isEmpty(obj))
					oldTrn = trn;
				else
					oldTrn = obj;
			}));
		}
	], safe.sure(cb,function () {
		if (debug) { console.log("Before stats"); console.log(trn);	}
		_(trn.splits).forEach(function (split) {
			accIds[split.accountId] = split.accountId;
		});
		self._calcStatsPartial(_.values(accIds), _.min([trn.datePosted, oldTrn.datePosted]), function () {cb(null, trn);});
	}));
};

module.exports.getTransactionsInDateRange = function (token, range, cb) {
	var self = this;
	async.series ([
	               function (cb) { self._coreapi.checkPerm(token,["cash.view"],cb); },
	               safe.trap(function (cb) {
	            	   var startDate = _(range[0]).isDate() ? range[0] : new Date(range[0]);
	            	   var endDate = _(range[1]).isDate() ? range[1] : new Date(range[1]);
	            	   self._cash_transactions.find({datePosted: {$gt: startDate, $lt: endDate}}).toArray(cb);
	               })],
	               safe.sure(cb, function (res) {
	            	   process.nextTick(function () {
	            		   cb(null, res[1]);
	            	   });
	               })
	);
};

module.exports.clearTransactions = function (token, ids, cb) {
	var self = this;
	self._coreapi.checkPerm(token,["cash.edit"],safe.trap_sure(cb, function () {
		if (ids == null) {
			self._cash_transactions.remove(safe.sure(cb, function () {
				self._calcStats(cb);
			}))
		} else if (_.isArray(ids)) {
			self._cash_transactions.remove({'_id': {$in: _.map(ids, function(id) { return new self._ctx.ObjectID(id); })}}, safe.sure(cb, function () {
				self._calcStats(cb);
			}))
		} else { // now assuming single id
			self._cash_transactions.findAndRemove({'_id': new self._ctx.ObjectID(ids)},{_id:1}, safe.sure(cb, function (trn) {
				if (!trn) return cb(); // nothing deleted, nothing todo
				var accIds = {};
				_.each(trn.splits, function (split) {
					accIds[split.accountId] = split.accountId;
				});
				self._calcStatsPartial(_.values(accIds), trn.datePosted, cb);
			}))
		}
	}))
};

module.exports.importTransactions = function (token, transactions, cb) {
	var self = this;
	var uid = null;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
		function (cb) {
			self._coreapi.getUser(token,safe.sure_result(cb, function (user) {
				uid = user._id;
			}));
		},
		function (cb) {
			async.forEach(transactions, function (e,cb) {
				e.uid = uid;
				self._cash_transactions.save(e, cb);
			},cb);
		},
	], safe.sure_result(cb, function () {
	}));
};
