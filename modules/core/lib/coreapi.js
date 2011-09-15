var _ = require('underscore');
var async = require('async');
var SkilapError = require("./SkilapError");

function CoreApi(ctx) {
	var sessions = {};
	var self = this;
	var core_users = null;
	var core_clients = null;

	this.getLanguageSync = function(token) {
		var s = sessions[token];
		if (s!=null)
			return "ru_RU";
	}

	this.loadData = function (cb) {
		async.waterfall([
			function (cb1) {
				ctx.getDB(cb1);
			},
			function (adb,cb1) {
				async.parallel([
					async.apply(adb.ensure, "core_users",{type:'cached_key_map',buffered:true}),
					async.apply(adb.ensure, "core_clients",{type:'cached_key_map',buffered:true})
				], function (err, results) {
					if (err) return cb1(err);
					core_users = results[0];
					core_clients = results[1];
					cb1();
				});
			}
		], cb)
	}

	this.getApiToken = function (appId, clientId, signature, cb) {
		// 1st steep, check that appId+clientId are correct (signature matches)
		// this will later also check that app is known and so on
		
		var apiToken = null;
		var user;

		async.waterfall([
			// generate unique id
			function (cb1) {
				async.whilst(function () { 
						return apiToken==null || sessions[apiToken]!=null;
					}, function (cb2) {
						ctx.getRandomString(64, function (err, rnd) {
							apiToken = rnd;
							cb2();
						})
					}, function (err) {
						cb1(err);
					})
			},
			function (cb1) {
				core_clients.get(clientId,cb1);
			},
			function (client,cb1) {
				if (client==null) return cb1(new Error());
				core_users.get(client.uid,cb1);
			},
			function (user_, cb1) {
				if (user_==null) return cb1(new Error());
				user = user_;
				cb1();
			}
		], function (err) {
			if (err) {
				user = {type:"guest"};
			}
			var session = {user:user,clientId:clientId,appId:appId};
			sessions[apiToken] = session;
			cb(null, apiToken);
		});
	}

	this.checkPerm = function (token, opts, cb) {
		var perm = opts[0];
		var session = sessions[token];
		if (!session) return cb(new SkilapError('Wrong access token','InvalidToken'));
		if (session.user.type=="admin") {
			// admin is valid only for core
			if (perm.indexOf("core")==0) 
				cb()
			else
				cb(new SkilapError('Admin user can do only administrative tasks','AccessDenied'));
		}
		else if (session.user.type=="guest")
			cb(new SkilapError(ctx.i18n(token, "core", "Access denied"),'AccessDenied'));
		else 
			cb();
	}

	this.getAllUsers = 	function (token, cb) {
		async.series ([
			function start(cb1) {
				async.parallel([
					async.apply(self.checkPerm,token,["core.user.view"])
				],cb1);
			}, 
			function get(cb1) {
				var users = [];
				core_users.scan(function (err, key, acc) {
					if (err) cb1(err);
					if (key) users.push(acc);
						else cb1(null, users);
					},
				true);
			}], function end(err, results) {
				if (err) return cb(err);
				cb(null, results[1]);
			}
		)
	}

	this.saveUser = function (token, newUser, cb) {
		if (newUser.id!=null) {
			// update 
			async.waterfall([
				async.apply(self.checkPerms,token,["core.user.edit"]),
				async.apply(core_users.get, newUser.id),
				function updateUser (updUser,cb1) {
					core_users.put(updUser.id, upUser, cb1);
				}
			], cb);
		} else {
			// create new
			async.waterfall([
				async.apply(self.checkPerm,token,["core.user.edit"]),
				function checkUserUniq (cb1) {
					var unique = true;
					core_users.scan(function (err, key, user) {
						if (key==null)
							unique?cb1():cb1(new Error("User log-in is not unique"));
						else {
							if (user.login == newUser.login)
								unique = false;
						}
					},true)
				},
				async.apply(ctx.getUniqueId),
				function save(newId, cb1) {
					newUser.id = newId;
					core_users.put(newId, newUser, cb1);
				}
			], cb)
		}
	}
	
	this.loginByPass = function (token, login, password, cb ) {
		var won = false;
		core_users.scan(function (err, key, user) {
			if (err) cb1(err);
			if (key) {
				if (user.login == login && user.password == password) {
					user.type = "user";
					var s = sessions[token];
					s.user = user;
					core_clients.put(s.clientId,{uid:s.user.id,date:new Date(),appId:s.appId}, function () {});
					cb(null, user);
					won = true;
				}
			} else {
				// special case, hardcoded admin user
				if (login == "admin" && password == "skilap") {
					sessions[token].user = {type:"admin",screenName:"Server Owner"};
					cb(null, sessions[token].user);
				} else if (!won)
					cb(new SkilapError(ctx.i18n(token,"core","Log-in failed"),"InvalidData"));
			}
		},true);
	}
}

module.exports.init = function (ctx, cb) {
	var api = new CoreApi(ctx);
	api.loadData(function (err) {
		if (err) return cb(err);
		cb(null, {api:api,localePath:__dirname+"/../locale"});
	})
}

