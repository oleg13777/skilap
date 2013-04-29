var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var ctx = webapp._ctx;
	var prefix = webapp.prefix;
	var api = webapp;		

	app.get(prefix+"/userprefferences", webapp.layout(), function(req, res, next) {
		async.waterfall([
			function render () {
				var rdata = {
						prefix:prefix,						
						mainLayoutHide:1,
						host:req.headers.host						
					};
				res.render(__dirname+"/../res/views/userprefferences", rdata);
			}],
			next
		);
	});
	
	app.get(prefix+"/userpermisions", function(req, res, next) {
		async.waterfall([
			function (cb1) {
				async.parallel([
					function (cb2) { ctx.getModulesInfo(req.session.apiToken, cb2) },
					function (cb2) { api.getUser(req.session.apiToken, cb2) }
				], function (err, result) { cb1(err, result[0], result[1])});
			},
			function render (mInfo, user) {
				var rdata = {
						prefix:prefix,						
						mainLayoutHide:1,
						host:req.headers.host,
						mInfo:mInfo
					};
				res.render(__dirname+"/../res/views/userpermisions", rdata);
			}],
			next
		);
	});
	
	app.get(prefix+"/user", webapp.layout(), function(req, res, next) {
		var user_ = null;
		async.waterfall([
			function (cb) {
				api.getUser(req.session.apiToken, cb);
			},
			function (user, cb) {
				user_ = user;
				api.getUserPermissions(req.session.apiToken, user, cb);
			},
			function (permissions) {
				res.render(__dirname+"/../res/views/user", {permissions:permissions, user_: user_});
			}],
			next
		);
	});
}
