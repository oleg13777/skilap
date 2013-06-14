var async = require("async");
var temp = require("temp");
var fs   = require('fs');
var zlib = require('zlib');

var data;
module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;

	app.get(prefix + "/export/raw", function(req, res, next) {
		async.waterfall([
			function get(cb) {
				cashapi.exportRaw(req.session.apiToken,cb)
			},
			function gzip(raw, cb) {
				zlib.gzip(JSON.stringify(raw), cb);
			},
			function send (data) {
				res.attachment('skilap.cash.gz');
				res.send(data)
			}],
			next
		);
	});
	
	app.get(prefix + "/import/raw", webapp.layout(), function(req, res, next) {
		async.waterfall([
			function (cb1) {
				webapp.guessTab(req, {pid:'import-raw',name:ctx.i18n(req.session.apiToken, 'cash','Raw import'),url:req.url}, cb1);
			},
			function render (vtabs) {
				res.render(__dirname+"/../res/views/import", {settings:{views:__dirname+"/../res/views"},prefix:prefix, tabs:vtabs, upload:true,SkilapCash:1 });
			}],
			next
		);
	});
	
	app.post(prefix + "/import/raw", webapp.layout(), function(req, res, next) {
		var step = req.query.step;
		var path;
		if (step == 1) {
			var acc_count = 0;
			var tr_count = 0;
			async.waterfall([
				function (cb1) {
					cashapi.parseRaw(req.files.upload.path, function (err, ret) {
						acc_count = ret.acc.length;
						tr_count = ret.tr.length;
						data = ret;
						cb1();
						/*
						var str = JSON.stringify(ret);
						temp.open('upload', function(err, info) {
							fs.write(info.fd, str);
							path = info.path;
							fs.close(info.fd, cb1);
						});
						*/
					});
				},
				function (cb1) {
					webapp.guessTab(req, {pid:'import-raw',name:ctx.i18n(req.session.apiToken, 'cash','Raw import'),url:req.url}, cb1);
				},
				function render (vtabs) {
					res.render(__dirname+"/../res/views/import", {settings:{views:__dirname+"/../res/views"},prefix:prefix, tabs:vtabs, step1:true, transactions:tr_count, accounts:acc_count, path:path,SkilapCash:1});
				}],
				next
			);
		} else if (step == 2) {
			var accounts;
			var transactions;
			var prices;
			var tabs;
			var settings;
			async.waterfall([
				function (cb1) {
					/*
					var data = fs.readFileSync(req.body.fileName, 'ascii');
					var obj = JSON.parse(data);
					*/
					obj = data;
					accounts = obj.acc;
					transactions = obj.tr;
					prices = obj.prices;
					settings = obj.settings;
					cb1();
				},
				function (cb1) {
					cashapi.clearPrices(req.session.apiToken, null, cb1);
				},
				function (cb1) {
					cashapi.importPrices(req.session.apiToken, prices, cb1);
				},
				function (cb1) {
					cashapi.clearAccounts(req.session.apiToken, null, cb1);
				},
				function (cb1) {
					cashapi.importAccounts(req.session.apiToken, accounts, cb1);
				},
				function (cb1) {
					cashapi.clearTransactions(req.session.apiToken, null, cb1);
				},
				function (cb1) {
					cashapi.importTransactions(req.session.apiToken, transactions, cb1);
				},
				function (cb1) {
					cashapi.clearSettings(req.session.apiToken, null, cb1);
				},
				function (cb1) {
					cashapi.importSettings(req.session.apiToken, settings, cb1);
				},
				function (cb) {
					cashapi._calcStats(cb);
				},
				function (cb1) {
					webapp.guessTab(req, {pid:'import-raw',name:'Import',url:req.url}, cb1);
				},
				function (vtabs, cb1) {
					tabs = vtabs;
					webapp.removeTabs(req.session.apiToken, null, cb1);
				},
				function render (cb1) {
					res.render(__dirname+"/../res/views/import", {settings:{views:__dirname+"/../res/views"},prefix:prefix, tabs:tabs, step2:true, transactions:transactions.length, accounts:accounts.length,SkilapCash:1});
				}],
				next
			);
		} else {
			async.waterfall([
				function (cb1) {
					webapp.guessTab(req, {pid:'import-raw',name:ctx.i18n(req.session.apiToken, 'cash','Raw import'),url:req.url}, cb1);
				},
				function render (vtabs) {
					res.render(__dirname+"/../res/views/import", {settings:{views:__dirname+"/../res/views"},prefix:prefix, tabs:vtabs, form:elseForm, transactions:transactions.length, accounts:accounts.length,SkilapCash:1});
				}],
				next
			);
		}
	});	
}
