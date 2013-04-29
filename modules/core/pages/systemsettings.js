var async = require("async");
var skconnect = require('skilap-connect');
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var ctx = webapp._ctx;
	var prefix = webapp.prefix;
	var api = webapp;		
	
	app.get(prefix+"/sysset", webapp.layout(), function(req, res, next) {
		async.series([
			function (cb) { api.checkPerm(req.session.apiToken, ["core.sysadmin"], cb); },		
			function (cb) { ctx.getModulesInfo(req.session.apiToken, cb); },
			function (cb) { api.getSystemSettings("guest", cb); },
		], function (err, r) {
			if (err) return next(err);
			var guest = r[2];
			guest.type = "guest";
			
			api.getUserPermissions(req.session.apiToken, guest, function(err, permissions) { 
				var rdata = { prefix:prefix, 
						header:true, 
						sysSet:guest, 
						pageSystemSettingsActive:1,
						user_: guest,
						mInfo: r[1],
						permissions:permissions,
				};
				res.render(__dirname+"/../res/views/systemsetings", rdata);
			});
		});
	})
}
