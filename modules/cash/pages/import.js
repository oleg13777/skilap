var async = require("async");
var temp = require("temp");
var fs   = require('fs');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;

	app.get(prefix + "/import", function(req, res, next) {
		async.waterfall([
			async.apply(cashapi.chPerm, req.session.apiToken),
			function (err, cb1) {
				webapp.guessTab(req, {pid:'import',name:'Import',url:req.url}, cb1);
			},
			function render (vtabs) {
				res.render(__dirname+"/../views/import", {prefix:prefix, tabs:vtabs, caption: "Select file for import", upload:true });
			}],
			next
		);
	});

	function wait(req, res, callback) {
		if (!req.form) {
			callback();
		} else {
			req.form.complete(function(err, fields, files) {
				if (err)
					callback(err);
				else {
					req.fields = fields;
					req.files = files;
					callback();
				}
			});
		}
	}

	app.post(prefix + "/import", wait, function(req, res, next) {
		var step = req.query.step;
		var path;
		if (step == 1){
			var acc_count = 0;
			var tr_count = 0;
			async.waterfall([
				async.apply(cashapi.chPerm, req.session.apiToken),
				function (err, cb1) {
					cashapi.parseGnuCashXml(req.files.upload.path, function (ret) {
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
					webapp.guessTab(req, {pid:'import',name:'Import',url:req.url}, cb1);
				},
				function render (vtabs) {
					res.render(__dirname+"/../views/import", {prefix:prefix, tabs:vtabs, caption: "We find:", step1:true, transactions:tr_count, accounts:acc_count, path:path});
				}],
				next
			);
		} else if (step == 2) {
			var accounts;
			var transactions;
			var tabs;
			async.waterfall([
				async.apply(cashapi.chPerm, req.session.apiToken),
				function (err , cb1) {
					var data = fs.readFileSync(req.fields.fileName, 'ascii');
					var obj = JSON.parse(data);
					accounts = obj.acc;
					transactions = obj.tr;
					cb1();
				},
				function (cb1) {
					cashapi.clearAccaunts(req.session.apiToken, null, cb1);
				},
				function (cb1) {
					cashapi.importAccaunts(req.session.apiToken, accounts, cb1);
				},
				function (cb1) {
					cashapi.clearTransaction(req.session.apiToken, null, cb1);
				},
				function (cb1) {
					cashapi.importTransactions(req.session.apiToken, transactions, cb1);
				},
				function (cb1) {
					webapp.guessTab(req, {pid:'import',name:'Import',url:req.url}, cb1);
				},
				function (vtabs, cb1) {
					tabs = vtabs;
					webapp.removeTabs(req, null /*['import']*/, cb1);
				},
				function render (cb1) {
					res.render(__dirname+"/../views/import", {prefix:prefix, tabs:tabs, caption: "data saved", step2:true, transactions:transactions.length, accounts:accounts.length});
				}],
				next
			);
		} else {
			async.waterfall([
				async.apply(cashapi.chPerm, req.session.apiToken),
				function (err, cb1) {
					webapp.guessTab(req, {pid:'import',name:'Import',url:req.url}, cb1);
				},
				function render (vtabs) {
					res.render(__dirname+"/../views/import", {prefix:prefix, tabs:vtabs, caption: "data saved", form:elseForm, transactions:transactions.length, accounts:accounts.length});
				}],
				next
			);
		}
	});
}
