var async = require('async');
var webdriver = require('selenium-webdriver')
var By = webdriver.By;
var Key = webdriver.Key;
var assert = require('assert');
var tutils = require('./utils');
var safe = require('safe');
var _ = require('lodash');
var helpers = require('./helpers')

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
	before(tutils.setupContext)
	before(function (done) {
		this.fixture('dataentry').then(tutils.noerror(done));
		this.browser.manage().window().setSize(1280,768);
	})
	afterEach(tutils.afterEach)

	describe("Register new user", function () {
		it("Login as superadmin", function (done) {
			this.trackError(done);
			helpers.login.call(this, this.fixtures.dataentry.superuser,true);
			this.done();
		})
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
			modal.findElement(By.id("save")).click()
						
			helpers.waitModalUnload.call(this);
			
			// not verify that our user is here
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.firstName+"')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.lastName+"')]"));			
			self.browser.findElement(By.xpath("//*[contains(.,'"+u.login+"')]"));			
			self.done();
		})
		it("Assign permissions")
	})
	describe("Edit users", function () {
		it("Edit pereferences")
		it("Edit permissions")
	})
	describe("Edit self", function () {
		it("login as user1")
		it("edit preferences")
		it("edit permissions")
	})
	describe("Edit system preferences", function () {
		it("login as superadmin")
		it("change system settings")
	})
	describe("Check core permissions", function () {
		it("not sure yet")
	})
})
