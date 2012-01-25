/**
 * Module dependencies.
 */
var fs = require("fs");
var Step = require("step");
var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("yyyy.MM.dd");
var sprintf = require('sprintf').sprintf;
var _ = require('underscore');
var skconnect = require('skilap-connect');
var async = require('async');


function CashWeb (ctx) {
var self = this;
this.ctx = ctx;
this.api = null;
this.web = null;
this.prefix = "/cash";
this.tabs = [];
var cash_userviews;
var coreapi;

self.ctx.once("WebStarted", function (err) {
	self.ctx.getWebApp(function (err, web) {
		self.web = web;
		web.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/cash"}));
		require("../pages/account.js")(self);
		require("../pages/index.js")(self);
		require("../pages/import.js")(self);
	})
})

function loadData (cb) {
	var adb;
	async.series([
			async.apply(self.ctx.getDB)
		], function (err, results) {
			if (err) return cb(err);
			var adb = results[0];
			async.parallel([
				async.apply(adb.ensure, "cash_userviews",{type:'cached_key_map',buffered:false}),
			], function (err, results) {
				if (err) return cb(err)
				cash_userviews = results[0];
				cb();
			})
		}
	)
}; 

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

this.guessTab = function (req, ti,cb) {
	var vtabs=[], user;
	async.waterfall ([
		// we need user first
		function (cb) {
			coreapi.getUser(req.session.apiToken, cb);
		},
		function (user_, cb) {
			user = user_;
			if (user.type!='guest')
				cash_userviews.get(user.id,cb);
			else
				cb(null,{});
		},
		function (views, cb) {
			if (views==null) views = {tabs:[]};
			var tab;
			// search current tabs
			_.forEach(views.tabs, function (t) {
				var vtab = {name:t.name,url:t.url};
				if (ti.pid==t.pid) {
					tab = t;
					vtab.selected = true;
				}
				vtabs.push(vtab);
			});
			// if tab for that page not found create new
			if (tab==null) {
				tab = {name:ti.name, pid:ti.pid, url:ti.url};
				vtabs.push({name:ti.name, selected:true, url:ti.url});
				views.tabs.push(tab);
				if (user.type!='guest')
					cash_userviews.put(user.id,views,cb)
				else
					cb();
			} else
				cb()
		}], function (err, results) {
			cb(err,vtabs);
		}
	)
}
}

module.exports.init = function (ctx,cb) {
	async.parallel ([
		function createApi(cb1) {
			var api = require("./cashapi.js");
			api.init(ctx, cb1);
		},
		function createWeb(cb1) {
			var api = new CashWeb(ctx);
			api.init(function (err) {
				cb1(err, api);
			});
		}], function done(err, results) {
			var m = results[1];
			m.api = results[0];
			cb(null, m);
		}
	)
}
