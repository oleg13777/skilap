var async = require("async");
var safe = require("safe");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var assetsTypes = ["BANK", "CASH", "ASSET", "STOCK", "MUTUAL", "CURENCY"];
	var liabilitiesTypes = ["CREDIT", "LIABILITY", "RECEIVABLE", "PAYABLE"];
	var repCmdty = {space:"ISO4217",id:"RUB"};
	
	function getAssets(token, id, types, data, cb) {
		// filter this level data
		var level = _(data.accounts).filter(function (e) { return e.parentId == id && _(types).include(e.type); });
		var res = [];
		_(level).forEach (function (acc) {
			var det = {};
			det.cmdty = acc.cmdty;
			det.name = acc.name;
			det.id = acc.id;			
			getAssets(token, acc.id,types,data, function (err,childs) {
				if (err) return cb(err);
				if (!_(repCmdty).isEqual(det.cmdty)) 
					det.quantity = acc.value;
				var rate = 1;
				var r = _(data.cmdty).find(function (e) { return e.id==acc.cmdty.id });
				if (r!=null)
					rate = r.rate;
				det.value = parseFloat(webapp.i18n_cmdtyval(det.cmdty.id,acc.value*rate));
				det.childs = childs;
				_(childs).forEach (function (e) {
					det.value+=e.value;
				})
				det.fvalue = webapp.i18n_cmdtytext(token,repCmdty,det.value);
				if (det.quantity)
					det.fquantity = webapp.i18n_cmdtytext(token,det.cmdty,det.quantity);
				res.push(det);
			})
		})
		cb(null, res);
	}

	app.get(prefix, function(req, res, next) {
		var data;
		var settings = {key:'index_page'};
		var assets = [];
		var liabilities = [];
		var currencies = [];
		async.waterfall([
			function (cb) {
				async.series([
					function (cb1) {
						cashapi.getSettings(req.session.apiToken, 'index_page', {}, cb1);
					},
					function (cb1) {
						cashapi.getSettings(req.session.apiToken, 'currency', {}, cb1);
					},
					function (cb1) {
						webapp.getUseRangedCurrencies(req.session.apiToken,cb1)
					}
				], function (err,r) {
					settings.cmdty = (r[0] && r[0].cmdty ? r[0].cmdty : (r[1] && r[1].cmdty ? r[1].cmdty : repCmdty));
					currencies = r[2];
					repCmdty = settings.cmdty;
					cb();
				});
			},
			function (cb) {
				var batch = {
					"setup":{
						"cmd":"object",
						"prm":{"token":req.session.apiToken,"repCmdty":repCmdty},
						"res":{"a":"merge"}
					},
					"accounts":{
						"dep":"setup",
						"cmd":"api",
						"prm":["cash.getAllAccounts","token"],
						"res":{"a":"store","v":"accounts"}
					},
					"filter":{
						"dep":"accounts",
						"cmd":"filter",
						"prm":["accounts","type",["BANK", "CASH", "ASSET", "STOCK", "MUTUAL", "CURENCY","CREDIT", "LIABILITY", "RECEIVABLE", "PAYABLE"],"IN"],
						"res":{"a":"store","v":"accounts"}
					},					
					"info":{
						"dep":"filter",
						"cmd":"api",
						"ctx":{"a":"each","v":"accounts"},
						"prm":["cash.getAccountInfo","token","id",["value"]],
						"res":{"a":"merge"}
					},
					"cmdty":{
						"dep":"filter",
						"cmd":"pluck",
						"prm":["accounts","cmdty","unique"],
						"res":{"a":"clone","v":"cmdty"}
					},
					"rates":{
						"dep":"cmdty",
						"cmd":"api",
						"ctx":{"a":"each","v":"cmdty"},	
						"prm":["cash.getCmdtyPrice","token","this","repCmdty",null,"safe"],
						"res":{"a":"store","v":"rate"}
					}					
				}
				webapp.ctx.runBatch(batch,safe.sure_result(cb, function (_data) {
					data = _data;
				}))
			},
			function (cb) { 
				getAssets(req.session.apiToken, 0, assetsTypes, data, safe.sure_result(cb, function (res) {
					assets = res;
				}))
			},
			function (cb) { 
				getAssets(req.session.apiToken, 0, liabilitiesTypes, data, safe.sure_result(cb, function (res) {
					liabilities = res;
				}))
			},
			function (cb) { webapp.guessTab(req, {pid:'home',name:webapp.ctx.i18n(req.session.apiToken, 'cash','Home'),url:req.url}, cb) },
			function render (vtabs) {
				settings.views = __dirname+"/../views";
				var rdata = {
					settings: settings,
					prefix: prefix,
					tabs: vtabs,
					currencies: currencies.all,
					usedCurrencies: currencies.used,
					notUsedCurrencies: currencies.unused,
				};
				rdata.assetsSum = webapp.i18n_cmdtytext(req.session.apiToken,repCmdty,_(assets).reduce(function (m,e) {return m+e.value;},0));
				rdata.liabilitiesSum = webapp.i18n_cmdtytext(req.session.apiToken,repCmdty,_(liabilities).reduce(function (m,e) {return m+e.value;},0));
				rdata.assets = assets;
				rdata.liabilities = liabilities;
				
				res.render(__dirname+"/../views/index", rdata);
			}],
			next
		);
	});

	app.get(prefix + "/tabs/close", function(req, res, next) {
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
