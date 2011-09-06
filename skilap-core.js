var fs = require("fs");
var _ = require('underscore');
var alfred = require('alfred');
var async = require('async');
var Step = require("step");
var events = require("events");
var util = require("util");

function Skilap() {
	var _adb = null;
	var tmodules = [{name:"cashapi",require:"./cashapi"}];
	var self = this;
	var modules = {};

	this.startApp = function (cb) {
		console.time("startApp");
		async.waterfall([
			function openDB(cb1) {
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
}

util.inherits(Skilap, events.EventEmitter);

module.exports.createApp = function () {
	return new Skilap();
}
