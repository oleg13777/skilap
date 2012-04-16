/** 
 * Module Imports
 * @ignore
 */
var _ = require('underscore');
var async = require('async');
var SkilapError = require("skilap-utils").SkilapError;

/**
 * Private helper class to store context
 * @ignore
 */
function CoreApi(ctx) {
	this._ctx = ctx;
	this._sessions = {};
	console.log("core api constructor");
	this._core_users = null;
	this._core_clients = null;
}

CoreApi.prototype.getLanguageSync = function(token) {
	var self = this;
	var s = self._sessions[token];
	if (s!=null)
		return s.user.language;
}

CoreApi.prototype.loadData = function (cb) {
	var self = this;
	async.waterfall([
		function (cb1) {
			self._ctx.getDB(cb1);
		},
		function (adb,cb1) {
			async.parallel([
				async.apply(adb.ensure, 'core_users',
					{type:'cached_key_map',buffered:true}),
				async.apply(adb.ensure, 'core_clients',
					{type:'cached_key_map',buffered:true})
			], function (err, results) {
				if (err) return cb1(err);
				self._core_users = results[0];
				self._core_clients = results[1];
				cb1();
			});
		}
	], cb)
}

/**
 * This should be first call to API. Function will return token that 
 * will be used for all next API calls.
 *
 * @param {String} appId some id that identifies client, might be GUID          
 * @param {String} clientId unique for this appId identity, like iPhone UDID
 * @param {String} signature for now just reserver
 *
 * @returns {String} some temporary valid identity to call other API functions
 */
CoreApi.prototype.getApiToken = function (appId, clientId, signature, cb) {
	var self = this;

	// 1st steep, check that appId+clientId are correct (signature matches)
	// this will later also check that app is known and so on
	
	var apiToken = null;
	var user;

	async.waterfall([
		// generate unique id
		function (cb1) {
			async.whilst(function () { 
					return apiToken==null || self._sessions[apiToken]!=null;
				}, function (cb2) {
					self._ctx.getRandomString(64, function (err, rnd) {
						apiToken = rnd;
						cb2();
					})
				}, function (err) {
					cb1(err);
				})
		},
		function (cb1) {
			self._core_clients.get(clientId,cb1);
		},
		function (client,cb1) {
			if (client==null) return cb1(new Error());
			self._core_users.get(client.uid,cb1);
		},
		function (user_, cb1) {
			if (user_==null) return cb1(new Error());
			user = user_;
			user.type = 'user';
			cb1();
		}
	], function (err) {
		if (err) {
			user = {type:'guest'};
		}
		var session = {user:user,clientId:clientId,appId:appId};
		self._sessions[apiToken] = session;
		cb(null, apiToken);
	});
}

/**
 * Check permission based on requested options. Option is coma delimited
 * string like _core.users.view_. Function allows to check multiple options
 * using condition
 * 
 * @param {String} token access token
 * @param {Mixed} opts single or multiple options
 * 
 * @throws {AccessDenied} when permission is not meet
 */ 
CoreApi.prototype.checkPerm = function (token, opts, cb) {
	var self = this;
	var perm = opts[0];
	var session = self._sessions[token];
	if (!session) 
		return cb(new SkilapError('Wrong access token','InvalidToken'));
	if (session.user.type=='admin') {
		// admin is valid only for core
		if (perm.indexOf('core')==0) 
			cb()
		else
			cb(new SkilapError('Admin user can do only administrative tasks'
				,'AccessDenied'));
	}
	else if (session.user.type=="guest")
		cb(new SkilapError(self._ctx.i18n(token, 'core', 'Access denied')
			,'AccessDenied'));
	else 
		cb();
}

/**
 * Get all users
 * 
 * @param {String} token api token
 * @returns {Array} list of all users
 */
CoreApi.prototype.getAllUsers = 	function (token, cb) {
	var self = this;

	async.series ([
		function start(cb1) {
			async.parallel([
				function (cb) { self.checkPerm(token,['core.user.view'],cb) }
			],cb1);
		}, 
		function get(cb1) {
			var users = [];
			self._core_users.scan(function (err, key, acc) {
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

/**
 * Get session user
 * 
 * @param {String} token api token
 */
CoreApi.prototype.getUser = function (token, cb) {
	var self = this;

	var session = self._sessions[token];
	if (!session) 
		return cb(new SkilapError('Wrong access token','InvalidToken'));
	cb(null, _(session.user).clone());
}

CoreApi.prototype.getUserById = function(token, userId, cb) {
	var self = this;

	async.series ([
		function start(cb1) {
			async.parallel([
				function(cb1) { self.checkPerm(token, ['core.user.view'], cb1) }
			],cb1);
		}, 
		function get(cb1) {
			self._core_users.get(userId, function (err, user) {
				if (err) cb1(err);
				cb1(null, user);
			});
		}], function end(err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
	)
}

/**
 * Save user or create new if id is absent
 * 
 * @param {String} token access token
 * @param {User} newUser new user
 * 
 * @returns {User} Updated or created user
 */
CoreApi.prototype.saveUser = function (token, newUser, cb) {
	var self = this;

	var session = self._sessions[token];
	if (!session) 
		return cb(new SkilapError('Wrong access token','InvalidToken'));
	
	if (session.user.type=='guest') {
		// special case for guest user, changes are temporary
		// allow update only certain fields
		var user = session.user;
		if (newUser.language) user.language = newUser.language;				
		if (newUser.timezone) user.timezone = newUser.timezone;				
		cb();
	} else if (newUser.id) {
		// update 
		async.waterfall([
			function (cb1) { self.checkPerm(token, ['core.user.edit'], cb1) },
			function (cb1){
				self._core_users.get(newUser.id, function (err, user) {
					if (err) cb1(err);
					cb1(null, user);
				});
			},
			function updateUser (updUser,cb1) {
				if (newUser.firstName) updUser.firstName=newUser.firstName;
				if (newUser.lastName) updUser.lastName=newUser.lastName;
				if (newUser.login) updUser.login=newUser.login;
				if (newUser.oldPass && newUser.newPass && newUser.reNewPass){
					if (updUser.password != newUser.oldPass)
						return cb(new SkilapError("Wrong old password"))
					else if (newUser.newPass != newUser.reNewPass)
						return cb(new SkilapError("New passwords do not match"));
					else 
						updUser.password = newUser.newPass;
				}
				if (newUser.timeZone) updUser.timeZone = newUser.timeZone;
				if (newUser.language) updUser.language = newUser.language;
				if (newUser.permissions) updUser.permissions = newUser.permissions;
				self._core_users.put(updUser.id, updUser, cb1);
			}
		], cb);
	} else {
		// create new
		async.waterfall([
			function (cb1) { self.checkPerm(token, ['core.user.edit'], cb1)},
			function checkUserUniq (cb1) {
				var unique = true;
				self._core_users.scan(function (err, key, user) {
					if (key==null)
						unique?cb1():cb1(new Error('User log-in is not unique'));
					else {
						if (user.login == newUser.login)
							unique = false;
					}
				},true)
			},
			function (cb) {self._ctx.getUniqueId(cb) },
			function save(newId, cb1) {
				var user = {id:newId, permissions: []};
				if (newUser.firstName) 
					user.firstName=newUser.firstName;
				else
					return cb(new SkilapError("First name is empty"));
				if (newUser.lastName) 
					user.lastName=newUser.lastName;
				else
					return cb(new SkilapError("Last name is enpty"));
				if (newUser.login) 
					user.login=newUser.login;
				else
					return cb(new SkilapError("Login is empty"));
				if (newUser.pass != newUser.rePass)
					return cb(new SkilapError("Passwords do not match"));
				else 
					user.password = newUser.newPass;
				if (newUser.timeZone) user.timeZone = newUser.timeZone;
				if (newUser.language) user.language = newUser.language;
				if (newUser.permissions) user.permissions = newUser.permissions;

				self._core_users.put(newId, user, cb1);
			}
		], cb)
	}
}

/**
 * Log-in user by pass. If succeeded next calls to API will be done
 * on behalf of logged-in user.
 * 
 * @param {String} token access token
 * @param {String} login user name
 * @param {String} password plain password
 * 
 * @throws {InvalidData} when login or pass is wrong
 */	
CoreApi.prototype.loginByPass = function (token, login, password, cb ) {
	var self = this;

	var won = false;
	self._core_users.scan(function (err, key, user) {
		if (err) cb1(err);
		if (key) {
			if (user.login == login && user.password == password) {
				user.type = 'user';
				var s = self._sessions[token];
				s.user = user;
				self._core_clients.put(s.clientId,
					{uid:s.user.id,date:new Date(),appId:s.appId}, function () {});
				cb(null, user);
				won = true;
			}
		} else {
			// special case, hardcoded admin user
			if (login == 'admin' && password == 'skilap') {
				self._sessions[token].user = {type:'admin',screenName:'Server Owner'};
				cb(null, self._sessions[token].user);
			} else if (!won)
				cb(new SkilapError(self._ctx.i18n(token,'core','Log-in failed')
					,'InvalidData'));
		}
	},true);
}

CoreApi.prototype.logOut = function (token, cb) {
	var self = this;

	self._sessions[token].user = {type:"guest"};
	cb();
}

CoreApi.prototype.deleteUser = function(token, userId, cb) {
	var self = this;

	console.log("delete");
	async.series ([
		function start(cb1) {
			async.parallel([
				function (cb2) { self.checkPerm(token, ['core.user.edit'], cb2)}
			],cb1);
		}, 
		function get(cb1) {
			self._core_users.put(userId, null, cb1);
		}], function end(err, results) {
			console.log(results);
			if (err) return cb(err);
			cb(null, true);
		}
	)
}

/**
 * Internal init function
 * @ignore
 */
module.exports.init = function (ctx, cb) {
	var api = new CoreApi(ctx);
	api.loadData(function (err) {
		if (err) return cb(err);
		var m = {api:api,localePath:__dirname+'/../locale'};
		
		m.getPermissionsList = function (token, cb) {
			var res = [];
			res.push({id:'core.me.view', desc:ctx.i18n(token, 'core', 'View personal data')});
			res.push({id:'core.me.edit', desc:ctx.i18n(token, 'core', 'Edit personal data')});
			res.push({id:'core.users.view', desc:ctx.i18n(token, 'core', 'View system users')});
			res.push({id:'cash.users.edit', desc:ctx.i18n(token, 'core', 'Edit system users')});
			cb(null,res);
		}
		
		m.getModuleInfo = function (token, cb) {
			var i = {};
			i.name = ctx.i18n(token, 'core', 'Core module')
			i.desc = ctx.i18n(token, 'core', 'Primary system module. Provides system with common functionality and allows to administer it')
			i.url = '/core/';
			i.id = 'core';
			cb(null,i);
		}		
		
		cb(null, m);
	})
}
