var async = require("async");
var skconnect = require('skilap-connect');
var _ = require('underscore');

module.exports = function account(ctx, app, api, prefix) {

	app.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/core"}));

	app.get(prefix+"/userprefferences", function(req, res, next) {
		async.waterfall([
			function render () {
				var rdata = {
						prefix:prefix,						
						mainLayoutHide:1,
						host:req.headers.host						
					};
				res.render(__dirname+"/../views/userprefferences", rdata);
			}],
			next
		);
	});		
	
	app.get(prefix+"/user", function(req, res, next) {
		async.waterfall([
			function (cb1) {
				async.parallel([
					function (cb2) { ctx.getModulesInfo(req.session.apiToken, cb2) },
					function (cb2) { api.getUser(req.session.apiToken, cb2) }
				], function (err, result) { cb1(err, result[0], result[1])});
			},
			function (modulesInfo, user, cb1) {
				var permissions = [];
				_(modulesInfo).each(function(info){
					var tmp = {module:info.name, perm:[]};
					_(info.permissions).each(function(perm){
						if (_(user.permissions).indexOf(perm.id) >= 0) {
							tmp.perm.push(perm.desc);
						}
					});
					permissions.push(tmp);
				});
				cb1(null, permissions, modulesInfo);
			},
			function (permissions, mInfo, cb1) {
				var rdata = {prefix:prefix, header:true, token:req.session.apiToken, host:req.headers.host, permissions:permissions, mInfo:mInfo};
				cb1(null, rdata);
			},
			function render (data) {
				res.render(__dirname+"/../views/user", data);
			}],
			next
		);
	});
}
