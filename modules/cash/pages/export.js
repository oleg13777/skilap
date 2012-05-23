var async = require("async");
var temp = require("temp");
var fs   = require('fs');
var zlib = require('zlib');

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
	
	app.get(prefix + "/import/raw", function(req, res, next) {
		async.waterfall([
			function (cb1) {
				webapp.guessTab(req, {pid:'import-raw',name:'Raw import',url:req.url}, cb1);
			},
			function render (vtabs) {
				res.render(__dirname+"/../views/import", {prefix:prefix, tabs:vtabs, caption: "Select file for import", upload:true });
			}],
			next
		);
	});
	
	app.post(prefix + "/import/raw", function(req, res, next) {
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
						var str = JSON.stringify(ret);
						temp.open('upload', function(err, info) {
							fs.write(info.fd, str);
							path = info.path;
							fs.close(info.fd, cb1);
						});
					});
				},
				function (cb1) {
					webapp.guessTab(req, {pid:'import-raw',name:'Import',url:req.url}, cb1);
				},
				function render (vtabs) {
					res.render(__dirname+"/../views/import", {prefix:prefix, tabs:vtabs, caption: "We find:", step1:true, transactions:tr_count, accounts:acc_count, path:path});
				}],
				next
			);
		} else if (step == 2) {
			var accounts;
			var transactions;
			var prices;
			var tabs;
			async.waterfall([
				function (cb1) {
					var data = fs.readFileSync(req.body.fileName, 'ascii');
					var obj = JSON.parse(data);
					accounts = obj.acc;
					transactions = obj.tr;
					prices = obj.prices;
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
					webapp.guessTab(req, {pid:'import-raw',name:'Import',url:req.url}, cb1);
				},
				function (vtabs, cb1) {
					tabs = vtabs;
					webapp.removeTabs(req.session.apiToken, null, cb1);
				},
				function render (cb1) {
					res.render(__dirname+"/../views/import", {prefix:prefix, tabs:tabs, caption: "data saved", step2:true, transactions:transactions.length, accounts:accounts.length});
				}],
				next
			);
		} else {
			async.waterfall([
				function (cb1) {
					webapp.guessTab(req, {pid:'import-raw',name:'Import',url:req.url}, cb1);
				},
				function render (vtabs) {
					res.render(__dirname+"/../views/import", {prefix:prefix, tabs:vtabs, caption: "data saved", form:elseForm, transactions:transactions.length, accounts:accounts.length});
				}],
				next
			);
		}
	});	
}
