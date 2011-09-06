var fs = require("fs");
var _ = require('underscore');
var alfred = require('alfred');
var async = require('async');
var Step = require("step");
var events = require("events");
var util = require("util");
var express = require('express');


function Skilap() {
	var _adb = null;
	var tmodules = [{name:"cash",require:"skilap-cash"}];
	var self = this;
	var modules = {};
	var webapp = null;

	this.startApp = function (cb) {
		console.time("startApp");
		async.waterfall([
			function initBasics(cb1) {
				var app = module.exports = express.createServer();

				// Configuration
				app.configure(function(){
					app.set('view engine', 'mustache');
					app.register(".mustache", require('stache'));
					app.use(express.bodyParser());
					app.use(express.methodOverride());
					app.use(app.router);
				});

				app.configure('development', function(){
				  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
				});

				app.configure('production', function(){
				  app.use(express.errorHandler());
				});

				webapp = app;

				alfred.open('/home/pushok/work/joker/data', cb1);
			},
			function initModules(adb_, cb1) {
				_adb = adb_;
				async.forEach(tmodules, function (minfo, cb2) {
					var module = require(minfo.require);
					module.init(self,function (err, moduleObj) {
						if (err) return cb2(err);
						modules[minfo.name]=moduleObj;
						cb2();
						});
				},cb1);
			}],
			function end(err) {
				console.timeEnd("startApp");
				if (err) cb(err);
				webapp.listen(1337);
				console.log("Express server listening on port %d in %s mode", webapp.address().port, webapp.settings.env);
				self.emit("WebStarted");
				cb();
			}
		);
	}

	this.getDB = function (cb) {
		cb(null,_adb);
	}

	this.getModule = function (name, cb) {
		cb(null, modules[name]);
	}

	this.getWebApp = function (cb) {
		cb(null, webapp);
	}
}

util.inherits(Skilap, events.EventEmitter);

module.exports.createApp = function () {
	return new Skilap();
}
