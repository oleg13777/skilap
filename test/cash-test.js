var async = require('async');
var webdriver = require('selenium-webdriver')
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

describe("Cash module",function () {
	this.timeout(30000);
	before(tutils.setupContext)
	before(function (done) {
		this.browser.manage().window().setSize(1280,768);	
		this.restoreDb('core-users');	
		this.fixture('dataentry').then(tutils.noerror(done));
	})
	afterEach(tutils.afterEach)

	describe("Default dataset", function () {
		it("Can be created")
		it("Should have some accounts")
		it("Account should have proper currency")
	})
	describe("Manage accounts", function () {		
		it("Create new account", function(done){			
			this.trackError(done);
			var self = this;
			var user = self.fixtures.dataentry.users[0];
			//login as admin
			helpers.login.call(self, this.fixtures.dataentry.superuser,true);
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.linkText("Logout"))
			});
			self.browser.findElement(By.linkText("Manage users")).click()
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.name("addNewUser"))
			});
			self.browser.findElement(By.name("addNewUser")).click();
			helpers.waitModalLoad.call(self);
			//enter new user data
			self.browser.findElement(By.id("changePass")).click()
			helpers.fillInput.call(self,self.browser.findElement(By.id("firstName")),user.firstName);
			helpers.fillInput.call(self,self.browser.findElement(By.id("lastName")),user.lastName);
			helpers.fillInput.call(self,self.browser.findElement(By.id("login")),user.login);
			helpers.fillInput.call(self,self.browser.findElement(By.id("password")),user.password);
			self.browser.findElement(By.id("save")).click();
			helpers.waitModalUnload.call(self);	
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.css(".users_row"))
			});
			self.done();
		})
		it("Edit account", function(done){
			this.trackError(done);
			var self = this;
			var user = self.fixtures.dataentry.users[0];
			self.browser.findElement(By.css(".dropdown-toggle")).click();
			self.browser.sleep(1000);
			self.browser.findElement(By.name("editUser")).click();			
			helpers.waitModalLoad.call(self);
			//enter new user data			
			helpers.fillInput.call(self,self.browser.findElement(By.id("firstName")),user.firstName+"edited");
			helpers.fillInput.call(self,self.browser.findElement(By.id("lastName")),user.lastName+"edited");
			self.browser.findElement(By.id("save")).click();
			helpers.waitModalUnload.call(self);			
			self.browser.findElement(By.xpath("//td[text()='"+user.firstName+"edited']"))	
			self.browser.findElement(By.xpath("//td[text()='"+user.lastName+"edited']"))	
			self.done();				
		})
		it("Delete account", function(done){
			this.trackError(done);
			var self = this;
			var user = self.fixtures.dataentry.users[0];
			self.browser.findElement(By.css(".dropdown-toggle")).click();
			self.browser.sleep(1000);
			self.browser.findElement(By.name("deleteUser")).click();
			self.browser.switchTo().alert().accept();		
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.css(".users_row")).then(function (v) { return !v; })
			});
			self.done();	
		})
	})	
	describe("Manage prices", function () {
		it("Add price for USD in EUR")
		it("Edit price of USD in EUR")
		it("Delete price pair")
	})
	describe("Export and import", function () {
		it("Import sample gnucash file")
		it("Home page should have right ballance")
		it("Export Skilap Cash")
		it("Import Skilap Cash")
		it("Home page balance should be the same as before")
	})
	describe("Registry input", function () {
		it("TBD")
	})
	describe("Reports", function () {
		it("TBD")
	})
	describe("Settings", function () {
		it("TBD")
	})
	
})
