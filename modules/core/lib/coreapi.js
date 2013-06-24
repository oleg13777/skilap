/** 
 * Module Imports
 * @ignore
 */
var _ = require('underscore');
var async = require('async');
var safe = require('safe');
var SkilapError = require("skilap-utils").SkilapError;
var vstatic = require('pok_utils').vstatic;
var handlebarsMiddleware = require('pok_utils').handlebarsMiddleware;
var lessMiddleware = require('less-middleware');

/**
 * Private helper class to store context
 * @ignore
 */
function CoreApi(ctx) {
	this._ctx = ctx;
	this._sessions = {};
	this._core_users = null;
	this._core_clients = null;
	this._core_systemSettings = null;
	this.prefix = "/core";
}

CoreApi.prototype.getLanguageSync = function(token) {
	var self = this;
	var s = self._sessions[token];
	if (s!=null)
		return s.user.language;
};

CoreApi.prototype.loadData = function (cb) {
	var self = this;
	self._ctx.getDB(safe.sure(cb, function (adb) {
		async.parallel({
			_core_users:function (cb) {
				adb.collection('core_users',cb);
			},
			_core_clients:function (cb) {
				adb.collection('core_clients',cb);
			},
			_core_systemSettings:function (cb) {
				adb.collection('core_system_settings',cb);
			}
		}, safe.sure_result(cb, function (results) {
			_.extend(self,results);
		}));
	}));
};

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
	var user = null;

	async.waterfall([
		// generate unique id
		function (cb1) {
			async.whilst(function () { 
					return apiToken==null || self._sessions[apiToken]!=null;
				}, function (cb2) {
					self._ctx.getRandomString(64, function (err, rnd) {
						apiToken = rnd;
						cb2();
					});
				}, function (err) {
					cb1(err);
				});
		},
		function (cb1) {
			self._core_clients.findOne({"clientId" : clientId},cb1);
		},
		function (client,cb1) {
			if (client==null) return cb1(null,null);
			self._core_users.findOne({"_id" : client.uid},cb1);
		},
		function (user_, cb1) {
			if (user_==null) {
				// guest case
				self.getSystemSettings("guest", function (err, defaults) {
					if (err) return cb(err);
					user = {type:'guest'};
					_.defaults(user,defaults);
					cb1();
				});
			} else {
				user = user_;
				user.type = 'user';
				cb1();
			}
		}
	], function (err) {
		if (err) return cb(err);
		var session = {user:user, clientId:clientId,appId:appId};
		self._sessions[apiToken] = session;
		cb(null, apiToken);
	});
};

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
	var session = self._sessions[token];
	if (!session) 
		return cb(new SkilapError('Wrong access token','InvalidToken'));
	if (_.intersection(opts, session.user.permissions).length>0) 
		cb();
	else
		cb(new SkilapError(self._ctx.i18n(token, 'core', 'Access denied')
			,'AccessDenied'));
};

/**
 * Get all users
 * 
 * @param {String} token api token
 * @returns {Array} list of all users
 */
CoreApi.prototype.getAllUsers = function (token, cb) {
	var self = this;

	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self.checkPerm(token,['core.user.view'],cb); }
			],cb);
		}, 
		function (cb) {
			self._core_users.find({}).toArray(cb);
		}], function (err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
	);
};

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
};

CoreApi.prototype.getUserById = function(token, userId, cb) {
	var self = this;

	async.series ([
		function (cb) {
			self.checkPerm(token, ['core.user.view'], cb);
		}, 
		function (cb) {
			if (!userId)
				self.getSystemSettings("guest", function (err, defaults) {
					if (err) return cb(err);
					user = {type:'guest'};
					_.defaults(user,defaults);
					cb(null, user);
				});
			else
				self._core_users.findOne({'_id': new self._ctx.ObjectID(userId.toString())}, cb);
		}], function (err, results) {
			if (err) return cb(err);
			cb(null, results[1]);
		}
	);
};

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
	var cUser = null;
	
	if (!_(newUser).isObject())
		return cb(new SkilapError("User must be object","GenericError"));
	
	var session = self._sessions[token];
	if (!session) 
		return cb(new SkilapError('Wrong access token','InvalidToken'));
	
	if (newUser.type=='guest' || newUser.type=='admin') {
		// special case for guest user, changes are temporary
		// allow update only certain fields
		var user = session.user;
		if (newUser.language) user.language = newUser.language;				
		if (newUser.timezone) user.timezone = newUser.timezone;				
		cb();
	} else {
		async.series([
			function checkPermision(cb) { self.checkPerm(token, ['core.user.edit'], cb); },
			function fetchUser(cb) {
				if (!newUser._id) return cb();
				self._core_users.findOne({'_id': new self._ctx.ObjectID(newUser._id)}, function (err, user) {
					if (err) return cb(err);
					if (user) {
						cUser = _.clone(user);
						cb();
					} else
						cb(new SkilapError("Invalid user", "GenericError"));
				});
			},
			function makeUser(cb) {
				if (cUser == null) {
					cUser = _(newUser).clone();
				} else {
					// if screenName doesn't provided, delete it to recreate automatically
					var screenName = _.isUndefined(newUser.screenName);
					_(cUser).extend(newUser);					
					if (screenName && !_.isUndefined(cUser.screenName) )
						delete cUser.screenName;
				}
				cb();
			},
			function validateUser(cb) {
				if (_(cUser.password).isUndefined())
					return cb(new SkilapError(self._ctx.i18n(token,'core','User must have non empty password'),'InvalidData'));
				if (cUser.password.length<6)
					return cb(new SkilapError(self._ctx.i18n(token,'core','Password too short, at least 6 characters required'),'InvalidData'));
				if (_(cUser.login).isUndefined())
					return cb(new SkilapError(self._ctx.i18n(token,'core','User must have non empty password'),'InvalidData'));
				if (_(cUser.firstName).isUndefined() || cUser.firstName.length<1) 
					return cb(new SkilapError(self._ctx.i18n(token,'core','First name is required'),'InvalidData'));
				if (_(cUser.lastName).isUndefined()  || cUser.lastName.length<1) 
					return cb(new SkilapError(self._ctx.i18n(token,'core','Last name is required'),'InvalidData'));
				// make sure screenName has something
				if (_(cUser.screenName).isUndefined())
					// Pupkin V.
					cUser.screenName = cUser.lastName + " " + cUser.firstName[0] + ".";
				cb();
			},
			function checkUserUniq (cb) {
				var query = {'login': cUser.login };
				if (cUser._id)
					query._id = { $ne : new self._ctx.ObjectID(cUser._id) };
				self._core_users.findOne(query, safe.sure(cb, function (user) {
					user?cb(new SkilapError(self._ctx.i18n(token,'core','User log-in is not unique'),'InvalidData')):cb();
				}));
			},
			function updateUser (cb) {
				if (cUser._id) cUser._id = new self._ctx.ObjectID(cUser._id);
				self._core_users.save(cUser, cb);
			},
			function updateSessionUser(cb) {
				if (cUser._id.toString() == session.user._id.toString()) {
					session.user = cUser;
				}
				cb();
			}
		], function (err,res) {
			cb(err,cUser);
		});
	}
};

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

	// special case, hardcoded admin user
	if (login == 'admin' && password == 'skilap') {
		self._sessions[token].user = {type:'admin',permissions:[],screenName:self._ctx.i18n(token,'core','Ski Master'),_id: new self._ctx.ObjectID()};
		self._ctx.getModule('core',function (err, core) {
			core.getPermissionsList(token, function (err, perm) {
				self._sessions[token].user.permissions = _(perm).pluck("id");
				cb(null, self._sessions[token].user);
			});
		});
		return;
	}
	self._core_users.findOne({"login": login, "password": password}, function (err, user) {
		if (err) return cb(err);
		if (!user)
			return cb(new SkilapError(self._ctx.i18n(token,'core','Log-in failed')
					,'InvalidData'));
		user.type = 'user';
		var s = self._sessions[token];
		s.user = user;
		self._core_clients.insert({clientId: s.clientId, uid: s.user._id, date: new Date(), appId: s.appId}, function () {
			cb(null, user);
		});
	});
};

CoreApi.prototype.logOut = function (token, cb) {
	var self = this;
	delete self._sessions[token];
	cb();
};

CoreApi.prototype.deleteUser = function(token, userId, cb) {
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self.checkPerm(token, ['core.user.edit'], cb); }
			],cb);
		}, 
		function (cb) {
			self._core_users.remove({'_id': new self._ctx.ObjectID(userId)}, cb);
		}], function (err, results) {
			cb(err, true);
		}
	);
};

CoreApi.prototype.getSystemSettings = function(id, cb) {
	var self = this;

	async.series ([
		function get(cb) {
			if (id == "guest") {
				self._core_systemSettings.findOne({"type" : id}, cb);
			} else
				self._core_systemSettings.findOne({"_id" : new self._ctx.ObjectID(id)}, cb);
		}], function end(err, results) {
			if (err) return cb(err);
			var res = results[0]||{};
			if (id == "guest")
				res.type = "guest";
			// TODO: not need to be hardcoded, probably every module have to provide defaults
			// for setting, but now lets leave it this way
			res = _.defaults(res, {timeZone:0, language:"en_US", permissions:[]});
			cb(null, res);
		}
	);
};

CoreApi.prototype.saveSystemSettings = function(token, id, settings, cb) {
	delete settings._id;
	var self = this;
	async.waterfall ([
		function (cb) {
			self.checkPerm(token, ['core.sysadmin'], cb);
		},
		function (cb) {
			self.getSystemSettings(id, cb);
		},
		function (old, cb) {
			var s = _.clone(old); 
			_.extend(s, settings);
			self._core_systemSettings.save(s, cb);
		}], cb
	);
};

CoreApi.prototype.layout = function () {
	var self = this;
	return function (req,res,next) {
		res.locals.layout = "layout";
		next()
	}
};

CoreApi.prototype.getUserPermissions = function(token, user, cb) {
	var self = this;

	async.waterfall([
 		function (cb) {
			self.checkPerm(token, ['core.user.view'], cb);
		}, 
		function (cb1) {
			async.parallel([
				function (cb2) { self._ctx.getModulesInfo(token, cb2) },
				function (cb2) { 
					if (user.type=='admin')
						cb2(null, user);
					else if (user.type=='guest')
						self.getSystemSettings('guest', cb2);
					else
						self.getUserById(token, user._id, cb2) }
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
			cb1(null, permissions);
		}], cb
	);
};



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
			res.push({id:'core.user.view', desc:ctx.i18n(token, 'core', 'View system users')});
			res.push({id:'core.user.edit', desc:ctx.i18n(token, 'core', 'Edit system users')});
			res.push({id:'core.sysadmin', desc:ctx.i18n(token, 'core', 'Edit system parameters')});
			cb(null,res);
		};
		
		m.getModuleInfo = function (token, cb) {
			var i = {};
			i.name = ctx.i18n(token, 'core', 'Core module');
			i.desc = ctx.i18n(token, 'core', 'Primary system module. Provides system with common functionality and allows to administer it');
			i.url = '/core/';
			i._id = 'core';
			cb(null,i);
		};		
		
		m.initWeb = function (webapp, cb) {
			var self = api;
			self.web = webapp;
			self.web.use(lessMiddleware({dest: __dirname + '/../public/css', src: __dirname + '/../res/less', prefix:'/core/css/'}));
			self.web.use(handlebarsMiddleware({dest: __dirname + '/../public/hbs', src: __dirname + '/../res/views', prefix:'/core/hbs/'}));
			self.web.use(vstatic(__dirname + '/../public',{vpath:"/core"}));
			require("../pages/index")(self);	
			require("../pages/user")(self);	
			require("../pages/users")(self);	
			require("../pages/systemsettings")(self);	
			cb();
		}		
		
		cb(null, m);
	});
};
