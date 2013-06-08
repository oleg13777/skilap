/**
 * Core API
 */
var _ = require('underscore');
var async = require('async');
var events = require("events");
var safe = require('safe');
var ObjectId = require('mongodb').ObjectID;

function TasksApi (ctx) {
	var self = this;
	this._ctx = ctx;
	this._tasks = null;
	this._coreapi;
}

TasksApi.prototype.getTask = function (token, id, cb) {
	var self = this;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["task.view"],cb); },
		function (cb) {
			self._tasks.findOne({'_id': new ObjectId(id)}, cb);
		}], safe.sure_result(cb, function (result) {
			return result[1];
		})
	);
};

TasksApi.prototype.getAllTasks = function (token, cb) {
	var self = this;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["task.view"],cb); },
		function (cb) {
			self._tasks.find({}).toArray(cb);
		}], safe.sure_result(cb, function (results) {
			return results[1];
		})
	);
};

TasksApi.prototype.saveTask = function (token, task, cb) {
	var self = this;
	async.series ([
		function (cb) { self._coreapi.checkPerm(token,["task.edit"],cb); },
		function (cb) {
			if (!task._id) {
				task.dt = new Date();
				task._id = new ObjectId();
			} else 
				task._id = new ObjectId(task._id);
			cb();
		},
		function (cb) { self._tasks.save(task, cb);	}
	], safe.sure_result(cb, function (result) {
		return task;
	}));
};

TasksApi.prototype.resolveTask = function (token, id, cb) {
	var self = this;
	async.waterfall ([
		function (cb) { self._coreapi.checkPerm(token,["task.edit"],cb); },
		function (task, cb) { self.getTask(token, id, cb); },
		function (task, cb) {
			task.status = 'resolved';
			self._tasks.save(task, cb);
		}], safe.sure_result(cb,function (result) {
			return true;
		})
	);
};

TasksApi.prototype.deleteTask = function (token, id, cb){
	var self = this;
	async.series([
		function (cb) { self._coreapi.checkPerm(token,["task.edit"],cb); },
		function deleteAcc(cb) { self._tasks.remove({'_id': new ObjectId(id)}, cb);	}
	], cb);
};

TasksApi.prototype._loadData = function (cb) {
	var self = this;
	var adb = null;
	async.series([
		function openDb(cb) {
			self._ctx.getDB(function (err, _adb) {
				if (err) return cb(err);
				adb = _adb;
				cb();
			});
		},
		function openCollections(cb) {
			async.parallel([
				function accounts (cb) {
					adb.collection('tasks_tasks',cb);
				},
			], safe.sure_result(cb, function (results) {
				self._tasks = results[0];
			}));
		}
	],cb);
};

TasksApi.prototype.init = function (cb) {
	var self = this;
	async.parallel([
		function (cb) {
			self._ctx.getModule("core",function (err, module) {
				if (err) return cb1(err);
				self._coreapi = module.api;
				cb();
			});
		},
		function (cb) {
			self._loadData(cb);
		}], 
	cb);
};

module.exports.init = function (ctx,cb) {
	var api = new TasksApi(ctx);
	api.init(function (err) {
		if (err) return cb(err);
		cb(null, api);
	});
};

