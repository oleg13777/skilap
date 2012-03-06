var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var assetsTypes = ["BANK", "CASH", "ASSET", "STOCK", "MUTUAL", "CURENCY"];
	var liabilitiesTypes = ["CREDIT", "LIABILITY", "RECEIVABLE", "PAYABLE"];
	var repCmdty = {space:"ISO4217",id:"RUB"};
	
	function getAccountDetails(token, acc, types, callback) {
		var childs = [];
		async.auto({
			get_childs: function(cb1) {
				getAssets(token, acc.id, types, childs, cb1);
			},
			get_details: ['get_childs', function(){
				cashapi.getAccountInfo(token, acc.id, ["value"], function(err, d) {
					if (err) return callback(err);
					var det = {};
					det.cmdty = acc.cmdty;
					det.name = acc.name;
					// do the conversion
					async.series ([
						function (cb) {
							cashapi.getCmdtyPrice(token,det.cmdty,repCmdty,null,null, function (err, rate) {
								if (err) {
									return cb(err);
								}
								if (!_(repCmdty).isEqual(det.cmdty)) 
									det.quantity = d.value;
								det.value = parseFloat(webapp.i18n_cmdtyval(det.cmdty.id,d.value*rate));
								det.id = acc.id;
								det.childs = childs;
								_(childs).forEach (function (e) {
									det.value+=e.value;
								})
								det.fvalue = webapp.i18n_cmdtytext(token,repCmdty,det.value);
								if (det.quantity)
									det.fquantity = webapp.i18n_cmdtytext(token,det.cmdty,det.quantity);
									
								cb();
							})
						}
					], function (err) {
						if (err) console.log(err);
						callback(det);
					})
				})
			}]
		});
	};

	function getAssets(token, id, types, assets_, callback) {
		cashapi.getChildAccounts(token, id, function(err, accounts) {
			if (err) return callback(err);
			async.forEachSeries(accounts, function(acc, cb2){
				getAccountDetails(token, acc, types, function(det1) {
					if (_.indexOf(types, acc.type) !=-1) {
						assets_.push(det1);
					}
					cb2();
				});
			}, callback);
		});
	}

	app.get(prefix, function(req, res, next) {
		var assets = [];
		var liabilities = [];
		async.waterfall([
			async.apply(getAssets, req.session.apiToken, 0, assetsTypes, assets),
			async.apply(getAssets, req.session.apiToken, 0, liabilitiesTypes, liabilities),
			function (cb1) {
				webapp.guessTab(req, {pid:'home',name:'Home',url:req.url}, cb1);
			},
			function render (vtabs) {
				var rdata = {settings:{views:__dirname+"/../views"},prefix:prefix, tabs:vtabs};
				rdata.assetsSum = webapp.i18n_cmdtytext(req.session.apiToken,repCmdty,_(assets).reduce(function (m,e) {return m+e.value;},0));
				rdata.liabilitiesSum = webapp.i18n_cmdtytext(req.session.apiToken,repCmdty,_(liabilities).reduce(function (m,e) {return m+e.value;},0));
				rdata.assets = assets;
				rdata.liabilities = liabilities;
				
				res.render(__dirname+"/../views/index", rdata);
			}],
			next
		);
	});

	app.get(prefix + "/close", function(req, res, next) {
		async.waterfall([
			function(cb1){
				var pid = req.query.pid;
				if (pid) {
					webapp.removeTabs(req.session.apiToken, [pid], cb1);
				} else {
					cb1();
				}
			},
			function(){
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end('true');
			}
		], next);
	})
}

