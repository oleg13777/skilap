var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var repCmdty = {space:"ISO4217",id:"RUB"};
	var ctx = webapp.ctx;

	function getAccountTree(token, id, data, cb) {
		// filter this level data
		var level = _(data.accounts).filter(function (e) { return e.parentId == id; });
		var res = [];
		_(level).forEach (function (acc) {
			var det = {};
			det.cmdty = acc.cmdty;
			det.name = acc.name;
			det.id = acc.id;			
			det.path = acc.path.split('::');
			getAccountTree(token, acc.id, data, function (err,childs) {
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
		cb(null, _(res).sortBy(function (e) {return e.name; }));
	}
	
	function getAccountList (token, cb) {
		var batch = {
			"setup":{
				"cmd":"object",
				"prm":{"token":token,"repCmdty":repCmdty},
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
				"prm":["cash.getAccountInfo","token","id",["value","path"]],
				"res":{"a":"merge"}
			},
			"cmdty":{
				"dep":"accounts",
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
		webapp.ctx.runBatch(batch,cb);
	}

	app.get(prefix+"/acctree", function(req, res, next) {
		var assets,curencies,assetsTypes;		
		async.series([
			function (cb) {
				getAccountList(req.session.apiToken, function (err, data) {
					if (err) return cb(err);
					getAccountTree(req.session.apiToken,0,data,cb);
				})
			},
			function (cb) {				
				webapp.guessTab(req, {pid:'acctree',name:ctx.i18n(req.session.apiToken, 'cash', 'Accounts'), url:req.url},cb);
			}
		], function (err, r) {
			if (err) return next(err);
			var rdata = {
					settings:{views:__dirname+"/../views"},
					prefix:prefix, 
					tabs:r[1], 
					assets:r[0],
					token: req.session.apiToken,
					host:req.headers.host
				};
			res.render(__dirname+"/../views/acctree", rdata);
		})
	});
	
	var responseHandler = function(req, res, next, tplName){
		var assets, curencies, assetsTypes;
		async.series([
			function (cb) {
				getAccountList(req.session.apiToken, function (err, data) {
					if (err) return cb(err);
					getAccountTree(req.session.apiToken,0,data,cb);
				})
			},
			function (cb) {	
				webapp.getUseRangedCurrencies(req.session.apiToken,cb);
			},
			function(cb){
				cashapi.getAssetsTypes(req.session.apiToken, cb);
			}
		], function (err,r) {
			if (err) return next(err);
			var rdata = {
					settings:{views:__dirname+"/../views"},
					prefix:prefix,						
					assets:r[0],
					token: req.session.apiToken,
					curencies: r[1].all,
					usedCurrencies:r[1].used,
					notUsedCurrencies:r[1].unused,							
					assetsTypes: r[2],
					mainLayoutHide:1,
					host:req.headers.host						
				};
			res.render(__dirname+"/../views/"+tplName, rdata);
		});
	};

	app.get(prefix+"/acccreate",  function(req, res, next) {
		responseHandler(req,res,next,'acccreate');
	});
	
	app.get(prefix+"/accdelete", function(req, res, next) {
		responseHandler(req,res,next,'accdelete');
	});		

	app.post(prefix+"/accupd", function(req, res, next) {
		async.waterfall([
			function(cb1) {
				var acc = {};
				acc.id = req.body.id;
				acc.name=req.body.name;
				acc.parentId=req.body.parentId;
				acc.type=req.body.type;
				acc.cmdty={space:"ISO4217",id:req.body.curency};
				_(req.body.slots).forEach(function(slot) {
					acc[slot.key] = slot.value;
				});
				cashapi.saveAccount(req.session.apiToken, acc, cb1);
			},
			function(acc, cb1){
				getAccountDetail(req.session.apiToken, acc, function (err,det) {
					if(err)
						cb1(err);
					else
						cb1(null,det);					
				});
			},
			function(det, cb1){				
				res.end(det);
			}
		],next);
	});
}
