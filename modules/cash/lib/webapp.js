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

	self.ctx.once("WebStarted", function (err) {
		self.ctx.getWebApp(function (err, web) {
			self.web = web;
			web.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/cash"}));
			require("../pages/account.js")(self);
			require("../pages/index.js")(self);
		})
	})
}

module.exports.init = function (ctx,cb) {
	async.parallel ([
		function createApi(cb1) {
			var api = require("./cashapi.js");
			api.init(ctx, cb1);
		},
		function createWeb(cb1) {
			var api = new CashWeb(ctx);
			cb1(null, api);
		}], function done(err, results) {
			var m = results[1];
			m.api = results[0];
			cb(null, m);
		}
	)
}
