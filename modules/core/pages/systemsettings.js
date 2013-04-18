var async = require("async");
var skconnect = require('skilap-connect');
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var ctx = webapp._ctx;
	var prefix = webapp.prefix;
	var api = webapp;		
	
	app.get(prefix+"/sysset", function(req, res, next) {
		async.series([
			function (cb) { api.checkPerm(req.session.apiToken, ["core.sysadm"], cb) },		
			function (cb) { ctx.getModulesInfo(req.session.apiToken, cb) },
			function (cb) { api.getSystemSettings("guest", cb) }
		], function (err, r) {
			if (err) return next(err);
			var guest = r[2];
			var permissions = [];
			_(r[1]).each(function(info){
				var tmp = {name:info.name, perm:[]};
				_(info.permissions).each(function(perm){
					perm.selected = _(guest.permissions).indexOf(perm._id) >= 0;
					tmp.perm.push(perm);
				});
				permissions.push(tmp);
			});
			
			var rdata = { prefix:prefix, header:true, sysSet:guest, permissions:permissions,pageSystemSettingsActive:1 };
			res.render(__dirname+"/../res/views/systemsetings", rdata);
		});
	})
}
