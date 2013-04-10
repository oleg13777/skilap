var _ = require('underscore');
var skconnect = require('skilap-connect');
var async = require('async');
var safe = require('safe');

function TasksWeb (ctx) {
	var self = this;
	this.ctx = ctx;
	this.api = null;
	this.web = null;
	this.prefix = "/tasks";
	this.tabs = [];
	this._tasks_userviews = null;
	this._coreapi = null;

	self.ctx.once("WebStarted", function (err) {
		self.ctx.getWebApp(function (err, web) {
			self.web = web;
			web.use(skconnect.vstatic(__dirname + '/../../../public',{vpath:"/common"}));
			web.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/tasks"}));
			require("../pages/index.js")(self);
			require("../pages/settings.js")(self);			
		});
	});
}

TasksWeb.prototype._init = function (cb) {
	var self = this;
	async.parallel([
		function (cb) {
			self.ctx.getModule("core",safe.sure_result(cb, function (module) {
				self._coreapi = module.api;
			}));
		},
		function (cb) {
			self.ctx.getDB(safe.sure(function (adb) {
				async.parallel({
					_tasks_userviews:function (cb) {
						adb.collection('tasks_userviews',cb);
					}
				}, safe.sure_result(cb, function (results) {
					_.extend(self,results);
				}));
			}));
	}], 
	cb);
};

TasksWeb.prototype.guessTab = function (req, ti,cb) {
	var self = this;
	var vtabs=[], user=null;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(req.session.apiToken, cb);
		},
		function (user_, cb) {
			user = user_;
			if (user.type!='guest')
				self._tasks_userviews.findOne({'_id': user._id}, cb);
			else
				cb(null,{});
		},
		safe.trap(function (views, cb) {
			if (views==null) views = {tabs:[]};			
			var tab = null;
			// search current tabs
			_.forEach(views.tabs, function (t) {
				var vtab = {name:t.name,url:t.url,pid:t.pid};
				if (ti.pid==t.pid) {
					tab = t;
					vtab.selected = true;
					vtab.activeTabClass = "active";
				}
				vtabs.push(vtab);
			});
			// if tab for that page not found create new
			if (tab==null) {
				tab = {name:ti.name, pid:ti.pid, url:ti.url};
				vtabs.push({name:ti.name, selected:true, url:ti.url, pid:ti.pid, activeTabClass: "active"});
				views.tabs.push(tab);
				if (user.type!='guest') {
					self._tasks_userviews.save(views,cb);
				} else
					cb();
			} else
				cb();
		})], safe.sure_result(cb, function (results) {
			return vtabs;
		})
	);
};

TasksWeb.prototype.removeTabs = function (token, tabIds, cb) {
	var self = this;
	var user = null;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(token, cb);
		},
		function (user_, cb) {
			user = user_;
			self._tasks_userviews.findOne({'_id': user._id}, cb);
		},
		safe.trap(function (views, cb) {
			if (views==null)
				views={tabs:[]};
			if (tabIds==null)
				views.tabs = [];
			else
				views.tabs = _.reject(views.tabs, function (t) { return _(tabIds).include(t._id); } );
			views._id = parseInt(user._id);
			self._tasks_userviews.save(views,cb);
		})], cb
	);
};

TasksWeb.prototype.saveTabSettings = function(token, tabId, settings, cb) {
	var self = this;
	var user = null;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(token, cb);
		},
		function (_user, cb) {
			user = _user;
			self._tasks_userviews.get(user._id, cb);
		},
		function (views, cb) {
			var t = _.find(views.tabs,function (t) {return t.pid == tabId; });
			if (!t) return cb();
			t.settings = settings;
			views._id = parseInt(user._id);
			self._tasks_userviews.put(views, cb);
		}], cb
	);
};

TasksWeb.prototype.getTabSettings = function(token, tabId, cb) {
	var self = this;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(token, cb);
		},
		function (user, cb) {
			self._tasks_userviews.findOne({'_id': user._id}, cb);
		},
		function (views, cb) {
			var ret = _.find(views.tabs,function (t) {return t.pid == tabId; });
			if (ret) 
				cb(null, ret.settings);
			else
				cb(null, {});
		}], safe.sure(cb, function (ret) {
			cb(null, ret);
		})
	);
};

module.exports.init = function (ctx,cb) {
	async.parallel ([
		function createApi(cb) {
			var api = require("./tasksapi.js");
			api.init(ctx, cb);
		},
		function createWeb(cb) {
			var web = new TasksWeb(ctx);
			web._init(safe.sure_result(cb, function () {
				return web;
			}));
		}], safe.sure(cb, function (results) {
			var m = results[1];
			m.api = results[0];
			m.localePath = __dirname+'/../locale';
			
			m.getPermissionsList = function (token, cb) {
				var res = [];
				res.push({id:'task.view', desc:ctx.i18n(token, 'tasks', 'View tasks data')});
				res.push({id:'task.add', desc:ctx.i18n(token, 'tasks', 'Add new tasks')});
				res.push({id:'task.edit', desc:ctx.i18n(token, 'tasks', 'Edit tasks data')});
				cb(null,res);
			};
			m.getModuleInfo = function (token, cb) {
				var i = {};
				i.name = ctx.i18n(token, 'tasks', 'Tasks module');
				i.desc = ctx.i18n(token, 'tasks', 'Personal task manager.');
				i.url = "/tasks/";
				i._id = 'tasks';
				cb(null,i);
			};

			cb(null, m);
		})
	);
};
