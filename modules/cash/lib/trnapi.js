var async = require('async');
var _ = require('underscore');
var extend = require('node.extend');

module.exports.getAccountRegister = function (token,accId, offset, limit, cb ) {
	var self = this;
	async.series ([
		function (cb1) {
			async.parallel([
				async.apply(self._coreapi.checkPerm,token,["cash.view"]),
				function (cb) {self._waitForData(cb)}
			],cb1);
		}, 
		function (cb1) {
			var accStats = self._stats[accId];
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

module.exports.getTransaction = function (token, trId, cb) {
	var self = this;
	async.series ([
		function (cb1) {
			async.parallel([
				async.apply(self._coreapi.checkPerm,token,["cash.view"]),
				function (cb) {self._waitForData(cb)}
			],cb1);
		}, 
		function (cb1) {
			self._cash_transactions.get(trId, cb1);
		}
	], function (err, results) {
		if (err) return cb(err);
		cb(null,results[1]);
	})
}

module.exports.saveTransaction = function (token,tr,cb) {		
	var self = this;
	var trn={};
	async.series ([
		// wait for data lock
		function (cb) {
			async.parallel([
				async.apply(self._coreapi.checkPerm,token,["cash.edit"]),
				function (cb) {self._waitForData(cb)}
			],cb);
		}, 
		// fix current user id
		function (cb) {
			self._coreapi.getUser(token,function (err, user) {
				if (err) return cb(err);
				tr.uid = user.id;
				cb()
			})
		},				
		// update existing or just get new id
		function (cb) {				
			if (tr.id) {
				self._cash_transactions.get(tr.id,function (err, tr_) {
					if (err) return cb(err);
					trn = tr_;									
					extend(trn,tr);					
					cb()
				});		
			} else {
				self._ctx.getUniqueId(function (err, id) {
					if (err) return cb(err);
					trn=tr;
					trn.id = id;
					cb()
				})
			}
		}, 
		// obtain ids for new splits
		function (cb) {
			async.forEachSeries(trn.splits,function(split,cb){
				if(split.id) return cb();
				self._ctx.getUniqueId(function (err, id) {
					if (err) return cb(err);
					split.id = id;
					cb();
				});
			},cb);
		},
		// finally save or update
		function(cb){
			self._cash_transactions.put(trn.id, trn, cb);
		}			
	], function (err) {
		if (err) return cb(err);
		self._calcStats(function () {});
		cb(null);
	})
}

module.exports.getTransactionInDateRange = function (token, range, cb) {
	var self = this;
	var res = [];
	async.series([
		function start(cb1) {
			async.parallel([
				async.apply(self._coreapi.checkPerm,token,["cash.view"]),
				function (cb) {self._waitForData(cb)}
			],cb1);
		}, 
		function (cb1) {
			var stream = self._cash_transactions.find({datePosted: {$range: [range[0].valueOf(),range[1].valueOf(),range[2],range[3]]}}).stream();
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

module.exports.clearTransaction = function (token, ids, cb) {
	var self = this;
	if (ids == null) {
		async.series ([
			function (cb1) {
				async.parallel([
					async.apply(self._coreapi.checkPerm,token,["cash.edit"]),
					function (cb) {self._waitForData(cb)}
				],cb1);
			},
			function (cb1) {
				self._cash_transactions.clear(cb1);
			} 
		], function (err) {
			if (err) return cb(err);
			self._calcStats(function () {})
			cb(null);
		});
	} else {
		cb(null);
	}
}

module.exports.importTransactions = function (token, transactions, cb) {
	var self = this;
	var uid = null;
	async.series ([
		function (cb1) {
			async.parallel([
				async.apply(self._coreapi.checkPerm,token,["cash.edit"]),
				function (cb) {self._waitForData(cb)}
			],cb1);
		},
		function (cb) {
			self._coreapi.getUser(token,function (err, user) {
				if (err) return cb(err);
				uid = user.id;
				cb()
			})
		},					
		function (cb) {
			async.forEach(transactions, function (e,cb) {
				e.uid = uid;
				self._cash_transactions.put(e.id,e,cb);
			},cb);
		}, 
	], function (err) {
		if (err) return cb(err);
		self._calcStats(function () {})
		cb(null);
	})
}
