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
						if (_(user.permissions).indexOf(perm.id) >= 0)
							tmp.perm.push({id: perm.id, desc: perm.desc, val: true});
						else
							tmp.perm.push({id: perm.id, desc: perm.desc, val: false});
					});
					permissions.push(tmp);
				});
				cb1(null, permissions, modulesInfo, user.permissions);
			},
			function (permissions, mInfo, userPerm, cb1) {
				var rdata = {permissions:permissions, mInfo:mInfo, userPermissions:JSON.stringify(userPerm),pageUserActive:1};
				cb1(null, rdata);
			},
			function render (data) {
				res.render(__dirname+"/../res/views/user", data);
			}],
			next
		);
	});
}
