var async = require("async");
var safe = require("safe");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var repCmdty = null;
	var accCmdty = null;
	var ctx = webapp.ctx;

	function getAccountTree(token, id, data, cb) {
		// filter this level data
		var level = _(data.accounts).filter(function (e) { 
			if (id==null)
				return e.parentId==null || e.parentId.toString()==0
			else
				return e.parentId && e.parentId.toString() == id.toString(); 
		});
		var res = [];
		_(level).forEach (function (acc) {
			res.push(acc)
			getAccountTree(token, acc._id, data, function (err,childs) {
				if (err) return cb(err);
				acc.childs = childs;
				acc.repCmdty = repCmdty;
			})
		})
		cb(null, _(res).sortBy(function (e) {return e.name; }));
	}
	
	function getAccountList (token, cb) {
		var batch = {
			"setup":{
				"cmd":"object",
				"prm":{"token":token,"repCmdty":repCmdty,"accCmdty":accCmdty},
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
				"prm":["cash.getAccountInfo","token","_id",["value","path"]],
				"res":{"a":"merge"}
			}					
		}
		webapp.ctx.runBatch(batch,cb);
	}

	app.get(prefix+"/accounts/tree", webapp.layout(), function(req, res, next) {
		var assets,curencies,assetsTypes;		
		var settings = {key:'accounts_tree_page'};
		async.series({
			tabs:function (cb) {	
				webapp.guessTab(req, {pid:'accounts-tree',name:ctx.i18n(req.session.apiToken, 'cash', 'Accounts'), url:req.url},cb);
			},
			currency:function getPageCurrency(cb) {
				// get tab settings first
				webapp.getTabSettings(req.session.apiToken, 'accounts-tree', safe.sure(cb, function(cfg) {
					if (cfg && cfg.cmdty)
						repCmdty = cfg.cmdty;
					cashapi.getSettings(req.session.apiToken, 'currency', repCmdty, safe.sure(cb, function (defCmdty) {
						accCmdty = defCmdty;
						repCmdty = defCmdty;
						cb();
					}))
				}));
			},
			assets:function (cb) {
				getAccountList(req.session.apiToken, safe.sure(cb, function (data) {
					getAccountTree(req.session.apiToken,null,data, cb);
				}));
			}
		}, function (err, r) {
			if (err) return next(err);
			var assets = _.map(r.assets, function(acc) { acc.repCmdty = repCmdty; return acc; });
			var rdata = {
					prefix: prefix, 
					tabs: r.tabs, 
					tabId: 'accounts-tree',
					assets: assets,
					token: req.session.apiToken,
					settings: settings,
					host: req.headers.host,
					repCmdty: repCmdty
				};
			res.render(__dirname+"/../res/views/accounts-tree", rdata);
		})
	});
}
