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
		        modal.findElement(By.id("datepicker")).sendKeys("05/21/13\n");
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
		var sum = '';
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();			
			self.done();
		});		
		it("Import sample gnucash file", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Data")).click();	
			self.browser.findElement(By.linkText("Import Gnu Cash")).click();	
			self.browser.executeScript("document.getElementById('upload-file').setAttribute('style', '')");
			self.browser.findElement(By.id("upload-file")).sendKeys(__dirname + self.fixtures.dataentry.cashimport.file);
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
			self.saveDb('cash-gnucash').then(function() {
				self.done();
			});
		});
		it("Home page should have right ballance", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//*[contains(.,'" + self.fixtures.dataentry.cashimport.sum + "')]"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				sum = text;
				self.done();
			});
		});
		it("Export Skilap Cash", function(done) {
			var self = this;
			self.trackError(done);
			var http = require('http');
			var fs = require('fs');

			self.browser.manage().getCookies().then(function(cookies) {
				var c = cookies[0].name + '=' + cookies[0].value + ';' + cookies[1].name + '=' + cookies[1].value;
				var file = fs.createWriteStream(__dirname + "/data/raw.zip");
				var options = {
						  host: "localhost",
						  port: 80,
						  path: '/cash/export/raw',
						  headers: {"Cookie": c}
						};
				http.get(options, function(response) {
					response.pipe(file);
					self.done();
				});
			});
		});
		it("Import Skilap Cash", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Data")).click();	
			self.browser.findElement(By.linkText("Import Skilap Cash")).click();	
			self.browser.executeScript("document.getElementById('upload-file').setAttribute('style', '')");
			self.browser.findElement(By.id("upload-file")).sendKeys(__dirname + "/data/raw.zip");
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
		it("Home page balance should be the same as before", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(sum == text, "Import error");
				self.done();
			});
		});
	});
	describe("Manage accounts", function () {
		it("Create root test account", function(done) {
			var self = this;
			self.trackError(done);
			var acc1 = self.fixtures.dataentry.accounts[0];		
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			self.browser.findElement(By.id("add_new")).click();
			helpers.runModal.call(self, null, function(modal) {
		        modal.findElement(By.id("acc_name")).sendKeys(acc1.name);
				modal.findElement(By.id("acc_parent")).sendKeys(acc1.parent);	
				modal.findElement(By.id("acc_curency")).sendKeys(acc1.currency);	
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//a[contains(.,'" + acc1.name + "')]"));	
			self.done();
		});
		it("Create child test account", function(done) {
			var self = this;
			self.trackError(done);
			var acc2 = self.fixtures.dataentry.accounts[1];		
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			self.browser.findElement(By.id("add_new")).click();
			helpers.runModal.call(self, null, function(modal) {
		        modal.findElement(By.id("acc_name")).sendKeys(acc2.name);
				modal.findElement(By.id("acc_parent")).sendKeys(acc2.parent);	
				modal.findElement(By.id("acc_curency")).sendKeys(acc2.currency);	
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//a[contains(.,'" + acc2.name + "')]"));	
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + acc2.parent + "')]//div[contains(./a,'" + acc2.name + "')]"));	
			self.done();
		});
		it("Edit changing parent and name", function(done) {
			var self = this;
			self.trackError(done);
			var child = self.fixtures.dataentry.accounts[1];		
			var parent2 = self.fixtures.dataentry.accounts[2];
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			self.browser.findElement(By.id("add_new")).click();
			helpers.runModal.call(self, null, function(modal) {
		        modal.findElement(By.id("acc_name")).sendKeys(parent2.name);
				modal.findElement(By.id("acc_parent")).sendKeys(parent2.parent);	
				modal.findElement(By.id("acc_curency")).sendKeys(parent2.currency);	
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//a[contains(.,'" + parent2.name + "')]"));	
			self.browser.findElement(By.xpath("//div[contains(./a,'" + child.name + "')]/span/a[./i[@title='edit']]")).click();	
			self.done()
		});
		it("Edit changing parent and name", function(done) {
			var self = this;
			self.trackError(done);
			var child = self.fixtures.dataentry.accounts[1];		
			var parent2 = self.fixtures.dataentry.accounts[2];
			helpers.runModal.call(self, null, function(modal) {
		        modal.findElement(By.id("acc_name")).clear();
		        modal.findElement(By.id("acc_name")).sendKeys(child.name_new);
				modal.findElement(By.id("acc_parent")).sendKeys(parent2.name);	
				modal.findElement(By.id("acc_curency")).sendKeys(child.currency);	
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//a[contains(.,'" + child.name_new + "')]"));	
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + parent2.name + "')]//div[contains(./a,'" + child.name_new + "')]"));	
			self.done();
		});
	});
	describe("Manage accounts (delete)", function () {
		var all = '';
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('cash-gnucash');	
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();			
			self.done();
		});
		it("Move transactions and subaccounts to another account", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();	
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				all = text;
			});
			var accParent = 'Imbalance-RUB';
			var accDelete = 'сбербанк';
			var accChild = 'Test1';
			var sumBefore = '';
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				sumBefore = text;
			});
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + accDelete + "')]//div[contains(./a,'" + accChild + "')]"));	
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accDelete + "')]/span/a[./i[@title='delete']]")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.xpath("//div[@id='sub_tr']//input[@id='move']")).click();
		        modal.findElement(By.id("tr_parent")).sendKeys(accParent);
				modal.findElement(By.xpath("//div[@id='sub_acc']//input[@id='move']")).click();
		        modal.findElement(By.id("sub_acc_parent")).sendKeys(accParent);
				modal.findElement(By.id("delete")).click();
			});
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//div[contains(./a,'" + accParent + "')]/span"));
			});	
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + accParent + "')]//div[contains(./a,'" + accChild + "')]"));	
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				assert.ok(sumBefore != text, "Move error");
			});
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(all == text, "Move sum error");
			});
			self.done();
		});
		it("Delete transactions and delete sub accounts and delete subaccount transactions", function(done) {
			var self = this;
			self.trackError(done);
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			var accDelete = 'QIWI Bank';
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accDelete + "')]/span/a[./i[@title='delete']]")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.xpath("//div[@id='sub_tr']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc_tr']//input[@id='del']")).click();
				modal.findElement(By.id("delete")).click();
			});
			self.browser.findElements(By.xpath("//div[contains(./a,'" + accDelete + "')]")).then(function (elements) {
				assert.ok(elements.length == 0, "Delete error");
			});
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(all != text, "Delete sum error");
				all = text;
			});
			self.done();
		});
		it("Delete transactions and delete sub accounts moving transaction to another account", function(done) {
			var self = this;
			self.trackError(done);
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			var accDelete = 'Разное';
			var accParent = 'Особый Bank';
			var sumBefore = '';
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				sumBefore = text;
			});
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accDelete + "')]/span/a[./i[@title='delete']]")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.xpath("//div[@id='sub_tr']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc_tr']//input[@id='move']")).click();
		        modal.findElement(By.id("sub_acc_trn_parent")).sendKeys(accParent);
				modal.findElement(By.id("delete")).click();
			});
			self.browser.findElements(By.xpath("//div[contains(./a,'" + accDelete + "')]")).then(function (elements) {
				assert.ok(elements.length == 0, "Delete error");
			});
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				assert.ok(sumBefore != text, "Move error");
			});
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(all != text, "Delete sum error");
			});
			self.done();
		});
	});
	describe("Manage sub accounts (delete)", function () {
		var all = '';
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('cash-gnucash');	
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();			
			self.done();
		});		
		it("Move transactions and subaccounts to another account", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				all = text;
			});
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			var accParent = 'Imbalance-RUB';
			var accDelete = 'Test1';
			var accChild = 'test2';
			var sumBefore = '';
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				sumBefore = text;
			});
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + accDelete + "')]//div[contains(./a,'" + accChild + "')]"));	
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accDelete + "')]/span/a[./i[@title='delete']]")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.xpath("//div[@id='sub_tr']//input[@id='move']")).click();
		        modal.findElement(By.id("tr_parent")).sendKeys(accParent);
				modal.findElement(By.xpath("//div[@id='sub_acc']//input[@id='move']")).click();
		        modal.findElement(By.id("sub_acc_parent")).sendKeys(accParent);
				modal.findElement(By.id("delete")).click();
			});
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.xpath("//div[contains(./a,'" + accParent + "')]/span"));
			});	
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + accParent + "')]//div[contains(./a,'" + accChild + "')]"));	
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				assert.ok(sumBefore != text, "Move error");
			});
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(all == text, "Move sum error");
			});
			self.done();
		});
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('cash-gnucash');	
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();			
			self.done();
		});		
		it("Delete transactions and delete sub accounts and delete subaccount transactions", function(done) {
			var self = this;
			self.trackError(done);
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			var accDelete = 'Test1';
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accDelete + "')]/span/a[./i[@title='delete']]")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.xpath("//div[@id='sub_tr']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc_tr']//input[@id='del']")).click();
				modal.findElement(By.id("delete")).click();
			});
			self.browser.findElements(By.xpath("//div[contains(./a,'" + accDelete + "')]")).then(function (elements) {
				assert.ok(elements.length == 0, "Delete error");
			});
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(all != text, "Delete sum error");
				all = text;
			});
			self.done();
		});
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('cash-gnucash');	
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();			
			self.done();
		});		
		it("Delete transactions and delete sub accounts moving transaction to another account", function(done) {
			var self = this;
			self.trackError(done);
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Accounts")).click();	
			var accDelete = 'Test1';
			var accParent = 'Особый Bank';
			var sumBefore = '';
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				sumBefore = text;
			});
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accDelete + "')]/span/a[./i[@title='delete']]")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.xpath("//div[@id='sub_tr']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc']//input[@id='del']")).click();
				modal.findElement(By.xpath("//div[@id='sub_acc_tr']//input[@id='move']")).click();
		        modal.findElement(By.id("sub_acc_trn_parent")).sendKeys(accParent);
				modal.findElement(By.id("delete")).click();
			});
			self.browser.findElements(By.xpath("//div[contains(./a,'" + accDelete + "')]")).then(function (elements) {
				assert.ok(elements.length == 0, "Delete error");
			});
			self.browser.findElement(By.xpath("//div[contains(./a,'" + accParent + "')]/span")).getText().then(function(text) {
				assert.ok(sumBefore != text, "Move error");
			});
			
			self.browser.findElement(By.linkText("View")).click();	
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(all != text, "Delete sum error");
			});
			self.done();
		});
	});
	describe.skip("Registry input", function () {
		it("TBD")
	})
	describe("Reports", function () {
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('cash-gnucash');	
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();						
			self.done();
		});	
		it ("Check barchart", function(done){
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Report")).click();	
			self.browser.findElement(By.linkText("Spend/receive bar chart")).click();
			self.browser.wait(function () {
				return self.browser.isElementPresent(By.id("highcharts-0"));
			});	
			self.done();
		})
		it ("Check Accounts selection", function(done){
			var self = this;
			self.trackError(done);			
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(_.contains(arr, "Электричество"), "lost account");
						}
					})
				})			
			});			
			self.browser.findElement(By.id("page_menu")).click();	
			self.browser.findElement(By.id("settings")).click();
			helpers.runModal.call(self, null, function(modal) {				
		        modal.findElement(By.xpath("//span[text()='Электричество']")).click();						
				modal.findElement(By.id("save")).click();
			});
				self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(!_.contains(arr, "Электричество"), "lost account");
						}
					})
				})			
			});	
			self.done();
		})
		it ("Check Colapse level", function(done){
			var self = this;
			self.trackError(done);			
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(_.contains(arr, "Электричество"), "lost account");
						}
					})
				})			
			});			
			self.browser.findElement(By.id("page_menu")).click();	
			self.browser.findElement(By.id("settings")).click();
			helpers.runModal.call(self, null, function(modal) {				
		       self.browser.executeScript("$('select[name=\"accLevel\"]').val('1')");
		       modal.findElement(By.id("save")).click();
			});
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(!_.contains(arr, "дом"), "lost account");
						}
					})
				})			
			});	
			self.done();
		})	
		it ("Check MaxAccounts", function(done){
			var self = this;
			self.trackError(done);			
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				var canstart = false;
				var end = false;
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						if (!canstart && !end){
							if (text.indexOf("Other")!=-1)
								canstart = true;
						}
						else if (canstart){
							if (text.indexOf("1.2011")!=-1)
								arr.push(text);	
							else{
								canstart = false;
								end = true;
							}	
						}										
						if (counter++ == elems.length){							
							assert.ok(arr.length==10, "acc number");
						}
					})
				})			
			});			
			self.browser.findElement(By.id("page_menu")).click();	
			self.browser.findElement(By.id("settings")).click();
			helpers.runModal.call(self, null, function(modal) {	
				modal.findElement(By.linkText("General")).click();
				helpers.fillInput.call(modal, modal.findElement(By.name("maxAcc")), "3");				
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElements(By.tagName("tspan")).then(function(elems){	
				var arr =[]; 	
				var counter = 0;			
				var canstart = false;
				var end = false;		
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						if (!canstart && !end){
							if (text.indexOf("Other")!=-1)
								canstart = true;
						}
						else if (canstart){
							if (text.indexOf("1.2011")!=-1)
								arr.push(text);	
							else{
								canstart = false;
								end = true;
							}	
						}										
						if (counter++ == elems.length){							
							assert.ok(arr.length==3, "acc number");
						}
					})
				})	
			})	
			self.done();
		})		
		it ("Check Account type", function(done){
			var self = this;
			self.trackError(done);			
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(!_.contains(arr, "Особый Bank"), "acc type");
						}
					})
				})			
			});			
			self.browser.findElement(By.id("page_menu")).click();	
			self.browser.findElement(By.id("settings")).click();
			helpers.runModal.call(self, null, function(modal) {				
		       self.browser.executeScript("$('select[name=\"accType\"]').val('BANK')");
		       modal.findElement(By.id("save")).click();
			});
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(_.contains(arr, "Особый Bank"), "acc type");
						}
					})
				})			
			});	
			self.done();
		})	
		it ("Check Currency", function(done){
			var self = this;
			self.trackError(done);			
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(_.contains(arr, "-50000.00"), "currency");
						}
					})
				})			
			});			
			self.browser.findElement(By.id("page_menu")).click();	
			self.browser.findElement(By.id("settings")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.linkText("General")).click();				
				self.browser.executeScript("$('select[name=\"reportCurrency\"]').val('USD')");
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElements(By.tagName("tspan")).then(function(elems){				
				var arr =[]; 	
				var counter = 0;			
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);
						if (counter++ == elems.length){							
							assert.ok(_.contains(arr, "-1636.50"), "currency");
						}
					})
				})			
			});	
			self.done();
		})	
		it ("Check date range", function(done){
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.id("page_menu")).click();	
			self.browser.findElement(By.id("settings")).click();
			helpers.runModal.call(self, null, function(modal) {	
				modal.findElement(By.linkText("General")).click();
				helpers.fillInput.call(modal, modal.findElement(By.name("startDate")), "03/01/2012");
				helpers.fillInput.call(modal, modal.findElement(By.name("endDate")), "05/01/2012");						
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElements(By.tagName("tspan")).then(function(elems){	
				var arr =[]; 	
				var counter = 0;			
				var canstart = false;
				var end = false;		
				_.forEach(elems, function(elem){					
					elem.getText().then(function(text){						
						arr.push(text);													
						if (counter++ == elems.length){		
							assert.ok(!_.contains(arr, "2.2012"), "date range");					
							assert.ok(_.contains(arr, "3.2012"), "date range");
							assert.ok(_.contains(arr, "4.2012"), "date range");
							assert.ok(_.contains(arr, "5.2012"), "date range");
							assert.ok(!_.contains(arr, "6.2012"), "date range");
						}
					})
				})	
			})	
			self.done();
		})						
	})
	describe.skip("Settings", function () {
		it("TBD")
	})
	
})
