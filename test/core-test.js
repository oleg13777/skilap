var async = require('async');
var webdriver = require('selenium-webdriver');
var By = webdriver.By;
var Key = webdriver.Key;
var assert = require('assert');
var tutils = require('./utils');
var safe = require('safe');
var _ = require('lodash');
var helpers = require('./helpers');
var assert = require('assert');

/*
 * Some notices:
 * For save database use
 * 		this.saveDb('debug');
 * For load database use
 * 		before(function(){
			this.restoreDb('debug');
		});
 *	For skip current test
 * 		describe.skip
 * 	For run only current test
 * 		describe.only
 * 	When error occurs, screenshot is available in test's dir (active)
 * 	Predefined data stored in file `dataentry.json`
 *	Frequently called functions should be defined in helpers
 * */

describe("Core module",function () {
	this.timeout(30000);
	before(tutils.setupContext);
	after(function (done) {
		this.saveDb('core-users').then(tutils.noerror(done));
	});
	before(function (done) {
		this.fixture('dataentry').then(tutils.noerror(done));
		this.browser.manage().window().setSize(1280,768);
	});
	afterEach(tutils.afterEach);

	describe("Register new user", function () {
		it("Login as superadmin", function (done) {
			this.trackError(done);
			helpers.login.call(this, this.fixtures.dataentry.superuser,true);
			this.done();
		});
		it("Create users", function (done) {
			this.trackError(done);
			var self = this;
			var u = this.fixtures.dataentry.users[0];			
			this.browser.findElement(By.linkText("Core module")).click();
			this.browser.findElement(By.linkText("Manage users")).click();	
			this.browser.findElement(By.name("addNewUser")).click();	
			
			var modal = helpers.waitModalLoad.call(this);
			
			modal.findElement(By.id("firstName")).sendKeys(u.firstName);
			modal.findElement(By.id("lastName")).sendKeys(u.lastName);	
			modal.findElement(By.id("login")).sendKeys(u.login);					
			modal.findElement(By.id("language")).sendKeys(u.language);
			modal.findElement(By.id("changePass")).click();
			modal.findElement(By.id("password")).sendKeys(u.password);
			modal.findElement(By.id("save")).click();
						
			helpers.waitModalUnload.call(this);
			
			// not verify that our user is here
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.firstName+"')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.lastName+"')]"));			
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.login+"')]"));			
			self.done();
		});
		it("Assign permissions", function(done) {
			this.trackError(done);
			var self = this;
			this.browser.findElement(By.linkText("Manage users")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					for (var key in elements)
						elements[key].click(); 
				});
				modal.findElement(By.id("save")).click();
			});
			self.done();
		});
		it("Check permissions", function(done) {
			this.trackError(done);
			var self = this;
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					for (var key in elements)
						elements[key].isSelected().then(function (val) {
							assert.ok(val, "Permission not set");
						});
				});
				modal.findElement(By.id("save")).click();
			});

			self.done();
		});
	});
	describe("Edit users", function () {
		it("Edit pereferences", function(done) {
			this.trackError(done);
			var self = this;
			var u = this.fixtures.dataentry.users[1];			
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editUser']")).click();	
			
			helpers.runModal.call(this, null, function(modal) {
				modal.findElement(By.id("firstName")).clear();	
		        modal.findElement(By.id("firstName")).sendKeys(u.firstName);
				modal.findElement(By.id("lastName")).clear();	
				modal.findElement(By.id("lastName")).sendKeys(u.lastName);	
				modal.findElement(By.id("login")).clear();	
				modal.findElement(By.id("login")).sendKeys(u.login);					
				modal.findElement(By.id("language")).sendKeys(u.language);
				modal.findElement(By.id("changePass")).click();
				modal.findElement(By.id("password")).sendKeys(u.password);
				modal.findElement(By.id("save")).click();
			});

			// not verify that our user is here
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.firstName+"')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.lastName+"')]"));			
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.login+"')]"));			
			self.done();
		});
		it("Edit permissions", function(done) {
			this.trackError(done);
			var self = this;
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					elements[0].click(); 
				});
				modal.findElement(By.id("save")).click();
			});

			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					for (var key in elements)
						if (key == 0)
							elements[key].isSelected().then(function (val) {
								assert.ok(!val, "Permission not edit");
							});
						else
							elements[key].isSelected().then(function (val) {
								assert.ok(val, "Permission not edit");
							});
				});
				modal.findElement(By.id("save")).click();
			});
			
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					elements[0].click(); 
				});
				modal.findElement(By.id("save")).click();
			});

			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					for (var key in elements)
						elements[key].isSelected().then(function (val) {
							assert.ok(val, "Permission not edit");
						});
				});
				modal.findElement(By.id("save")).click();
			});
			self.done();
		});
	});
	describe.skip("Edit self", function (done) {
		it("logout", function() {
			this.trackError(done);
			var self = this;
			this.browser.findElement(By.xpath("//a[@href='/logout?success=/']")).click();	
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.name("name"));
			});		
			self.done();
		});
		it("login as user1", function() {
			helpers.login.call(this, this.fixtures.dataentry.users[0], true);
			this.done();
		});
		it("edit pereferences", function(done) {
			this.trackError(done);
			var self = this;
			var u = this.fixtures.dataentry.users[1];			
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editUser']")).click();	
			
			helpers.runModal.call(this, null, function(modal) {
				modal.findElement(By.id("firstName")).clear();	
		        modal.findElement(By.id("firstName")).sendKeys(u.firstName);
				modal.findElement(By.id("lastName")).clear();	
				modal.findElement(By.id("lastName")).sendKeys(u.lastName);	
				modal.findElement(By.id("login")).clear();	
				modal.findElement(By.id("login")).sendKeys(u.login);					
				modal.findElement(By.id("language")).sendKeys(u.language);
				modal.findElement(By.id("changePass")).click();
				modal.findElement(By.id("password")).sendKeys(u.password);
				modal.findElement(By.id("save")).click();
			});

			// not verify that our user is here
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.firstName+"')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.lastName+"')]"));			
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.login+"')]"));			
			self.done();
		});
		it("edit permissions", function(done) {
			this.trackError(done);
			var self = this;
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					elements[0].click(); 
				});
				modal.findElement(By.id("save")).click();
			});

			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					for (var key in elements)
						if (key == 0)
							elements[key].isSelected().then(function (val) {
								assert.ok(!val, "Permission not edit");
							});
						else
							elements[key].isSelected().then(function (val) {
								assert.ok(val, "Permission not edit");
							});
				});
				modal.findElement(By.id("save")).click();
			});
			
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					elements[0].click(); 
				});
				modal.findElement(By.id("save")).click();
			});

			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//button[@class='btn dropdown-toggle']")).click();	
			this.browser.findElement(By.xpath("//table[@class='table table-condensed']/tbody/tr[1]//a[@name='editPerm']")).click();	
			helpers.runModal.call(this, null, function(modal) {
				modal.findElements(By.xpath("//input")).then(function (elements) {
					for (var key in elements)
						elements[key].isSelected().then(function (val) {
							assert.ok(val, "Permission not edit");
						});
				});
				modal.findElement(By.id("save")).click();
			});
			self.done();
		});
	});
	describe("Edit system preferences", function () {
		it("login as superadmin");
		it("change system settings");
	});
});