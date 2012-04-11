var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var repCmdty = {space:"ISO4217",id:"RUB"};
	var ctx = webapp.ctx;
	
	function getAccountDetails(token, acc, callback) {
		var childs = [];
		async.auto({
			get_childs: function(cb1) {
				getAccWithChild(token, acc.id, childs, cb1);
			},
			get_details: ['get_childs', function(){
				cashapi.getAccountInfo(token, acc.id, ["value"], function(err, d) {
					if (err) return callback(err);
					var det = {};
					det.cmdty = acc.cmdty;
					det.name = acc.name;
					det.parentId = acc.parentId;
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

	function getAccWithChild(token, id, assets_, callback) {
		cashapi.getChildAccounts(token, id, function(err, accounts) {
			if (err) return callback(err);
			async.forEachSeries(accounts, function(acc, cb2){
				getAccountDetails(token, acc, function(det1) {
					assets_.push(det1);
					cb2();
				});
			}, callback);
		});
	}
	
	var responseHandler = function(req, res, next, tplName){
		var assets = [];
		var curencies = [];
		var assetsTypes = [];
		async.waterfall([
			function (cb) { getAccWithChild(req.session.apiToken, 0, assets, cb) },
			function (cb) {	ctx.i18n_getCurrencies("rus", cb) },
			function(_curencies, cb1){
				cashapi.getAssetsTypes(function(err, types){
					curencies = _curencies
					assetsTypes = types;
					cb1();
				});
			},			
			function render () {
				var rdata = {
						settings:{views:__dirname+"/../views"},
						prefix:prefix,						
						assets:assets,
						token: req.session.apiToken,
						curencies: curencies,
						assetsTypes: assetsTypes,
						mainLayoutHide:1,
						host:req.headers.host						
					};
				res.render(__dirname+"/../views/"+tplName, rdata);
			}],
			next
		);
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
				cashapi.saveAccount(req.session.apiToken, acc, cb1);
			},
			function(acc, cb1){
				getAccountDetails(req.session.apiToken, acc, function (det) {cb1(null, det)});
			},
			function(det, cb1){
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end(JSON.stringify(det));
			}
		],next);
	});
}
