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
var exc = {"date" : "2013/04/16" ,"EURUSD" : 1.312 ,"EURBRL" : 2.6091 ,	"BRLUSD" : 0.5029 ,	"USDEUR" : 0.7622 ,	"USDBRL" : 1.9886 ,	"BRLEUR" : 0.3833}

var childs = [];
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

module.exports.getApp = function (opts,cb) {
	var fixture = opts.fixture || false;
	var tag = "skilapqa";
	var dbs = new Db(tag, new Server('localhost', 27017),{w:1});
	(function(cb) {
		dbs.open(safe.sure(cb, function (db) {
			if (fixture=="empty") {
				db.dropDatabase(safe.sure(cb, function () {
					var dbs = new Db(tag, new Server('localhost', 27017),{w:1});
					dbs.open(safe.sure(cb, function (db) {
						db.collection('exchange').insert(exc, cb);
					}))
				}))
			} else
				cb(null,db)
		}))
	})(safe.sure(cb,function () {
		var app = childProcess.fork(__dirname+"/../app.js",['automated'],{silent:true});
		app.send({c:'startapp',
			data:{"mongo":{
				"host":"127.0.0.1",
				"port":27017,
				"db":tag
				}
			}
		})
		app.on('message',function (msg) {
			if (msg.c=='startapp_repl')
				cb(msg.data);
		})
		childs.push(process);
	}))
}

var browser = "chrome";
module.exports.getBrowser = function(cb) {
	(function(cb) {
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
		} if (browser=="chrome") {
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
		}
		else {
			var phantom = childProcess.spawn(__dirname+"/selenium/phantomjs", ["--webdriver=9134"]);
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
					console.log(line);
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
	mutils.dumpDatabase("tcp://localhost:27017/skilapqa",__dirname+"/snapshots/"+snapname,cb);
}

module.exports.restoreDbSnapshot = function (snapname, cb) {
	mutils.restoreDatabase("tcp://localhost:27017/skilapqa",__dirname+"/snapshots/"+snapname,cb);
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
module.exports.setupContext = function (done) {
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
		this.browser.controlFlow().execute(function () {
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
