var async = require("async");

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix

	app.get(prefix, function(req, res, next) {
		var t = [];
		async.waterfall([
			async.apply(cashapi.getAllAccounts,req.session.apiToken),
			function getAccountDetails (accounts,cb1) {
				async.forEachSeries(accounts,function(e, cb2) {
					cashapi.getAccountInfo(req.session.apiToken,e.id,["value"], function (err, d) {
						if (err) return cb2(err);
						value = Math.round(d.value * 100)/100;
						if (e.type != "EXPENSE" && e.type!= "INCOME" && value!=0)
							t.push({name:e.name,value:value,ahref:prefix+"/account?id="+e.id});
						cb2();
					})
				},cb1);
			},
			function (cb1) {
				webapp.guessTab(req, {pid:'home',name:'Home',url:req.url}, cb1);
			},
			function render (vtabs) {
				res.render(__dirname+"/../views/index", {prefix:prefix, accounts: t, tabs: vtabs });
			}],
			next
		);
	});
}
