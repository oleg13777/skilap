var async = require("async");
var skconnect = require('skilap-connect');
var _ = require('underscore');

module.exports = function account(ctx, app, api, prefix) {

	app.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/core"}));

	app.get(prefix+"/sysset", function(req, res, next) {
		async.waterfall([
			function (cb1) {
				async.parallel([
					function (cb2) { ctx.getModulesInfo(req.session.apiToken, cb2) },
					function (cb2) { api.getSystemSettings(req.session.apiToken, null, cb2) }
				], function (err, result) { cb1(err, result[0], result[1])});
			},
			function (mInfo, sysSet, cb1) {
				var permissions = [];
				_(mInfo).each(function(info){
					var tmp = {module:info.name, perm:[]};
					_(info.permissions).each(function(perm){
						if (_(sysSet.perm).indexOf(perm.id) >= 0) {
							tmp.perm.push(perm.desc);
						}
					});
					permissions.push(tmp);
				});
				sysSet.permissions = permissions;
				var rdata = {prefix:prefix, header:true, sysSet:sysSet, mInfo:mInfo };
				cb1(null, rdata);
			},
			function render (data) {
				res.render(__dirname+"/../views/systemsetings", data);
			}],
			next
		);
	});
}
