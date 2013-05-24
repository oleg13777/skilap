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
	before(tutils.setupContext);
	before(function (done) {
		this.browser.manage().window().setSize(1280,768);	
		this.restoreDb('core-users');	
		this.fixture('dataentry').then(tutils.noerror(done));
	});
	afterEach(tutils.afterEach);

	describe("Default dataset", function () {
		var curUser = 0;
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			helpers.login.call(self, self.fixtures.dataentry.users[curUser], true);
			self.done();
		});
		it("Can be created", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();	
			self.browser.findElement(By.linkText("New register")).click();	
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			self.done();
		});
		it("Should have some accounts", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//*[contains(.,'Accidental')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'Car')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'Fuel')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'Life')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'Food')]"));
			self.browser.findElement(By.xpath("//*[contains(.,'Other')]"));
			self.done();
		});
		it("Account should have proper currency", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//span[contains(.,'$')]"));
			self.done();
		});
	});
	describe("Manage prices", function () {
		it("Add price for USD in EUR", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Rate Currency Editor")).click();	
			self.browser.findElement(By.id("firstCurrency")).sendKeys("USD");
			self.browser.findElement(By.id("secondCurrency")).sendKeys("EUR");
			self.browser.findElement(By.xpath("//button[.='Apply']")).click();
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//button[.='Add']"));
			});
			self.browser.findElement(By.xpath("//button[.='Add']")).click();
			helpers.runModal.call(this, null, function(modal) {
		        modal.findElement(By.id("datepicker")).sendKeys("05/20/13");
				modal.findElement(By.id("newrate")).sendKeys("1.5");	
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//td[@class='date' and contains(.,'20')]"));	
			self.browser.findElement(By.xpath("//td[@class='rate' and .='1.5']"));	
			self.done();
		});
		it("Edit price of USD in EUR", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//td[@class='rate' and .='1.5']")).click();	
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//button[.='Edit']"));
			});
			self.browser.findElement(By.xpath("//button[.='Edit']")).click();
			helpers.runModal.call(this, null, function(modal) {
				modal.findElement(By.id("datepicker")).clear();	
		        modal.findElement(By.id("datepicker")).sendKeys("05/21/13");
				modal.findElement(By.id("newrate")).clear();	
				modal.findElement(By.id("newrate")).sendKeys("1.6");	
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//td[@class='date' and contains(.,'21')]"));	
			self.browser.findElement(By.xpath("//td[@class='rate' and .='1.6']"));	
			self.done();
		});
		it("Delete price pair", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//td[@class='rate' and .='1.6']")).click();	
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//button[.='Delete']"));
			});
			self.browser.findElement(By.xpath("//button[.='Delete']")).click();
			helpers.runModal.call(this, null, function(modal) {
				modal.findElement(By.id("save")).click();
			});
			self.browser.isElementPresent(By.xpath("//td[@class='date' and contains(.,'21')]")).then(function (isPresent) {
				assert.ok(!isPresent, "Not deleted");
			});
			self.browser.isElementPresent(By.xpath("//td[@class='rate' and .='1.6']")).then(function (isPresent) {
				assert.ok(!isPresent, "Not deleted");
			});
			self.done();
		});
	});
	describe("Export and import", function () {
		it("Import sample gnucash file", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Data")).click();	
			self.browser.findElement(By.linkText("Import Gnu Cash")).click();	
			self.browser.executeScript("document.getElementById('upload-file').setAttribute('style', '')");
			self.browser.findElement(By.id("upload-file")).sendKeys(__dirname+ self.fixtures.dataentry.cashimport.file);
			self.browser.findElement(By.xpath("//button[@type='submit']")).click();	
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//h3[.='" + self.fixtures.dataentry.cashimport.parsedtext + "']"));
			});
			self.browser.findElement(By.xpath("//button[@type='submit']")).click();	
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//*[contains(.,'" + self.fixtures.dataentry.cashimport.finishedtext + "')]"));
			});
			self.browser.findElement(By.xpath("//button[@type='submit']")).click();	
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//h2[contains(.,'Assets:')]"));
			});
			
			self.done();
		});
		it("Home page should have right ballance", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//*[contains(.,'" + self.fixtures.dataentry.cashimport.sum + "')]"));
			self.done();
		});
		it("Export Skilap Cash")
		it("Import Skilap Cash")
		it("Home page balance should be the same as before")
	})
	describe.skip("Registry input", function () {
		it("TBD")
	})
	describe.skip("Reports", function () {
		it("TBD")
	})
	describe("Settings", function () {
		it("TBD")
	})
	
})
