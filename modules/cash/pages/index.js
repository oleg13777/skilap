var async = require("async");
var safe = require("safe");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var assetsTypes = ["BANK", "CASH", "ASSET", "STOCK", "MUTUAL", "CURENCY"];
	var liabilitiesTypes = ["CREDIT", "LIABILITY", "RECEIVABLE", "PAYABLE"];
	var repCmdty = null;

	function getAssets(token, root, types, data, cb) {
		var level;
		var pass = false;
		if (root.root) {
			level = [root];
			delete root.root;
			pass = true;
		} else {
			level = _.filter(data.accounts,function (e) { 
				if (root._id)
					return e.parentId && e.parentId.toString() == root._id.toString(); 
				else
					return _.isUndefined(e.parentId)
			})
		}
		var res = [];
		async.forEach(level, function (acc, cb) {
			var r = {acc:acc};
			r.value = acc.value;
			res.push(r);			
			getAssets(token, acc, types,data, safe.sure(cb, function (childs) {
				r.childs = childs;
				r.repCmdty = repCmdty;
				async.forEach(childs, function (c,cb) {
					cashapi.getCmdtyPrice(token, c.acc.cmdty, acc.cmdty, null, "safe", safe.sure(cb, function (rate) {
						r.value+=c.value * rate;
						cb();
					}))
				}, cb);
			}))
		}, safe.sure(cb, function () {
			if (!pass) {
				res = _.sortBy(res, function (v) { return v.acc.name; });
				res = _.filter(res, function (e) { 
					return (_.include(types,e.acc.type) && Math.abs(e.value)>1) || e.childs.length>0;
				})
			}
			cb(null, res);
		}))
	}

	app.get(prefix, webapp.layout(), function(req, res, next) {
		var data;
		var settings = {};
		var assets = [];
		var liabilities = [];
		var currencies = [];
		var vtabs = [];
		async.series([
			function (cb) {
				webapp.guessTab(req, {pid:'home',name:webapp.ctx.i18n(req.session.apiToken, 'cash','Home'),url:req.url}, safe.sure_result(cb,function(val) {
					vtabs = val;
				}))
			},
			function getSysCurrency(cb) {
				cashapi.getSettings(req.session.apiToken, 'currency', repCmdty, safe.sure(cb, function (defCmdty) {
					repCmdty = defCmdty;
					cb();
				}));
			},
			function getPageCurrency(cb) {
				// get tab settings first
				webapp.getTabSettings(req.session.apiToken, 'home', safe.sure(cb, function(cfg) {
					if (cfg && cfg.cmdty)
						repCmdty = cfg.cmdty;
					cb()
				}));
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
					"info":{
						"dep":"accounts",
						"cmd":"api",
						"ctx":{"a":"each","v":"accounts"},
						"prm":["cash.getAccountInfo","token","_id",["value"]],
						"res":{"a":"merge"}
					}
				}
				webapp.ctx.runBatch(batch,safe.sure_result(cb, function (_data) {
					data = _data;
				}))
			},
			function (cb) {
				getAssets(req.session.apiToken, {root:1,_id:null,value:0,cmdty:repCmdty}, assetsTypes, data, safe.sure_result(cb, function (res) {
					assets = res;
				}));
			},
			function (cb) {
				getAssets(req.session.apiToken, {root:1,_id:null,value:0,cmdty:repCmdty}, liabilitiesTypes, data, safe.sure_result(cb, function (res) {
					liabilities = res;
				}));
			},
			function render () {
				var rdata = {
					tabs: vtabs,
					tabId: 'home',
					pmenu: {name:webapp.ctx.i18n(req.session.apiToken, 'cash','Home'),
						items:[{name:webapp.ctx.i18n(req.session.apiToken, 'cash','Page settings'),id:"settings",href:"#"}]}
				};
				rdata.cmdty = repCmdty;
				rdata.assetsSum = assets[0].value;
				rdata.liabilitiesSum = liabilities[0].value;
				rdata.assets = assets[0].childs;
				rdata.liabilities = liabilities[0].childs;
				res.render(__dirname+"/../res/views/index", rdata);
			}],
			next
		);
	});
}
