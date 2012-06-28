var _ = require('underscore');
var skconnect = require('skilap-connect');
var async = require('async');
var safe = require('safe');

function CashWeb (ctx) {
	var self = this;
	this.ctx = ctx;
	this.api = null;
	this.web = null;
	this.prefix = "/cash";
	this.tabs = [];
	this._cash_userviews = null;
	this._coreapi = null;

	self.ctx.once("WebStarted", function (err) {
		self.ctx.getWebApp(function (err, web) {
			self.web = web;
			web.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/cash"}));
			require("../pages/account.js")(self);
			require("../pages/index.js")(self);
			require("../pages/import.js")(self);
			require("../pages/report.js")(self);
			require("../pages/accounts.js")(self);
			require("../pages/restoredefaults.js")(self)	
			require("../pages/export.js")(self);
			require("../pages/priceeditor.js")(self);
		})
	})
}

CashWeb.prototype._init = function (cb) {
	var self = this;
	async.parallel([
		function (cb) {
			self.ctx.getModule("core",safe.sure_result(cb, function (module) {
				self._coreapi = module.api;
			}))
		},
		function (cb) {
			self.ctx.getDB(safe.sure(function (adb) {
				async.parallel({
					_cash_userviews:function (cb) {
						adb.ensure("cash_userviews",{type:'cached_key_map',buffered:false},cb);
					}
				}, safe.sure_result(cb, function (results) {
					_.extend(self,results);
				}))
			}))
	}], 
	cb);
}

CashWeb.prototype.guessTab = function (req, ti,cb) {
	var self = this;
	var vtabs=[], user;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(req.session.apiToken, cb);
		},
		function (user_, cb) {
			user = user_;
			if (user.type!='guest')
				self._cash_userviews.get(user.id,cb);
			else
				cb(null,{});
		},
		safe.trap(function (views, cb) {
			if (views==null) views = {tabs:[]};			
			var tab;
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
				if (user.type!='guest')
					self._cash_userviews.put(user.id,views,cb)
				else
					cb();
			} else
				cb()
		})], safe.sure_result(cb, function (results) {
			return vtabs;
		})
	)
}

CashWeb.prototype.removeTabs = function (token, tabIds, cb) {
	var self = this;
	var vtabs=[], user;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(token, cb);
		},
		function (user_, cb) {
			user = user_;
			if (user.type!='guest')
				if (tabIds == null)
					self._cash_userviews.put(user.id, {tabs:[]},cb);
				else
					self._cash_userviews.get(user.id, cb);
			else
				cb(null,{});
		},
		safe.trap(function (views, cb) {
			var tIds = {};
			var _views = {tabs:[]};
			tabIds.forEach(function(t) {
				tIds[t]=t;
			});
			views.tabs.forEach(function (t) {
				var tab = tIds[t.pid];
				if (!tab) {
					_views.tabs.push(t);
				}
			});
			self._cash_userviews.put(user.id,_views,cb);
		})], cb
	)
}

CashWeb.prototype.saveTabSettings = function(token, tabId, settings, cb) {
	var self = this;
	var user;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(token, cb);
		},
		function (_user, cb) {
			user = _user;
			self._cash_userviews.get(user.id,cb);
		},
		function (views, cb) {
			var t = _.find(views.tabs,function (t) {return t.pid == tabId; });
			if (!t) return cb();
			t.settings = settings
			self._cash_userviews.put(user.id, views, cb);
		}], cb
	)
}

CashWeb.prototype.getTabSettings = function(token, tabId, cb) {
	var self = this;
	async.waterfall ([
		// we need user first
		function (cb) {
			self._coreapi.getUser(token, cb);
		},
		function (user, cb) {
			self._cash_userviews.get(user.id,cb);
		},
		function (views, cb) {
			var ret = _.find(views.tabs,function (t) {return t.pid == tabId; });
			if (ret) 
				cb(null, ret)
			else
				cb(null, {})
		}], safe.sure(cb, function (err, ret) {
			cb(null, ret);
		})
	)
}

CashWeb.prototype.getUseRangedCurrencies = function(token, cb) {
	var self = this;
	var res =  {};
	async.waterfall([
		function (cb) { 
			self.api.getAllCurrencies(token,cb)
		},
		safe.trap(function(currencies,cb){
			res.all = currencies;
			res.used = _.filter(currencies,function(curr){
				return curr.used == 1;
			});
			res.unused = _.filter(currencies,function(curr){
				return curr.used == 0;
			});
			cb();
		})
	], safe.sure_result(cb, function () {
		return res;
	}))
}

CashWeb.prototype.i18n_cmdtytext = function(langtoken,cmdty,value) {
	var self = this;
	if (cmdty.space == 'ISO4217')
		return self.ctx.i18n_cytext(langtoken,cmdty.id,value)
	else {
		var res = self.ctx.i18n_cytext(langtoken,'USD',value);
		res.replace('USD',cmdty.id);
		return res;
	}
}
		
CashWeb.prototype.i18n_cmdtyval = function(cmdty,value) {
	var self = this;
	if (cmdty.space == 'ISO4217')
		return self.ctx.i18n_cyval(cmdty.id,value)
	else 
		return self.ctx.i18n_cyval('USD',value)
}

module.exports.init = function (ctx,cb) {
	async.parallel ([
		function createApi(cb) {
			var api = require("./cashapi.js");
			api.init(ctx, cb);
		},
		function createWeb(cb) {
			var web = new CashWeb(ctx);
			web._init(safe.sure_result(cb, function () {
				return web;
			}));
		}], safe.sure(cb, function (results) {
			var m = results[1];
			m.api = results[0];
			m.localePath = __dirname+'/../locale';
			
			m.getPermissionsList = function (token, cb) {
				var res = [];
				res.push({id:'cash.view', desc:ctx.i18n(token, 'cash', 'View cash data')});
				res.push({id:'cash.add', desc:ctx.i18n(token, 'cash', 'Append new data')});
				res.push({id:'cash.edit', desc:ctx.i18n(token, 'cash', 'Edit cash data')});
				cb(null,res);
			}
			
			m.getModuleInfo = function (token, cb) {
				var i = {};
				i.name = ctx.i18n(token, 'cash', 'Cash module')
				i.desc = ctx.i18n(token, 'cash', 'Personal and familty finances. Inspired by gnucash.')
				i.url = "/cash/";
				i.id = 'cash';
				cb(null,i);
			}

			cb(null, m);
		})
	)
}
