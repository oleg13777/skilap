var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var repCmdty = {space:"ISO4217",id:"RUB"};
	
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

	app.get(prefix+"/acctree", function(req, res, next) {
		var assets = [];
		async.waterfall([
			async.apply(getAccWithChild, req.session.apiToken, 0, assets),
			function (cb1) {
				webapp.guessTab(req, {pid:'acctree',name:'Tree', url:req.url}, cb1);
			},
			function render (vtabs) {
				var rdata = {
						settings:{views:__dirname+"/../views"},
						prefix:prefix, 
						tabs:vtabs, 
						assets:assets
					};
				res.render(__dirname+"/../views/acctree", rdata);
			}],
			next
		);
	});
}
