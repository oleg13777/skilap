var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var repCmdty = {space:"ISO4217",id:"RUB"};
	var ctx = webapp.ctx;
	
	
	function getAccountDetail(token,acc,cb){		
		var childs=[];
		cashapi.getAccountInfo(token, acc.id, ["value"], function(err, d) {
			if (err) return cb(err);
			var det = {};
			det.cmdty = acc.cmdty;
			det.name = acc.name;
			det.parentId = acc.parentId;
			det.id = acc.id;
			det.value = d.value;
			det.childs = childs;
			det.fvalue='';
			if (acc.hidden)
				det.hidden = true;
			if (acc.placeholder)
				det.placeholder = true;
			
			// do the conversion
			async.series ([
				function (cb1) {					
					cashapi.getCmdtyPrice(token,det.cmdty,repCmdty,null,null, function (err, rate) {
						if (err) {
							return cb1(err);
						}
						if (!_(repCmdty).isEqual(det.cmdty)) 
							det.quantity = d.value;
						det.value = parseFloat(webapp.i18n_cmdtyval(det.cmdty.id,d.value*rate));						
						det.fvalue = webapp.i18n_cmdtytext(token,repCmdty,det.value);
						if (det.quantity)
							det.fquantity = webapp.i18n_cmdtytext(token,det.cmdty,det.quantity);
							
						cb1();
					})
				}
			], function (err) {
				if (err) console.log(err);
				cb(null,det);
			});
		});
	};
	
	function getAssetsTree(token,cb){
		cashapi.getAllAccounts(token,function(err,accounts){
			if(err)
				return cb(err);
			
			var assets = {};
			async.forEachSeries(accounts, function(acc, cb1){
				getAccountDetail(token,acc,function(err,det){
					if(err){
						return cb(err);
					}
					assets[acc.id] = det;
					cb1();
				});							
			}, function(){
				for(key in assets){
					if(assets[key].parentId != 0){						
						if(!assets[assets[key].parentId].childs){
							assets[assets[key].parentId].childs = [];
						}
						assets[assets[key].parentId].childs.push(assets[key]);						
						assets[assets[key].parentId].value += parseFloat(assets[key].value);
						assets[assets[key].parentId].fvalue	= webapp.i18n_cmdtytext(token,repCmdty,assets[assets[key].parentId].value);				
					}
				}
				var assets_=[];
				for(key in assets){
					if((assets[key].parentId == 0) && !(assets[key].hidden))
						assets_.push(assets[key]);
				}				
				cb(null,assets_);				
			});				
			
		});
	};

	app.get(prefix+"/acctree", function(req, res, next) {
		var assets,curencies,assetsTypes;		
		async.waterfall([
			function (cb1) {
				getAssetsTree(req.session.apiToken, function(err,assets_){
					if(err)
						cb1(err);
					else{
						assets = assets_;
						cb1();
					}
				});
			},
			function (cb1) {				
				ctx.i18n_getCurrencies("rus", cb1);
			},
			function(_curencies, cb1){				
				cashapi.getAssetsTypes(function(err, types){
					curencies = _curencies
					assetsTypes = types;
					cb1();
				});
			},
			function (cb1) {				
				webapp.guessTab(req, {pid:'acctree',name:ctx.i18n(req.session.apiToken, 'cash', 'Accounts'), url:req.url}, cb1);
			},
			function render (vtabs) {								
				var rdata = {
						settings:{views:__dirname+"/../views"},
						prefix:prefix, 
						tabs:vtabs, 
						assets:assets,
						token: req.session.apiToken,
						curencies: curencies,
						assetsTypes: assetsTypes,
						host:req.headers.host
					};
				res.render(__dirname+"/../views/acctree", rdata);
			}],
			next
			
		);
	});
	
	var responseHandler = function(req, res, next, tplName){
		var assets, curencies, assetsTypes;
		async.waterfall([
			function (cb) { 
				getAssetsTree(req.session.apiToken, function(err,assets_){
					if(err)
						cb(err);
					else{
						assets = assets_;
						cb();
					}
				}); 
			},
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
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end(JSON.stringify(det));
			}
		],next);
	});
}
