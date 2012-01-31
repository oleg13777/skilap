var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var assetsTypes = ["BANK", "CASH", "ASSET", "STOCK", "MUTUAL", "CURENCY"];
	var liabilitiesTypes = ["CREDIT", "LIABILITY", "RECEIVABLE", "PAYABLE"];
	
	function getAccountDetails(token, acc, types, callback) {
		var childs = [];
		async.auto({
			get_childs: function(cb1) {
				getAssets(token, acc.id, types, childs, cb1);
			},
			get_details: ['get_childs', function(){
				cashapi.getAccountInfo(token, acc.id, ["value"], function(err, d) {
					if (err) return callback(err);
					value = Math.round(d.value*100)/100;
					var det = {};
					det.name = acc.name;
					det.value = value;
					det.ahref = prefix+"/account?id="+acc.id;
					det.id = acc.id;
					det.childs = childs;
					callback(det);
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
			async.apply(getAssets, req.session.apiToken, 1, assetsTypes, assets),
			async.apply(getAssets, req.session.apiToken, 1, liabilitiesTypes, liabilities),
			function (cb1) {
				var pid = req.query.close;
				if (pid) {
					webapp.removeTabs(req, [pid], cb1);
				} else {
					cb1();
				}
			},
			function (cb1) {
				webapp.guessTab(req, {pid:'home',name:'Home',url:req.url}, cb1);
			},
			function render (vtabs) {
				function calcSumm(items) {
					var summ = 0;
					for (var i = 0; i < items.length; i++) {
						var item = items[i];
						summ += item.value;
					}
					return 	Math.round(summ*100)/100;;
				}
				var funCalcSumm = function() {
					return function (text) {
						if (text == "ASSETS") return calcSumm(assets);
						if (text == "LIABILITIES") return calcSumm(liabilities);
					}
				}
				function getAssetsForHtml(assets_) {
					var s = "";
					for (var i = 0; i < assets_.length; i++) {
						var a = assets_[i];
						if (a.value==0 && a.childs.length==0) continue;
						s += "<div><a href='"+a.ahref+"'>"+a.name+"</a><span>"+a.value+" p.</span>";
						var ch = getAssetsForHtml(a.childs);
						if (ch !="") {
							s += ch;
						}
						s += "</div>\n";
					}
					return s;
				}
				var funAssets = function () {
					return function (text) {
						var str = "<div class=\"main\">\n";
						if (text == "ASSETS") str += getAssetsForHtml(assets);
						if (text == "LIABILITIES") str += getAssetsForHtml(liabilities);
						return str + "</div>\n";
					}
				}
				res.render(__dirname+"/../views/index", {prefix:prefix, tabs:vtabs, funAssets:funAssets, funCalcSumm:funCalcSumm});
			}],
			next
		);
	});
}
