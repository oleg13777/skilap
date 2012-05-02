/**
 * Core
 */
var fs = require("fs");
var path = require("path");
var _ = require('underscore');

var alfred = require('alfred');
var async = require('async');
var Step = require("step");
var events = require("events");
var util = require("util");
var express = require('express');
var SkilapError = require("skilap-utils").SkilapError;
var Gettext = require("../vendor/Gettext");
var hogan=require('hogan');
var i18n = require('jsorm-i18n');

var tmpl = {
    compile: function (source, options) {	
		views = (options && options.settings && options.settings.views) || './views';
		var tc = hogan.compile(source);
		// we need overwrite for this specific template
		// rp (RenderPartials) function to provide partial content
		var orp = tc.rp;
		tc.rp = function (name, context, partials, indent) {
			var partial = partials[name];
			if (partial==null) {
				var partialFileName = views + '/' + name + (options.extension || '.mustache')
				partial = path.existsSync(partialFileName) ? fs.readFileSync(partialFileName, "utf-8") : "";
				partials[name]=hogan.compile(partial.toString());
			}
			return orp.call(this,name, context,partials, indent);
		}
		return function (options) {
			var html = tc.render(options,options.partials);
			if (options.body!=null) {
				html = html.replace("<content/>",options.body);
			}
			return html;
		}
	}
}

function Skilap() {
	var self = this;
	var sessions = {};
	var i18l = {};
	var _adb = null;
	var tmodules = [
		{name:"core",require:"./coreapi"},
		{name:"cash",require:"skilap-cash"}
		];
	var self = this;
	var modules = {};
	var webapp = null;
	var core_users = null;
	var core_clients = null;
	var storepath;
	this.webapp;

	this.startApp = function (storepath_, cb) {
		process.on('uncaughException', function (e) {
			console.log(e);
			console.trace();
		})
		console.time("startApp");
		storepath = storepath_;
		async.series([
			function initBasics(cb1) {
				var app = module.exports = express.createServer();

				// Configuration
				app.configure(function(){
					app.set('view engine', 'mustache');
					app.set('view options',{layout:true});					
					app.register(".mustache", tmpl);
					app.use(express.bodyParser());
					app.use(express.methodOverride());
					app.use(express.cookieParser());
					app.use(express.session({ secret: 'PushOk' }));
					app.use(function (req, res, next) {
						if (req.cookies['skilapid']==null) {
							var clientId; self.getRandomString(128, function (err, rnd) { clientId = rnd; });
							res.cookie('skilapid',clientId, { maxAge: 1000*60*60*24*5, path: '/' });
							res.cookie('sguard','1', { maxAge: 1000*60*60*24*5, path: '/', secure:true });
						}
						async.series([
							function ensureToken (cb3) {
								if (req.session.apiToken==null) {
									modules['core'].api.getApiToken('default',req.cookies['skilapid'],'fake',function (err, apiToken) {
										req.session.apiToken = apiToken;
										cb3();
									});
								} else cb3();
							}],	function secureGuard (err) {
								modules['core'].api.getUser(req.session.apiToken, function (err, user) {
									if (user.type != 'guest' && req.cookies['sguard']==null) {
										console.log('Redirect to secure');
										res.redirect('https://'+req.headers.host+req.url);
									} else next();
								});
							}
						)
					});
					// common data grabber
					app.use(function (req, res, next) {
						modules['core'].api.getUser(req.session.apiToken, function (err, user) {
							if (err) next(err);
							if (!user.language) {
								// guess language 
								var al = req.headers['accept-language'];
								var re = al.match(/\w\w-\w\w/i);
								var guesslang = null;
								if (re.length>0) {
									user.language = re[0][0]+re[0][1]+'_'+re[0][3].toUpperCase()+re[0][4].toUpperCase();
									modules['core'].api.saveUser(req.session.apiToken,user, function () {});
								}
							}
							if (user.password) delete user.password;
							user.loggedin = user.type!='guest';
							req.skilap = {user:user};
							next();
						});
					});					
					app.use(app.router);
					app.use(function (err,req,res,next) {
						if (err.skilap) {
							if (err.skilap.subject = 'AccessDenied') {
								if (req.cookies['sguard']==null) {
									console.log('Log-in should be secure');
									res.redirect('https://'+req.headers.host+req.url);
								} else { 
									console.log(err);
									res.render(__dirname+'/../views/accessDenied', {layout:false, prefix:'',success:req.url});
								}
							} else next(err);
						} else
							next(err);
					});
					app.dynamicHelpers({
						i18n: function(req, res){
							var domain, re = req.url.match(/\/(\w+)[/?#]?/i);
							domain = re?re[1]:"core";
							return function () { return function (text, render) {
								return self.i18n(req.session.apiToken, req.skilap.ldomain || domain, text);
							}};
						},
						i18n_domain: function(req, res){
							return function () { return function (text, render) {
								req.skilap.ldomain = text;
								return '';
							}};
						},						
						apiToken: function (req,res) {
							return req.session.apiToken;
						},
						user: function (req, res) {
							var user = _(req.skilap.user).clone();
							user.perm = {};
							if (!user.permissions)
								user.permissions = ['core.me.view'];
							_(user.permissions).reduce(function (ctx,val) {
								var fname=val.replace(/\./g,'_');
								ctx[fname]=1;
								return ctx;
							},user.perm);
							delete user.permissions;
							return user;
						},
						url: function (req, res) {
							return req.url;
						}

					})
				});

				app.configure('development', function(){
				  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
				});

				app.configure('production', function(){
				  app.use(express.errorHandler());
				});

				self.webapp = webapp = app;

				console.time("OpenDB");
				async.series ([
					function (cb1) {
						alfred.open(storepath+'db',{}, cb1);
					}], function (err, results) {
						console.timeEnd("OpenDB");
						if (err) return cb1(err);
						_adb = results[0];
						cb1();
					}
				);
				
				app.get("/login", function (req, res, next) {
					if (req.cookies['sguard']==null) {
						console.log('Log-in should be secure');
						res.redirect('https://'+req.headers.host+req.url);
					} else { 
						res.render(__dirname+'/../views/login', {prefix:'/core',success:req.params.success || '/'});
					}
				})

				app.post("/login", function (req,res,next) {
					async.series([
						function (cb) { modules['core'].api.loginByPass(req.session.apiToken, req.body.name, req.body.password, cb) }
					], function (err, user) {
						if (err) {
							console.log(err);
							res.redirect(req.body.success);
						}
						else
							res.redirect(req.body.success);
					});
				});

				app.get("/logout", function (req, res, next){
					res.clearCookie("skilapid");
					res.clearCookie("sguard");
					res.clearCookie("connect.sid");
					modules['core'].api.logOut(req.session.apiToken, function() { 
						var r = req.param.success || '/';
						res.redirect(r);
					});
				});
				
				function handleJsonRpc(jsonrpc, req, res, next) {
					var id = null; var out = false;
					try {
						id = jsonrpc.id;
						var func = jsonrpc.method.match(/^(.*)\.(.*)$/);
						var module = func[1];
						func = func[2];
						var api = modules[module].api;
						var fn = api[func];
						var params = jsonrpc.params;
						params.push(function () {
							var jsonres = {};
							if (arguments[0]) {
								var err = arguments[0];
								jsonres.error = {message:err.message,subject:err.skilap?err.skilap.subject:"GenericError"}
								jsonres.result = null;
							} else {
								jsonres.error = null;
								jsonres.result = Array.prototype.slice.call(arguments,1);
							}
							jsonres.id = jsonrpc.id;
							res.send(jsonres);
						})
						fn.apply(api, params);
						out = true;
					} catch (err) {
						console.log(err);
						if (!out) 
							res.send({error:{message:err.message,subject:err.skilap?err.skilap.subject:"GenericError"}, result:null, id:id});
					}
				};

				app.get("/jsonrpc", function (req, res, next) {
					handleJsonRpc(req.query.jsonrpc, req, res, next);
				})
				app.post("/jsonrpc", function (req,res,next) {
					handleJsonRpc(req.body, req, res, next);
				})
			},
			function initModules(cb1) {
				async.forEachSeries(tmodules, function (minfo, cb2) {
					console.time(minfo.name);
					var module = require(minfo.require);
					module.init(self,function (err, moduleObj) {
						if (err) return cb2(err);
						modules[minfo.name]=moduleObj;
						if (moduleObj.localePath) {
							_.forEach(fs.readdirSync(moduleObj.localePath), function (file) {
								var re = file.match(/.*\.(.*)\.po/i);
								if (re) {
									var lc = re[1];
									if (i18l[lc]==null)
										i18l[lc] = new Gettext();
									var gt = i18l[lc];
									var parsed = gt.parse_po(""+fs.readFileSync(moduleObj.localePath+"/"+file));
									var rv = {}; var domain = minfo.name;
									// munge domain into/outof header
									if (parsed) {
										if (! parsed[""]) parsed[""] = {};
										if (! parsed[""]["domain"]) parsed[""]["domain"] = domain;
										domain = parsed[""]["domain"];
										rv[domain] = parsed;
										gt.parse_locale_data(rv);
									}
								}
							})
						}
						console.timeEnd(minfo.name);
						cb2();
					});
				},cb1);
			}],
			function end(err) {
				console.timeEnd("startApp");
				if (err) cb(err);
				require("../pages/user")(self,webapp,modules['core'].api,"/core");
				require("../pages/users")(self,webapp,modules['core'].api,"/core");
				require("../pages/index")(self,webapp,modules['core'].api,"/core");
				require("../pages/systemsettings")(self,webapp,modules['core'].api,"/core");

				var options = {
					key: fs.readFileSync(path.resolve('./privatekey.pem')),
					cert: fs.readFileSync(path.resolve('./certificate.pem'))
				};
				var https = express.createServer(options);
				var http = express.createServer();
				https.use(webapp);
				http.use(webapp);
				https.listen(443);
				http.listen(80);

				 //console.log("Express server listening on port %d in %s mode", webapp.address().port, webapp.settings.env);
				self.emit("WebStarted");
				cb();
			}
		);
	}

	this.getDB = function (cb) {
		cb(null,_adb);
	}

	this.getModule = function (name, cb) {
		cb(null, modules[name]);
	}

	this.getModulesInfo = function (langtoken, cb) {
		var ret = [];
		async.forEachSeries(_(modules).values(), function (module,cb) {
			module.getModuleInfo(langtoken, function (err, mi) {
				module.getPermissionsList(langtoken, function (err, perm) {
					ret.push({id:mi.id, name:mi.name, desc:mi.desc, url:mi.url, permissions:perm});
					cb();
				})
			})
		}, function () {
			cb(null, ret);
		})
	}

	this.getWebApp = function (cb) {
		cb(null, webapp);
	}

	this.getUniqueId = function(cb) {
		var id = parseInt(fs.readFileSync(storepath+"unique.id","utf-8"));
		id++; fs.writeFileSync(storepath+"unique.id",id.toString());
		process.nextTick(function () { cb(null,id)});
	}

	this.getRandomString = function (bits,cb) {
		var chars,rand,i,ret;
		chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
		ret='';
		// in v8, Math.random() yields 32 pseudo-random bits (in spidermonkey it gives 53)
		while (bits > 0) {
			rand=Math.floor(Math.random()*0x100000000) // 32-bit integer
			// base 64 means 6 bits per character, so we use the top 30 bits from rand to give 30/6=5 characters.
			for(i=26; i>0 && bits>0; i-=6, bits-=6) ret+=chars[0x3F & rand >>> i]
		}
		return cb(null,ret);
	}

	this.i18n = function (langtoken,domain,text1,text2,n)  {
		// 1st guess langtoken is langtoken exactly as it is
		var gt = i18l[langtoken];
		// 2nd guess, langtoken is api token and it can have a language
		if (gt==null) {
			var lc = modules['core'].api.getLanguageSync(langtoken);
			if (lc)
				gt = i18l[lc];
		}
		// 3nd guess, system default
//		if (gt==null)
//			gt = i18l['ru_RU']; // TODO: we need to have system default language
		// final guess, fallback to empty one (dummy)
		if (gt!=null)
			return gt.dgettext(domain, text1);
		else 
			return text1;
	}
	
	this.i18n_cytext = function(langtoken,curId,value) {
		var cur = i18n.currency(curId);
		var res = cur.format(value);
		var m = res.match(/([^0123456789., ]*)([0123456789., ]*)([^0123456789., ]*)/);
		if (m && m.length>3)
			return m[1]+" "+m[2]+ " "+m[3];
		else 
			return res;
	}

	this.i18n_cyval = function(curId,value) {
		var cur = i18n.currency(curId);
		var res = cur.format(value);		
		res = res.replace(/[^0123456789.-]/g,'');
		return res;
	}
	
	var currencies = null;
	this.i18n_getCurrencies = function (langtoken, cb) {
		if (currencies!=null) cb(null, currencies);
		var res = [];
		var cu = i18n.currency().getCurrencies();
		_(cu).forEach(function(cid) {
			var cur = i18n.currency(cid);
			var sa = cur.format(0);
			sa= sa.replace(/[0123456789. ]/g,'');
			res.push({iso:cid,name:cur.getName(),symbol:sa,country:cur.getCountry()});
		})
		currencies = res;
		cb(null, res);
	}
	
}

util.inherits(Skilap, events.EventEmitter);

module.exports.createApp = function () {
	return new Skilap();
}
