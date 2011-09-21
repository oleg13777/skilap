/**
 * Core
 */
var fs = require("fs");
var _ = require('underscore');

var alfred = require('alfred');
var async = require('async');
var Step = require("step");
var events = require("events");
var util = require("util");
var express = require('express');
var SkilapError = require("./SkilapError");
var Gettext = require("../vendor/Gettext");

function Skilap() {
	var self = this;
	var sessions = {};
	var i18l = {};
	var _adb = null;
	var tmodules = [{
		name:"core",require:"./coreapi",
		description:"Primary system module. Provides system with common functionality and allows to administer it."
		},{
		name:"cash",require:"skilap-cash",
		description:"Cash. Personal and familty finances. Inspired by gnucash."
		}];
	var self = this;
	var modules = {};
	var webapp = null;
	var core_users = null;
	var core_clients = null;
	var storepath;
	var dummyGT = new Gettext();
	this.webapp;

	this.startApp = function (storepath_, cb) {
		console.time("startApp");
		storepath = storepath_;
		async.series([
			function initBasics(cb1) {
				var app = module.exports = express.createServer();

				// Configuration
				app.configure(function(){
					app.set('view engine', 'mustache');
					app.register(".mustache", require('stache'));
					app.use(express.bodyParser());
					app.use(express.methodOverride());
					app.use(express.cookieParser());
					app.use(express.session({ secret: "PushOk" }));
					app.use(function (req, res, next) {
						if (req.cookies["skilapid"]==null) {
							var clientId; self.getRandomString(128, function (err, rnd) { clientId = rnd; });
							res.cookie("skilapid",clientId, { maxAge: 3600000, path: '/' });
						}
						if (req.session.apiToken==null) {
							modules['core'].api.getApiToken("default",req.cookies["skilapid"],"fake",function (err, apiToken) {
								req.session.apiToken = apiToken;
								next();
							});
						} else next();
					});
					app.use(app.router);
					app.use(function (err,req,res,next) {
						if (err.skilap) {
							if (err.skilap.subject = "AccessDenied") {
								console.log(err);
								res.render(__dirname+"/../views/accessDenied", {prefix:"",success:req.url});
							} else next(err);
						} else
							next(err);
					});
					app.dynamicHelpers({
						i18n: function(req, res){
							var domain, re = req.url.match(/\/(\w+)\/.*/i);
							domain = re?re[1]:"core";
							return function () { return function (text, render) {
								return self.i18n(req.session.apiToken, domain, text);
							}};
						}});
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

				app.post("/login", function (req,res,next) {
					async.series([
						async.apply(modules['core'].api.loginByPass,req.session.apiToken, req.body.name, req.body.password)
					], function (err, user) {
						if (err)
							res.redirect(req.body.success);
						else
							res.redirect(req.body.success);
					});
				});
				function handleJsonRpc(jsonrpctext, req, res, next) {
					var id = null; var out = false;
					try {
						var jsonrpc = JSON.parse(jsonrpctext);
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
								jsonres.error = arguments[0];
								jsonres.result = null;
							} else {
								jsonres.error = null;
								jsonres.result = Array.prototype.slice.call(arguments,1);
							}
							jsonres.id = jsonrpc.id;
							res.send(jsonres);
						})
						fn.apply(this, params);
						out = true;
					} catch (err) {
						if (!out) 
							res.send({error:err, result:null, id:id});
					}
				};

				app.get("/jsonrpc", function (req, res, next) {
					handleJsonRpc(req.query.jsonrpc, req, res, next);
				})
				app.post("/jsonrpc", function (req,res,next) {
					handleJsonRpc(req.body.json,req, res, next);
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
				require("../pages/users")(self,webapp,modules['core'].api,"/core");
				require("../pages/index")(self,webapp,modules['core'].api,"/core");

				webapp.listen(1337);
				console.log("Express server listening on port %d in %s mode", webapp.address().port, webapp.settings.env);
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

	this.getModulesInfo = function (cb) {
		var ret = [];
		_.forEach(tmodules, function (minfo) {
			ret.push({name:minfo.name, description:minfo.description, url:"/"+minfo.name+"/"});
		});
		cb(null, ret);
	}

	this.getWebApp = function (cb) {
		cb(null, webapp);
	}

	this.getUniqueId = function(cb) {
		console.time("getUniqueId");
		var id;
		async.waterfall([
			async.apply(fs.readFile,storepath+"unique.id"),
			function (data, cb1) {
				id = parseInt(data);
				id++;
				fs.writeFile(storepath+"unique.id",""+id,cb1);
			}], function (err) {
				console.timeEnd("getUniqueId");
				if (err) return cb(err);
				cb(null,id)
			}
		)
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
		if (gt==null)
			gt = i18l['ru_RU']; // TODO: we need to have system default language
		// final guess, fallback to empty one (dummy)
		if (gt==null)
			gt = dummyGT;
		return gt.dgettext(domain, text1);
	}

}

util.inherits(Skilap, events.EventEmitter);

module.exports.createApp = function () {
	return new Skilap();
}
