var Db = require('mongodb').Db;
var Server = require('mongodb').Server;
var safe = require('safe');
var childProcess = require('child_process')
var webdriver = require('selenium-webdriver');
var SeleniumServer = require('selenium-webdriver/remote').SeleniumServer;
var main = require('skilap-core');
var _ = require('lodash');
var mutils = require('mongo-utils');
var async = require('async');
var fs = require('fs');
var wrench = require('wrench')
var request = require('request');

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
			"app":{engine:"mongodb",port:8080},
			"mongo":{"host":"127.0.0.1","port":27017,"db":tag}
		}
		dbs.open(safe.sure(cb, function (db) {
			db.dropDatabase(cb)
		}))
	}
	function doTingo(cb) {
		acfg = {
			"app":{engine:"tingodb",port:8080},
			"tingo":{"path":__dirname+"/snapshots/__tingodb"}
		}
		safe.run(function () {
			wrench.mkdirSyncRecursive(acfg.tingo.path)
			wrench.rmdirSyncRecursive(acfg.tingo.path)
			wrench.mkdirSyncRecursive(acfg.tingo.path)
			cb();
		},cb)
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
			  jar: __dirname + "/selenium/selenium-server-standalone-2.35.0.jar",
			  port: 4444
			});
			server.start().then(function () {
				var driver = new webdriver.Builder().
					usingServer(server.address()).
					withCapabilities({'browserName': browser});
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
							withCapabilities({'browserName': 'firefox'})
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
			if (!process.env.SAUCE_USERNAME || !process.env.SAUCE_ACCESS_KEY)
				return cb(new Error("Remote testing requires SAUCE_USERNAME and SAUCE_ACCESS_KEY environtment variables set"));
			var connect = childProcess.spawn("java",['-jar',__dirname+"/selenium/Sauce-Connect.jar",process.env.SAUCE_USERNAME,process.env.SAUCE_ACCESS_KEY]);
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
							withCapabilities({'browserName': process.env.SAUCE_BROWSER || 'chrome',"record-video":false,"record-screenshots":false,username:process.env.SAUCE_USERNAME,'accessKey':process.env.SAUCE_ACCESS_KEY});
						cb(null, driver);
					}
				}
			})
		}
	})(cb)
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
		safe.run(function () {
			wrench.copyDirSyncRecursive(__dirname+"/snapshots/__tingodb",__dirname+"/snapshots/tingo-"+snapname,{forceDelete:true,preserveFiles:true});
			cb();
		},cb)
	}
}

module.exports.restoreDbSnapshot = function (snapname, cb) {
	(function (cb) {
		if (cfg.db=="mongodb") 	
			mutils.restoreDatabase("tcp://localhost:27017/skilapqa",__dirname+"/snapshots/mongo-"+snapname,cb);
		else {
			safe.run(function () {
				wrench.copyDirSyncRecursive(__dirname+"/snapshots/tingo-"+snapname,__dirname+"/snapshots/__tingodb",{forceDelete:true,preserveFiles:true});
				cb();
			},cb)
		}
	})(function () {
		if (appProcess)
			appProcess.kill('SIGTERM');
		var acfg;
		if (cfg.db=="mongodb") {
			acfg = {
			"app":{engine:"mongodb",port:8080},
			"mongo":{"host":"127.0.0.1","port":27017,"db":tag}
			}
		} else {
			acfg = {
				"app":{engine:"tingodb",port:8080},
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
	var self = this;	
	var tasks = [];
	if (!configured) {
		configured = true;
		
		this._uncaughtException = function(err){
			self.passed = false;
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
		this.done = function (err) {
			if (err)
				self.passed = false;
			this.browser.controlFlow().execute(this._done);
		}
		tasks.push(function(cb) {
			tutils.getApp({fixture:"empty"},cb);
		})
		tasks.push(function(cb) {
			tutils.getBrowser(safe.sure(done, function (builder_) {
				self.builder = builder_;
				cb();
			}))
		})
	}
	if (!self.browser) {
		tasks.push(function(cb) {
			var driver = self.builder.build();
			if (cfg.browser == "remote") 			
				driver.setFileDetector(webdriver.FileDetector.LocalFileDetector);
	-       driver.manage().timeouts().implicitlyWait(0).then(function () {
				self.browser = driver;
	-           cb(null);				
			})
			driver.getSession().then(function (session) {
				self.sessionId = session.id;
				if (cfg.browser == "remote") 
					sauceRest(self.sessionId,{name:self.jobName || "Skilap",
						build: process.env.TRAVIS_JOB_ID || Math.round(new Date().getTime() / (1000*60))},function () {});
			})
		})
	}
	async.series(tasks,done)
	self.passed = true;
}

module.exports.afterEach = function () {
	if (this._done) {
		this.browser.controlFlow().removeListener('uncaughtException', this._uncaughtException)
		delete this._done;
	}
}

module.exports.shutdownContext = function (done) {
	var self =this;
	var browser = this.browser;
	delete this.browser;
	browser.quit().then(function () {
		if (cfg.browser != "remote")
			return done();
		sauceRest(self.sessionId,{
		  passed: self.passed
		},done)
	})
};

function sauceRest(jobId,data,done) {
  var httpOpts = {
	url: 'http://'+process.env.SAUCE_USERNAME+':'+process.env.SAUCE_ACCESS_KEY+'@saucelabs.com/rest/v1/'+process.env.SAUCE_USERNAME+'/jobs/' + jobId,
	method: 'PUT',
	headers: {
	  'Content-Type': 'text/json'
	},
	body: JSON.stringify(data),
	jar: false /* disable cookies: avoids CSRF issues */
  };

  request(httpOpts, done);
}
	
