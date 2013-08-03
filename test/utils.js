var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var safe = require('safe');
var childProcess = require('child_process')
var phantomjs = require('phantomjs')
var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var main = require('skilap-core');
var _ = require('lodash');
var mutils = require('mongo-utils');
var async = require('async');
var fs = require('fs');
var wrench = require('wrench')

var childs = [];
var appProcess = null;
process.on('uncaughtException', function(err) {
	console.log(err);
	_.each(childs, function (c) {
		c.kill('SIGTERM')
	})
	c = [];
	setTimeout(function () {
		process.exit();
	},100);
});

process.on('exit', function () {
	_.each(childs, function (c) {
		c.kill('SIGTERM')
	})
})

var cfg = {db:"tingodb",browser:"remote", silent:"true"} 
module.exports.setConfig = function (cfg_) {
	_.defaults(cfg_,cfg);
	cfg = cfg_;
}

var tag = "skilapqa";
module.exports.getApp = function (opts,cb) {
	var fixture = opts.fixture || false;
	var acfg = {};
	function doMongo(cb) {
		var dbs = require("mongodb").Db(tag, new Server('localhost', 27017),{w:1});
		acfg = {
			"app":{engine:"mongodb"},
			"mongo":{"host":"127.0.0.1","port":27017,"db":tag}
		}
		dbs.open(safe.sure(cb, function (db) {
			db.dropDatabase(cb)
		}))
	}
	function doTingo(cb) {
		acfg = {
			"app":{engine:"tingodb"},
			"tingo":{"path":__dirname+"/snapshots/__tingodb"}
		}
		safe.trap(cb, function () {
			wrench.mkdirSyncRecursive(acfg.tingo.path)
			wrench.rmdirSyncRecursive(acfg.tingo.path);
			wrench.mkdirSyncRecursive(acfg.tingo.path)
			cb();
		})()
	}
	(function (cb) {
		if (cfg.db=="mongodb")
			doMongo(cb)
		else if (cfg.db=="tingodb")
			doTingo(cb)
		else 
			cb(new Error("Unknown db engine"))
	})(safe.sure(cb,function () {
		var app = childProcess.fork(__dirname+"/../app.js",['automated'], cfg.silent==true?{silent:true}:{});
		app.send({c:'startapp',
			data:acfg
		})
		app.on('message',function (msg) {
			if (msg.c=='startapp_repl')
				cb(msg.data);
		})
		appProcess = app;
		childs.push(app);
	}))
}

module.exports.getBrowser = function(cb) {
	(function(cb) {
		var browser = cfg.browser;
		if (browser=="firefox") {
			var server = new SeleniumServer({
			  jar: __dirname + "/selenium/selenium-server-standalone-2.32.0.jar",
			  port: 4444
			});
			server.start().then(function () {
				var driver = new webdriver.Builder().
					usingServer(server.address()).
					withCapabilities({'browserName': browser}).
					build();
				cb(null,driver)
			})
		} else if (browser=="chrome") {
			var phantom = childProcess.spawn(__dirname+"/selenium/chromedriver");
			var driver = null;
			var error = null;
			phantom.stdout.on('data', function (data) {
				var line = data.toString();
				if (driver==null) {
					if (/Started ChromeDriver/.test(line)) {
						driver = new webdriver.Builder().
							usingServer("http://localhost:9515").
							withCapabilities({'browserName': 'firefox'}).
							build();
						cb(null, driver);
					} else if (/Error/.test(line))
						cb(new Error("Browser can't be started"));
				} else {
					if (error)
						error+=line;
					if (/Error/.test(line)) {
						error = line;
						setTimeout(function () {
							driver.controlFlow().abortNow_(new Error(error))
						},100)
					}
				}
			});
		} else if (browser=="remote") {
			var connect = childProcess.spawn("java",['-jar',__dirname+"/selenium/Sauce-Connect.jar",'sergeyksv','aa36bc29-dda3-4652-9c19-8099ac7224cc']);
			childs.push(connect);			
			var driver = null;
			var error = null;
			/*connect.stderr.on('data', function (data) {
				console.log(data.toString())
			})*/
			connect.stdout.on('data', function (data) {
				var line = data.toString();
				// console.log(line);
				if (driver==null) {
					if (/Connected! You may start your tests/.test(line)) {
						var driver = null;
						var error = null;
						driver = new webdriver.Builder().
							usingServer("http://localhost:4445/wd/hub").
							withCapabilities({'browserName': 'chrome',username:'sergeyksv','accessKey':'aa36bc29-dda3-4652-9c19-8099ac7224cc'}).
							build();
						cb(null, driver);
					}
				}
			})
		}		
		else {
			var phantom = childProcess.spawn(phantomjs.path, ["--webdriver=9134"]);
			var driver = null;
			var error = null;
			phantom.stdout.on('data', function (data) {
				var line = data.toString();
				if (driver==null) {
					if (/GhostDriver - Main - running /.test(line)) {
						driver = new webdriver.Builder().
							usingServer("http://localhost:9134").
							withCapabilities({'browserName': 'firefox'}).
							build();
						cb(null, driver);
					} else if (/Error/.test(line))
						cb(new Error("Browser can't be started"));
				} else {
					if (error)
						error+=line;
					if (/Error/.test(line)) {
						error = line;
						setTimeout(function () {
							driver.controlFlow().abortNow_(new Error(error))
						},100)
					}
				}
			});

			childs.push(phantom);
		}
	})(safe.sure(cb, function (driver) {
		driver.setFileDetector(webdriver.FileDetector.LocalFileDetector);
		driver.manage().timeouts().implicitlyWait(0).then(function () {
			cb(null,driver);
		})
	}))
}

module.exports.getFirefox = function (cb) {
	var server = new SeleniumServer({
	  jar: __dirname + "/selenium-server-standalone-2.32.0.jar",
	  port: 4444
	});

	server.start().then(function () {
		var driver = new webdriver.Builder().
			usingServer(server.address()).
			withCapabilities({'browserName': 'firefox'}).
			build();
		driver.manage().timeouts().implicitlyWait(10000).then(function () {
			cb(null,driver);
		})
	})
}

module.exports.makeDbSnapshot = function (snapname, cb) {
	if (cfg.db=="mongodb") 
		mutils.dumpDatabase("tcp://localhost:27017/skilapqa",__dirname+"/snapshots/mongo-"+snapname,cb);
	else {
		safe.trap(cb, function () {
			wrench.copyDirSyncRecursive(__dirname+"/snapshots/__tingodb",__dirname+"/snapshots/tingo-"+snapname,{forceDelete:true,preserveFiles:true});
			cb();
		})()
	}
}

module.exports.restoreDbSnapshot = function (snapname, cb) {
	(function (cb) {
		if (cfg.db=="mongodb") 	
			mutils.restoreDatabase("tcp://localhost:27017/skilapqa",__dirname+"/snapshots/mongo-"+snapname,cb);
		else {
			safe.trap(cb, function () {
				wrench.copyDirSyncRecursive(__dirname+"/snapshots/tingo-"+snapname,__dirname+"/snapshots/__tingodb",{forceDelete:true,preserveFiles:true});
				cb();
			})()
		}
	})(function () {
		if (appProcess)
			appProcess.kill('SIGTERM');
		var acfg;
		if (cfg.db=="mongodb") {
			acfg = {
			"app":{engine:"mongodb"},
			"mongo":{"host":"127.0.0.1","port":27017,"db":tag}
			}
		} else {
			acfg = {
				"app":{engine:"tingodb"},
				"tingo":{"path":__dirname+"/snapshots/__tingodb"}
			}
		}
		var app = childProcess.fork(__dirname+"/../app.js",['automated'], cfg.silent==true?{silent:true}:{});
		app.send({c:'startapp',
			data:acfg
		})
		app.on('message',function (msg) {
			if (msg.c=='startapp_repl')
				cb(msg.data);
		})
		appProcess = app;
		childs.push(app);				
	})
}

module.exports.noerror = function (f) {
	return function () {
		var args = Array.prototype.slice.call(arguments);
		args.splice(0,0,null);
		f.apply(this,args);
	}
}

module.exports.notError = function (v) {
	if (v instanceof Error) throw v.message;
}

var tutils = module.exports;
var configured = false;
module.exports.setupContext = function (done) {
	if (configured) return done()
	configured = true;
	
	var self = this;
	this._uncaughtException = function(err){
		self.browser.takeScreenshot().then(function(text){
			require("fs").writeFileSync(__dirname+"/screenshot_err.png",new Buffer(text, 'base64'));
			self._done(err);
		});
	}
	this.trackError = function (done) {
		this._done = done;
		this.browser.controlFlow().once('uncaughtException', this._uncaughtException)
	}
	this.fixture = function (tag) {
		var self = this;
		if (!self.fixtures)
			self.fixtures={};
		return this.browser.controlFlow().execute(function () {
			if (self.fixtures[tag])
				return self.fixtures[tag];
			return webdriver.promise.checkedNodeCall(function(cb) {
				fs.readFile(__dirname+"/fixtures/"+tag+".json", safe.sure(cb, function (data) {
					self.fixtures[tag]=JSON.parse(data.toString())
					cb(null, self.fixtures[tag]);
				}))
			})
		})
	}
	this.restoreDb = function (tag) {
		this.browser.controlFlow().execute(function () {
			return webdriver.promise.checkedNodeCall(function(cb) {
				tutils.restoreDbSnapshot(tag,cb)
			})
		})
	}
	this.saveDb = function (tag) {
		return this.browser.controlFlow().execute(function () {
			return webdriver.promise.checkedNodeCall(function(cb) {
				tutils.makeDbSnapshot(tag,cb)
			})
		})
	}
	this.done = function () {
		this.browser.controlFlow().execute(this._done);
	}
	async.parallel([
		function(cb) {
			tutils.getBrowser(safe.sure(done, function (browser_) {
				self.browser = browser_;
				cb();
			}))
		},
		function(cb) {
			tutils.getApp({fixture:"empty"},cb);
		}
	],done)
}

module.exports.afterEach = function () {
	if (this._done) {
		this.browser.controlFlow().removeListener('uncaughtException', this._uncaughtException)
		delete this._done;
	}
}
