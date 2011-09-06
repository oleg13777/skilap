var Step = require("step");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix

	app.get(prefix, function(req, res, next) {
		Step( 
			function getAccounts () {
				cashapi.getAllAccounts(this);
			},
			function getAccountDetails (err, accounts) {
				this.parallel()(null, accounts);
				var group = this.group();
				_.forEach(accounts,(function (e) {
					cashapi.getAccountInfo(e.id,["value"], group());
				}));
			},
			function render (err, accounts, details) {
				var t = [];
				for (var i=0; i<_.size(accounts); i++) {
					var e = accounts[i]; var d = details[i];
					value = Math.round(d.value * 100)/100;
					if (e.type != "EXPENSE" && e.type!= "INCOME" && value!=0)
						t.push({name:e.name,value:value,ahref:prefix+"/account?id="+e.id}); 
				}
				res.render(__dirname+"/../views/index", {prefix:prefix, accounts: t });
			},
			next
		);
	});
}
