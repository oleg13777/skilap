var async = require("async");

module.exports = function account(webapp) {
	var app = webapp.web;
	var ctx = webapp._ctx;
	var prefix = webapp.prefix;
	var api = webapp;		

	app.get(prefix+"/users", webapp.layout(), function(req, res, next) {
		async.waterfall([
			function (cb) { api.getAllUsers(req.session.apiToken,cb); },
			function render (users) {
				res.render(__dirname+"/../res/views/users", {prefix:prefix, users: users, header:true, tittle: "Sistem users", host:req.headers.host,pageUsersActive:1});
			}],
			next
		);
	});

	app.post(prefix+"/users/new", function (req, res, next) {
		var user = {screenName:req.body.name,login:req.body.login,password:req.body.password};
		async.series([
			async.apply(api.saveUser,req.session.apiToken,user),
		], function (err) {
			res.redirect(prefix+"/users");
		});
	});
};
