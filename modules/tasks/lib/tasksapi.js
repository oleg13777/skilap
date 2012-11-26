/**
 * Core API
 */
var _ = require('underscore');
var alfred = require('alfred');
var async = require('async');
var events = require("events");
var safe = require('safe');

function TasksApi (ctx) {
	var self = this;
	this._ctx = ctx;
	this._tasks = null;
	this._dataReady = false;
	this._dataInCalc = false;
	this._lastAccess = new Date();
	this._stats = {};
	this._waitQueue = [];
	this._coreapi;
	
	// set index cleanup 
	setInterval(function () {
		if (self._dataReady==false) return; // already sleep
		var d = new Date();
		if ((d.valueOf()-self._lastAccess.valueOf())>60*1000) {
			self._stats = {};
			console.log("dataCleared");
			self._dataInCalc = self._dataReady = false;
		}
	}, 60*1000);
	
	// set index cleanup 
	setInterval(function () {
		console.log("Wait queue: " + self._waitQueue.length)
	}, 60*1000);	
}

TasksApi.prototype.getTask = function (token, id, cb) {
	var self = this;
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["task.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function get(cb) {
			self._tasks.get(id, cb);
		}], safe.sure_result(cb, function (result) {
			return result[1];
		})
	)
}

TasksApi.prototype.getAllTasks = function (token, cb) {
	var self = this;
	async.series ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["task.view"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function get(cb) {
			var accounts = [];
			self._tasks.scan(function (err, key, acc) {
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

TasksApi.prototype.saveTask = function (token, task, cb) {
	var self = this;
	async.waterfall ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["task.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function (t, cb) {
			if (task.id) {
				cb(null, task.id);
			}
			else {
				task.dt = new Date();
				self._ctx.getUniqueId(cb);
			}
		},
		function get(id, cb) {
			task.id = id;
			self._tasks.put(task.id, task, cb);
		}], safe.sure_result(cb,function (result) {
			return task;
		})
	)
}

TasksApi.prototype.resolveTask = function (token, id, cb) {
	var self = this;
	async.waterfall ([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["task.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		},
		function (task, cb) {
			self.getTask(token, id, cb);
		},
		function (task, cb) {
			task.status = 'resolved';
			self._tasks.put(task.id, task, cb);
		}], safe.sure_result(cb,function (result) {
			return true;
		})
	)
}

TasksApi.prototype.deleteTask = function (token, id, cb){
	var self = this;
	async.series([
		function start(cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["task.edit"],cb) },
				function (cb) { self._waitForData(cb) }
			],cb);
		}, 
		function deleteAcc(cb) {
			self._tasks.put(id, null, cb);
		}
	], cb);
}

TasksApi.prototype._waitForData = function (cb) {
	this._lastAccess = new Date();
	if (this._dataReady) return cb(null)
		else this._waitQueue.push(cb);
	if (!this._dataInCalc) {
		this._calcStats(function () {});
	}
}

TasksApi.prototype._lockData = function (cb) {
	if (!this._dataReady)
		return cb(new Error("Can't lock unready data"))
	this._dataInCalc = true;
	this._dataReady = false;
	return cb();
}

TasksApi.prototype._unLockData = function (cb) {
	if (!this._dataInCalc) {
		this._calcStats(function () {});
	}
	return cb();
}

TasksApi.prototype._loadData = function (cb) {
	var self = this;
	var adb;
	async.series([
		function openDb(cb) {
			self._ctx.getDB(function (err, _adb) {
				if (err) return cb(err);
				adb = _adb;
				cb();
			})
		},
		function openCollections(cb) {
			async.parallel([
				function accounts (cb) {
					console.log("open collections")						
					adb.ensure("tasks_tasks",{type:'cached_key_map',buffered:false},cb);
				},
			], function (err, results) {
				if (err) return cb(err)
				self._tasks = results[0];
				cb();
			})
		}
	],cb)
};

TasksApi.prototype._calcStats = function _calcStats(cb) {
	var self = this;
	self._dataReady=true;
	self._dataInCalc=false;
	self._pumpWaitQueue();
	cb();
}


TasksApi.prototype.init = function (cb) {
	var self = this;
	async.parallel([
		function (cb) {
			self._ctx.getModule("core",function (err, module) {
				if (err) return cb1(err);
				self._coreapi = module.api;
				cb();
			})
		},
		function (cb) {
			self._loadData(cb)
		}], 
	cb);
}

var assetInfo = {
}

TasksApi.prototype.getAssetInfo = function (token, asset, cb) {
	var info = assetInfo[asset];
	if (info==null)
		return cb(new Error("Invalid asset type"));
	cb(null,info);
}

TasksApi.prototype._pumpWaitQueue = function () {
	var self = this;
	// peek the first worker
	if (self._dataReady && self._waitQueue.length) {
		var wcb = self._waitQueue.shift();
		wcb(null);
	}
	// if we not get locked by first worker and still something in queue do it
	if (self._dataReady && self._waitQueue.length) {
		process.nextTick(function () {
			self._pumpWaitQueue()
		})
	}
}

module.exports.init = function (ctx,cb) {
	var api = new TasksApi(ctx);
	api.init(function (err) {
		if (err) return cb(err);
		cb(null, api);
	})
}

