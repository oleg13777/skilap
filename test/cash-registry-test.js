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
 * 		describe
 * 	For run only current test
 * 		describe.only
 * 	When error occurs, screenshot is available in test's dir (active)
 * 	Predefined data stored in file `dataentry.json`
 *	Frequently called functions should be defined in helpers
 * */

describe("Cash module registry",function () {
	this.timeout(30000);
	before(function () {
		this.jobName = "Skilap - Cash module - Registry";
	});
	before(tutils.setupContext);
	before(function (done) {
		this.browser.manage().window().setSize(1280,768);
		this.fixture('dataentry').then(tutils.noerror(done));
	});
	after(tutils.shutdownContext);
	afterEach(tutils.afterEach);

	describe("Registry input", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			this.restoreDb('core-users');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.done();
		});
		it("Creat empty", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();
			self.browser.findElement(By.linkText("New register")).click();
			helpers.waitElement.call(this,By.css("form#props"));
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			self.done();
		});
		it("Add transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']/div[.='" + tr.deposit_cur + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='" + tr.total_cur + "']"));
			//check date
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div[@class='tdContent' and .='" + tr.date + "']"))
			self.done();
		});
		it("Home page should have right ballance", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[0];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr.deposit + "')]]/li/a[.='" + tr.parent +"']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr.deposit + "')]]/li/a[.='" + tr.name + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(tr.deposit) != -1, "Sum error");
				self.done();
			});
		});
		it("Accounts page should have right ballance", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[0];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr.parent + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.deposit + "')]]/a[contains(.,'" + tr.name + "')]"));
			self.done();
		});
		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.browser.findElement(By.xpath("//div/a[contains(.,'" + tr1.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr2.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr2.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr2.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr2.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr2.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr2.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr2.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']/div[.='" + tr2.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='description']/div[.='" + tr2.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div[.='" + tr2.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']/div[.='" + tr2.deposit_cur + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "']"));
			//check date
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div[@class='tdContent' and .='" + tr2.date + "']"))
			self.done();
		});
		it("Home page should have right ballance 2", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.parent + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.name + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) != -1, "Sum error");
			});
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name2 + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name1 + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Liabilities:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit)) != -1, "Sum error");
				self.done();
			});
		});
		it("Accounts page should have right ballance 2", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.parent + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/a[contains(.,'" + tr1.name + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr2.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr2.deposit + "')]]/a[contains(.,'" + tr2.name2 + "')]"));
			self.saveDb('register-test').then(function() {
				self.done();
			});
		});
		it("Esc add transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			var tr3 = self.fixtures.dataentry.trs[2];
			self.browser.findElement(By.xpath("//div/a[contains(.,'" + tr1.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr3.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr3.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr3.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr3.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr3.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div[.='" + tr3.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']/div[.='" + tr3.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']/div[.='" + tr3.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']/div[.='" + tr3.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']/div[.='$ " + tr3.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.ESCAPE);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr2.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div[.='']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']/div[.='']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']/div[.='']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']/div[.='']"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']/div[.='']"));
			self.browser.isElementPresent(By.xpath("//tr[@data-id!='blank'][3]")).then(function (v) {
				assert(!v, "Not escaped");
			});
			self.done();
		});
	});
	describe("Registry edit", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('register-test');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.done();
		});
		it("Change date for first row by click", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			var tr1 = self.fixtures.dataentry.trs[1];
			var tr2 = self.fixtures.dataentry.trs[2];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']//input")).sendKeys(tr2.date);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']//input")).sendKeys(Key.TAB);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='description']")).click();

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div[.='" + tr1.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div[.='" + tr1.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']/div[.='" + tr1.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']/div[.='" + tr1.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']/div[.='$ " + tr1.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='total']/div[.='$ " + tr1.total + "']"));

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']/div[.='" + tr2.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='total']/div[.='$ " + (parseFloat(tr.deposit) + parseFloat(tr1.deposit)) + "']"));
			self.done();
		});
		it("Home page should have right ballance", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.parent + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.name + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) != -1, "Sum error");
			});
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name2 + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name1 + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Liabilities:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit)) != -1, "Sum error");
				self.done();
			});
		});
		it("Change date back by enter", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			var tr1 = self.fixtures.dataentry.trs[1];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']//input")).sendKeys(Key.RETURN);

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='total']/div[.='$ " + tr.total + "']"));

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']/div[.='" + tr1.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='num']/div[.='" + tr1.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='description']/div[.='" + tr1.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='path']/div[.='" + tr1.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='deposit']/div[.='$ " + tr1.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='total']/div[.='$ " + (parseFloat(tr.deposit) + parseFloat(tr1.deposit)) + "']"));
			self.done();
		});
		it("Home page should have right ballance 2", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.parent + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.name + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) != -1, "Sum error");
			});
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name2 + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name1 + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Liabilities:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit)) != -1, "Sum error");
				self.done();
			});
		});
		it("Change num field", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			var tr1 = self.fixtures.dataentry.trs[1];
			var tr2 = self.fixtures.dataentry.trs[2];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']//input")).sendKeys(tr2.num);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']//input")).sendKeys(Key.RETURN);

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div[.='" + tr2.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='total']/div[.='$ " + tr.total + "']"));

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']/div[.='" + tr1.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='num']/div[.='" + tr1.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='description']/div[.='" + tr1.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='path']/div[.='" + tr1.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='deposit']/div[.='$ " + tr1.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='total']/div[.='$ " + (parseFloat(tr.deposit) + parseFloat(tr1.deposit)) + "']"));
			self.done();
		});
		it("Home page should have right ballance 3", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.parent + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.name + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) != -1, "Sum error");
			});
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name2 + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name1 + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Liabilities:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit)) != -1, "Sum error");
				self.done();
			});
		});
		it("Change description and account field", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			var tr1 = self.fixtures.dataentry.trs[1];
			var tr2 = self.fixtures.dataentry.trs[2];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']//input")).sendKeys(tr2.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input")).sendKeys(tr2.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input")).sendKeys(Key.RETURN);

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div[.='" + tr2.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']/div[.='" + tr2.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']/div[.='" + tr2.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='total']/div[.='$ " + tr.total + "']"));

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']/div[.='" + tr1.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='num']/div[.='" + tr1.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='description']/div[.='" + tr1.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='path']/div[.='" + tr1.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='deposit']/div[.='$ " + tr1.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='total']/div[.='$ " + (parseFloat(tr.deposit) + parseFloat(tr1.deposit)) + "']"));
			self.done();
		});
		it("Home page should have right ballance 4", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.parent + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/li/a[.='" + tr2.name + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) != -1, "Sum error");
			});
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name2 + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr2.deposit + "')]]/li/a[.='" + tr2.name1 + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Liabilities:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr2.deposit)) != -1, "Sum error");
				self.done();
			});
		});
		it("Accounts page should have right ballance", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			var tr3 = self.fixtures.dataentry.trs[2];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.parent + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "')]]/a[contains(.,'" + tr1.name + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr2.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr2.deposit + "')]]/a[contains(.,'" + tr2.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr3.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr1.deposit + "')]]/a[contains(.,'" + tr3.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.name2 + "')]"));
			self.done();
		});
		it("Change spent field", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			var tr1 = self.fixtures.dataentry.trs[1];
			var tr2 = self.fixtures.dataentry.trs[2];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='withdrawal']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='withdrawal']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='withdrawal']//input")).sendKeys(tr2.withdrawal);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div[.='" + tr2.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']/div[.='" + tr2.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']/div[.='" + tr2.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']/div[.='']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='withdrawal']/div[.='$ " + tr2.withdrawal + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='total']/div[.='-$ " + Math.abs(tr2.total) + ".00']"));

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='date']/div[.='" + tr1.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='num']/div[.='" + tr1.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='description']/div[.='" + tr1.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='path']/div[.='" + tr1.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='deposit']/div[.='$ " + tr1.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='total']/div[.='$ " + (parseFloat(tr1.deposit) - parseFloat(tr2.withdrawal)) + "']"));
			self.done();
		});
		it("Home page should have right ballance 4", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[0];
			var tr1 = self.fixtures.dataentry.trs[1];
			var tr2 = self.fixtures.dataentry.trs[2];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr1.deposit) - parseFloat(tr2.withdrawal)) + "')]]/li/a[.='" + tr.parent + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + (parseFloat(tr1.deposit) - parseFloat(tr2.withdrawal)) + "')]]/li/a[.='" + tr.name + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr1.deposit) - parseFloat(tr2.withdrawal)) != -1, "Sum error");
			});
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr1.deposit + "')]]/li/a[.='" + tr1.name2 + "']"));
			self.browser.findElement(By.xpath("//ul[span[contains(., '" + tr1.deposit + "')]]/li/a[.='" + tr1.name1 + "']"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Liabilities:')]/span")).getText().then(function(text) {
				assert.ok(text.indexOf(parseFloat(tr1.deposit)) != -1, "Sum error");
				self.done();
			});
		});
		it("Accounts page should have right ballance 4", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			var tr3 = self.fixtures.dataentry.trs[2];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.parent + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + (parseFloat(tr2.deposit) - parseFloat(tr3.withdrawal)) + "')]]/a[contains(.,'" + tr1.name + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr2.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr2.deposit + "')]]/a[contains(.,'" + tr2.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr3.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr3.withdrawal + "')]]/a[contains(.,'" + tr3.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.name2 + "')]"));
			self.done();
		});
	});
	describe("Reconcile value editing", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('register-test');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.done();
		});
		it("Simple click", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='rstate']/div[.='n']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='rstate']")).click();
			helpers.waitGridUpdate.call(this);
			helpers.waitUnblock.call(this);

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='rstate']/div[.='c']"));
			self.browser.navigate().refresh();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.done();
		});
		it("Splits click", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr/td/div[.='" + tr.name1 + "::" + tr.name2 + "']")).click();
			self.browser.findElement(By.xpath("//tr[td/div[.='" + tr.name1 + "::" + tr.name2 + "']]/td[@data-name='rstate']/div[.='c']"));
			self.browser.findElement(By.xpath("//tr[td/div[.='" + tr.parent + "::" + tr.name + "']]/td[@data-name='rstate']/div[.='c']"));
			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='rstate']/div[.='c']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='rstate']")).click();
			helpers.waitGridUpdate.call(this);
			helpers.waitUnblock.call(this);

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='rstate']/div[.='n']"));
			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[td/div[.='" + tr.name1 + "::" + tr.name2 + "']]/td[@data-name='rstate']/div[.='n']"));
			self.browser.findElement(By.xpath("//tr[td/div[.='" + tr.parent + "::" + tr.name + "']]/td[@data-name='rstate']/div[.='n']"));
			self.done();
		});
	});
	describe("Create and edit with creating of new account", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('register-test');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.done();
		});
		it("Creat empty", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();
			self.browser.findElement(By.linkText("New register")).click();
			helpers.waitElement.call(this,By.css("form#props"));
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			self.done();
		});
		it("Add transaction 1", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.total + "']"));
			self.done();
		});
		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[3];

			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.runModal.call(this, null, function(modal) {
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.total + "']"));
			self.done();
		});
		it("Accounts page should have right ballance", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[3];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name1 + "')]"));
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + tr.name1 + "')]//div[contains(./a,'" + tr.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.deposit + "')]]/a[contains(.,'" + tr.name2 + "')]"));
			self.done();
		});
		it("Edit existing row", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[3];
			var tr1 = self.fixtures.dataentry.trs[4];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input")).sendKeys(tr1.name1 + "::" + tr1.name2);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.runModal.call(this, null, function(modal) {
				modal.findElement(By.id("save")).click();
			});

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div[.='" + tr2.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']/div[.='" + tr1.name1 + "::" + tr1.name2 + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='total']/div[.='$ " + tr.total + "']"));

			self.done();
		});
		it("Accounts page should have right ballance", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[3];
			var tr1 = self.fixtures.dataentry.trs[4];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name1 + "')]"));
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + tr.name1 + "')]//div[contains(./a,'" + tr.name2 + "')]"));
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + tr1.name1 + "')]//div[contains(./a,'" + tr1.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.deposit + "')]]/a[contains(.,'" + tr.name2 + "')]"));
			self.done();
		});
	});
	describe("Split mode input and edit", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('register-test');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.done();
		});
		it("Creat empty", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();
			self.browser.findElement(By.linkText("New register")).click();
			helpers.waitElement.call(this,By.css("form#props"));
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.done();
		});

		it("Splits click", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[5];
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			self.done();
		});

		it("Click on input row, it should expand in in split mode.", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[5];
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]"));

			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));

			self.done();
		});

		it("Verify that some fields are non editable.", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			self.browser.sleep(100);
			self.browser.isElementPresent(By.xpath("//tr[@data-id='blank']/td[@data-name='path']/div/input")).then(function(val) {
				assert.ok(!val, "Input error");
			});
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			self.browser.sleep(100);
			self.browser.isElementPresent(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']/div/input")).then(function(val) {
				assert.ok(!val, "Input error");
			});
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']")).click();
			self.browser.sleep(100);
			self.browser.isElementPresent(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']/div/input")).then(function(val) {
				assert.ok(!val, "Input error");
			});
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='total']")).click();
			self.browser.sleep(100);
			self.browser.isElementPresent(By.xpath("//tr[@data-id='blank']/td[@data-name='total']/div/input")).then(function(val) {
				assert.ok(!val, "Input error");
			});
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[1]")).click();
			self.browser.sleep(100);
			self.browser.isElementPresent(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[1]/div/input")).then(function(val) {
				assert.ok(!val, "Input error");
			});
			self.done();
		});

		it("Input data starting from date using tab key and escape.", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[5];
			self.trackError(done);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(Key.TAB);

			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			//
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			//
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input")).sendKeys(tr.split3n);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='deposit']//input")).sendKeys(tr.split3v);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			//
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input")).sendKeys(tr.split4n);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='withdrawal']//input")).sendKeys(tr.split4v);
			//delete
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td/a/i")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path' and contains(.,'" + tr.path + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and contains(@style, 'none')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path' and contains(.,'" + tr.split4n + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path' and contains(.,'')]"));

			//esc
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='withdrawal']//input")).sendKeys(Key.ESCAPE);

			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path' and contains(.,'')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path' and contains(.,'')]"));
			self.done();
		});

		it("Input data starting from date using tab key.", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[5];
			self.trackError(done);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(Key.TAB);

			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			//
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			//
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input")).sendKeys(tr.split3n);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='deposit']//input")).sendKeys(tr.split3v);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			//
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='description']//input")).sendKeys(tr.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input")).sendKeys(tr.split4n);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='withdrawal']//input")).sendKeys(tr.split4v);
			//delete
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td/a/i")).click();
			//save
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div")).click();
			//check Disballance row
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path' and contains(., 'Disballance')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit' and contains(., '" + tr.split4v + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td"));
			self.done();
		});

		it("Accounts page should have right ballance", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[5];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(this,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name1 + "')]"));
			self.browser.findElement(By.xpath("//li[contains(./div/a,'" + tr.name1 + "')]//div[contains(./a,'" + tr.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.deposit + "')]]/a[contains(.,'" + tr.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'-$ " + tr.deposit + "')]]/a[contains(.,'" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'-$ " + tr.split4v + "')]]/a[contains(.,'" + tr.split4n1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.split4v + "')]]/a[contains(.,'Disballance')]"));
			self.done();
		});

		it("Add transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[5];
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date1);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.total + "']"));
			self.done();
		});

		it("Click on row with two splits.", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[5];
			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][3]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][3]/td[@data-name='path' and .='']"));

			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.done();
		});

		it("Click on row with three splits.", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[5];
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][3]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][4]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][5]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][5]/td[@data-name='path' and .='']"));

			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][4]/td[@data-name='path' and contains(.,'Disballance')]"));
			self.done();
		});

		it("Edit data starting from date using tab key.", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[5];
			self.trackError(done);
			//check ballance before
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][1]/td[@data-name='total' and contains(., '" + Math.abs(tr.t1) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][2]/td[@data-name='total' and contains(., '" + tr.t2 + "')]"));

			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='date']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']/div/input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='description']//input")).sendKeys(Key.TAB);

			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][1]/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);

			//
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input")).clear();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input")).sendKeys(tr.v2);

			//save
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][2]/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);

			helpers.waitGridUpdate.call(this);
			//check ballance after
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][1]/td[@data-name='total' and contains(., '" + Math.abs(tr.t3) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][2]/td[@data-name='total' and contains(., '" + Math.abs(tr.t4) + "')]"));
			//check Disballance row
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path' and contains(., 'Disballance')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit' and contains(., '" + (parseFloat(tr.split4v) + parseFloat(tr.deposit)) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td"));
			self.done();
		});

		it("Add data.", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[5];
			self.trackError(done);

			//
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path']")).click();
			helpers.waitElement.call(self, By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path']//input")).sendKeys(tr.split3n);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(self, By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(self, By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal']//input")).sendKeys(tr.split3v);
			//save
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);
			helpers.waitGridUpdate.call(self);
			//check ballance after
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][1]/td[@data-name='total' and contains(., '" + Math.abs(tr.t3) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][2]/td[@data-name='total' and contains(., '" + Math.abs(tr.t4) + "')]"));
			//check Disballance row
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path' and contains(., 'Disballance')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit' and contains(., '" + (parseFloat(tr.split4v) + parseFloat(tr.split3v) + parseFloat(tr.deposit)) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path' and contains(., '" + tr.split3n + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal' and contains(., '" + tr.split3v + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][6]/td"));
			self.done();
		});

		it("Edit data and save by click in another row", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[5];
			self.trackError(done);

			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal']//input")).clear();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal']//input")).sendKeys(tr.split4v);
			//save
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='path']/div")).click();
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='num']/div")).click();
			//check ballance after
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][1]/td[@data-name='total' and contains(., '" + Math.abs(tr.t3) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][2]/td[@data-name='total' and contains(., '" + Math.abs(tr.t4) + "')]"));
			//check Disballance row
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path' and contains(., 'Disballance')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='deposit' and contains(., '" + (parseFloat(tr.split4v) + parseFloat(tr.split4v) + parseFloat(tr.deposit)) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='path' and contains(., '" + tr.split3n + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td[@data-name='withdrawal' and contains(., '" + tr.split4v + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][6]/td"));
			self.done();
		});

		it("Delete split row", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[5];
			self.trackError(done);
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td/a/i")).click();
			//save
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][2]/td[@data-name='path']/div")).click();
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td[@data-name='path']/div")).click();
			//check ballance after
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][1]/td[@data-name='total' and contains(., '" + Math.abs(tr.t3) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record ')][2]/td[@data-name='total' and contains(., '" + Math.abs(tr.t4) + "')]"));
			//check Disballance row
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='path' and contains(., 'Disballance')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][3]/td[@data-name='deposit' and contains(., '" + (parseFloat(tr.split4v) + parseFloat(tr.deposit)) + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='path' and contains(., '" + tr.split3n + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][4]/td[@data-name='withdrawal' and contains(., '" + tr.split4v + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split')][5]/td"));
			self.done();
		});
	});
	describe("Registry delete", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('register-test');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.done();
		});
		it("Creat empty", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(self,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();
			self.browser.findElement(By.linkText("New register")).click();
			helpers.waitElement.call(self,By.css("form#props"));
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.done();
		});
		it("Add transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr.date +"']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']/div[.='" + tr.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='description']/div[.='" + tr.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div[.='" + tr.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']/div[.='$ " + tr.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.total + "']"));
			self.done();
		});
		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr2.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr2.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr2.description);
			helpers.waitNoElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr2.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr2.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.TAB);
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr2.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='date']/div[.='" + tr2.date + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']/div[.='" + tr2.num + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='description']/div[.='" + tr2.description + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='path']/div[.='" + tr2.path + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']/div[.='$ " + tr2.deposit + "']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + (parseFloat(tr2.deposit) + parseFloat(tr1.deposit)) + "']"));
			self.done();
		});
		it("Accounts page should have right ballance 1", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr1.deposit + "')]]/a[contains(.,'" + tr1.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr2.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr2.deposit + "')]]/a[contains(.,'" + tr2.name2 + "')]"));
			self.done();
		});
		it("Delete transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td//button[@data-toggle='dropdown']")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank'][1]/td//a[.='Delete']")).click();

			helpers.waitGridUpdate.call(this);
			self.done();
		});
		it("Accounts page should have right ballance 2", function(done) {
			var self = this;
			var tr1 = self.fixtures.dataentry.trs[0];
			var tr2 = self.fixtures.dataentry.trs[1];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr1.name2 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr2.name1 + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr2.deposit + "')]]/a[contains(.,'" + tr2.name2 + "')]"));
			self.done();
		});
	});
	describe("Multicurrency test", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('register-test');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.done();
		});
		it("Creat empty", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(self,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();
			self.browser.findElement(By.linkText("New register")).click();
			helpers.waitElement.call(self,By.css("form#props"));
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.done();
		});
		it("Add price for USD in RUB", function(done) {
			var self = this;
			self.trackError(done);
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Rate Currency Editor")).click();
			helpers.waitElement.call(this,By.css("#priceeditor.ready"));
			self.browser.findElement(By.id("firstCurrency")).sendKeys(rate.name1);
			self.browser.findElement(By.id("secondCurrency")).sendKeys(rate.name2);
			self.browser.findElement(By.xpath("//button[.='Apply']")).click();
			helpers.waitElement.call(this, By.xpath("//button[.='Add']"));

			self.browser.findElement(By.xpath("//button[.='Add']")).click();
			helpers.runModal.call(this, null, function(modal) {
		        modal.findElement(By.id("datepicker")).sendKeys(rate.date);
				modal.findElement(By.id("newrate")).sendKeys(rate.rate);
				modal.findElement(By.id("save")).click();
			});
			self.done();
		});
		it("Add price for RUB in USD", function(done) {
			var self = this;
			self.trackError(done);
			var rate = self.fixtures.dataentry.rates[1];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Rate Currency Editor")).click();
			helpers.waitElement.call(this,By.css("#priceeditor.ready"));
			self.browser.findElement(By.id("firstCurrency")).sendKeys(rate.name1);
			self.browser.findElement(By.id("secondCurrency")).sendKeys(rate.name2);
			self.browser.findElement(By.xpath("//button[.='Apply']")).click();
			helpers.waitElement.call(this, By.xpath("//button[.='Add']"));

			self.browser.findElement(By.xpath("//button[.='Add']")).click();
			helpers.runModal.call(this, null, function(modal) {
		        modal.findElement(By.id("datepicker")).sendKeys(rate.date);
				modal.findElement(By.id("newrate")).sendKeys(rate.rate);
				modal.findElement(By.id("save")).click();
			});
			self.done();
		});
		it("Create root test account", function(done) {
			var self = this;
			self.trackError(done);
			var acc1 = self.fixtures.dataentry.accounts[3];

			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			helpers.waitElement.call(this, By.id("add_new"));
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
		it("Add transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(acc.name);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			helpers.runModal.call(this, null, function(modal) {
				self.browser.findElement(By.xpath("//input[@id='rate' and contains(@value, '" + rate.rate + "')]"));
				self.browser.findElement(By.xpath("//input[@id='sell' and contains(@value, '" + (parseFloat(rate.rate)*parseFloat(tr.deposit)) + "')]"));
				modal.findElement(By.id("save")).click();
			});
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.deposit + "']"));
			self.done();
		});
		it("Accounts page should have right ballance 1", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr.parent + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.deposit + "')]]/a[contains(.,'" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'" + tr.mtotal + "')]]/a[contains(.,'" + acc.name + "')]"));
			self.done();
		});
		it("Test first", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.deposit + "']"));

			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='path' and contains(.,'" + acc.name + "')]"));

			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='withdrawal' and contains(.,'3,000.00 руб" + /*(parseFloat(rate.rate)*parseFloat(tr.deposit)) +*/ "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='deposit' and contains(.,'" + tr.deposit + "')]"));
			self.done();
		});
		it("Test second", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + acc.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='- 3,000.00 руб" + /*(parseFloat(rate.rate)*parseFloat(tr.deposit)) +*/ "']"));

			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='path' and contains(.,'" + acc.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='withdrawal' and contains(.,'3,000.00 руб" + /*(parseFloat(rate.rate)*parseFloat(tr.deposit)) + */"')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='deposit' and contains(.,'" + tr.deposit + "')]"));
			self.done();
		});
		it("Edit transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposit1);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			helpers.runModal.call(this, null, function(modal) {
				modal.findElement(By.id("save")).click();
			});
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.deposit1 + "']"));
			self.done();
		});
		it("Accounts page should have right ballance 2", function(done) {
			var self = this;
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			self.trackError(done);
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ 0.00')]]/a[contains(.,'" + tr.parent + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.deposit1 + "')]]/a[contains(.,'" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'" + tr.mtotal1 + "')]]/a[contains(.,'" + acc.name + "')]"));
			self.done();
		});
		it("Test first 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.deposit1 + "']"));

			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='path' and contains(.,'" + acc.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='withdrawal' and contains(.,'1,500.00 руб')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='deposit' and contains(.,'$ " + tr.deposit1 + "')]"));
			self.done();
		});
		it("Test second 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + acc.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='- 1,500.00 руб']"));

			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='path' and contains(.,'" + acc.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='withdrawal' and contains(.,'1,500.00 руб')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='deposit' and contains(.,'$ " + tr.deposit1 + "')]"));
			self.done();
		});
		it("Test first 3", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='$ " + tr.deposit1 + "']"));

			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='path' and contains(.,'" + acc.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='withdrawal' and contains(.,'1,500.00 руб')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='deposit' and contains(.,'$ " + tr.deposit1 + "')]"));
			self.done();
		});
		it("Test second 3", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[@id='acc_row']/a[contains(.,'" + acc.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[.='- 1,500.00 руб']"));

			self.browser.findElement(By.xpath("//label[contains(., 'Split')]/input")).click();
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='num']")).click();
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='path' and contains(.,'" + acc.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][1]/td[@data-name='withdrawal' and contains(.,'1,500.00 руб')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='path' and contains(.,'" + tr.parent + "::" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//tr[contains(@class, 'acc-item-record-split') and not(contains(@style, 'none'))][2]/td[@data-name='deposit' and contains(.,'$ " + tr.deposit1 + "')]"));
			self.done();
		});
		it("Edit changing currency", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.browser.findElement(By.xpath("//div[contains(./a,'" + tr.name + "')]/span/a/i[@title='edit']")).click();
			helpers.runModal.call(self, null, function(modal) {
		        modal.findElement(By.id("acc_curency")).sendKeys("RU");
				modal.findElement(By.id("save")).click();
			});
			self.browser.findElement(By.xpath("//div[span[contains(.,'( " + tr.deposit1 + " " + tr.newcurr +")')]]/a[contains(.,'" + tr.name + "')]"));
			self.browser.findElement(By.xpath("//div[span[contains(.,'$ " + tr.newdeposit + "')]]/a[contains(.,'" + tr.name + "')]"));
			self.done();
		});
		it("Default currency test", function(done) {
			var self = this;
			self.trackError(done);
			var all = null;
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Home")).click();
			helpers.waitElement.call(self,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert(text.indexOf('руб') == -1, "Default currency error");
				all = text;
			});
			self.browser.findElement(By.linkText("Home")).click();
			self.browser.findElement(By.linkText("Page settings")).click();
			helpers.runModal.call(self, null, function(modal) {
		        modal.findElement(By.id("tr_parent")).sendKeys("RU");
				modal.findElement(By.id("save")).click();
			});
			helpers.waitElement.call(self,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//h2[contains(.,'Assets:')]/span")).getText().then(function(text) {
				assert(all != text, "Default currency error");
				assert(text.indexOf('руб') != -1, "Default currency error");
			});
			self.done();
		});
	});
	describe("Multicurrency dialog test", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('register-test');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.done();
		});
		it("Creat empty", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(self,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();
			self.browser.findElement(By.linkText("New register")).click();
			helpers.waitElement.call(self,By.css("form#props"));
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			self.done();
		});
		it("Add price for USD in RUB", function(done) {
			var self = this;
			self.trackError(done);
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Rate Currency Editor")).click();
			helpers.waitElement.call(this,By.css("#priceeditor.ready"));
			self.browser.findElement(By.id("firstCurrency")).sendKeys(rate.name1);
			self.browser.findElement(By.id("secondCurrency")).sendKeys(rate.name2);
			self.browser.findElement(By.xpath("//button[.='Apply']")).click();
			helpers.waitElement.call(this, By.xpath("//button[.='Add']"));

			self.browser.findElement(By.xpath("//button[.='Add']")).click();
			helpers.runModal.call(this, null, function(modal) {
		        modal.findElement(By.id("datepicker")).sendKeys(rate.date);
				modal.findElement(By.id("newrate")).sendKeys(rate.rate);
				modal.findElement(By.id("save")).click();
			});
			self.done();
		});
		it("Add price for RUB in USD", function(done) {
			var self = this;
			self.trackError(done);
			var rate = self.fixtures.dataentry.rates[1];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Rate Currency Editor")).click();
			helpers.waitElement.call(this,By.css("#priceeditor.ready"));
			self.browser.findElement(By.id("firstCurrency")).sendKeys(rate.name1);
			self.browser.findElement(By.id("secondCurrency")).sendKeys(rate.name2);
			self.browser.findElement(By.xpath("//button[.='Apply']")).click();
			helpers.waitElement.call(this, By.xpath("//button[.='Add']"));

			self.browser.findElement(By.xpath("//button[.='Add']")).click();
			helpers.runModal.call(this, null, function(modal) {
		        modal.findElement(By.id("datepicker")).sendKeys(rate.date);
				modal.findElement(By.id("newrate")).sendKeys(rate.newrate);
				modal.findElement(By.id("save")).click();
			});
			self.done();
		});
		it("Create root test account", function(done) {
			var self = this;
			self.trackError(done);
			var acc1 = self.fixtures.dataentry.accounts[3];

			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Accounts")).click();
			helpers.waitElement.call(self,By.css("#accounts-tree.ready"));
			helpers.waitElement.call(this, By.id("add_new"));
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
		it("Add transaction", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[6];
			var acc = self.fixtures.dataentry.accounts[3];
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));
			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(acc.name);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposit);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			helpers.runModal.call(this, null, function(modal) {
				//check readonly
				modal.findElement(By.xpath("//input[@id='rate' and not(@readonly)]"));
				modal.findElement(By.xpath("//input[@id='sell' and @readonly]"));
				modal.findElement(By.xpath("//input[@id='buy' and not(@readonly)]"));
				modal.findElement(By.id("rate_lock")).click();
				helpers.waitElement.call(self, By.xpath("//input[@id='rate' and @readonly]"));
				modal.findElement(By.xpath("//input[@id='rate' and @readonly]"));
				modal.findElement(By.xpath("//input[@id='sell' and not(@readonly)]"));
				modal.findElement(By.xpath("//input[@id='buy' and not(@readonly)]"));

				//check currency names and valse
				modal.findElement(By.xpath("//label[contains(., 'Sell RUB, buy USD')]/input[@id='plain' and @checked]"));
				modal.findElement(By.xpath("//label[contains(., 'Sell USD, buy RUB')]/input[@id='inverse']"));
				modal.findElement(By.xpath("//span[@id='first_cur' and .='1x USD']"));
				modal.findElement(By.xpath("//span[@id='second_cur' and .='RUB']"));
				modal.findElement(By.xpath("//input[@id='rate' and contains(@value, '33.33')]"));
				modal.findElement(By.xpath("//input[@id='sell' and contains(@value, '3333')]"));
				modal.findElement(By.xpath("//span[@id='sell_cur' and .='RUB']"));
				modal.findElement(By.xpath("//input[@id='buy' and contains(@value, '100')]"));
				modal.findElement(By.xpath("//span[@id='buy_cur' and .='USD']"));

				modal.findElement(By.xpath("//label[contains(., 'Sell USD, buy RUB')]/input[@id='inverse']")).click();
				helpers.waitUnblock.call(self);
				modal.findElement(By.xpath("//input[@id='rate' and not(@readonly)]"));
				modal.findElement(By.xpath("//input[@id='sell' and not(@readonly)]"));
				modal.findElement(By.xpath("//input[@id='buy' and @readonly]"));

				//check currency names and value
				modal.findElement(By.xpath("//label[contains(., 'Sell RUB, buy USD')]/input[@id='plain']"));
				modal.findElement(By.xpath("//label[contains(., 'Sell USD, buy RUB')]/input[@id='inverse']")).getAttribute('checked').then(function(v) {
					assert(v, "Not checked");
				});
				modal.findElement(By.xpath("//span[@id='first_cur' and .='1x USD']"));
				modal.findElement(By.xpath("//span[@id='second_cur' and .='RUB']"));
				modal.findElement(By.xpath("//input[@id='rate' and contains(@value, '30.00')]"));
				modal.findElement(By.xpath("//input[@id='sell' and contains(@value, '3333')]"));
				modal.findElement(By.xpath("//span[@id='sell_cur' and .='USD']"));
				modal.findElement(By.xpath("//input[@id='buy' and contains(@value, '99999')]"));
				modal.findElement(By.xpath("//span[@id='buy_cur' and .='RUB']"));

				modal.findElement(By.xpath("//input[@id='rate']")).clear();
				modal.findElement(By.xpath("//input[@id='rate']")).sendKeys('20');
				modal.findElement(By.xpath("//input[@id='sell' and contains(@value, '3333')]"));
				modal.findElement(By.xpath("//input[@id='buy' and contains(@value, '66666')]"));
				modal.findElement(By.id("updateprice")).click();
				modal.findElement(By.id("save")).click();
			});
			helpers.waitElement.call(this, By.xpath("//tr[@data-id!='blank']/td[@data-name='date']"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='withdrawal']/div[contains(., '3,333')]"));
			self.browser.findElement(By.xpath("//tr[@data-id!='blank']/td[@data-name='total']/div[contains(.,'3,333')]"));
			self.done();
		});
		it("Check price for USD in RUB", function(done) {
			var self = this;
			self.trackError(done);
			var rate = self.fixtures.dataentry.rates[0];
			self.browser.findElement(By.linkText("View")).click();
			self.browser.findElement(By.linkText("Rate Currency Editor")).click();
			helpers.waitElement.call(self,By.css("#priceeditor.ready"));
			self.browser.findElement(By.id("firstCurrency")).sendKeys("EUR");
			self.browser.findElement(By.id("secondCurrency")).sendKeys("CU");
			//TODO
			self.browser.sleep(1000);
			self.browser.findElement(By.xpath("//button[.='Apply']")).click();
			helpers.waitElement.call(self, By.xpath("//button[.='Edit']"));
			//TODO
			self.browser.sleep(1000);
			self.browser.findElement(By.id("firstCurrency")).sendKeys(rate.name1);
			//TODO
			self.browser.sleep(1000);
			self.browser.findElement(By.id("secondCurrency")).sendKeys(rate.name2);
			//TODO
			self.browser.sleep(1000);
			self.browser.findElement(By.xpath("//button[.='Apply']")).click();
			helpers.waitElement.call(self,By.xpath("//td[@class='rate' and .='20']"));
			self.browser.findElement(By.xpath("//td[@class='rate' and .='20']"));
			self.done();
		});
	});
	describe.skip("Registry input scroll", function () {
		it("Login as user", function(done) {
			var self = this;
			self.trackError(done);
			this.restoreDb('core-users');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.done();
		});
		it("Creat empty", function(done) {
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.browser.findElement(By.xpath("//*[contains(.,'Assets:')]"));
			self.browser.findElement(By.linkText("Data")).click();
			self.browser.findElement(By.linkText("New register")).click();
			helpers.waitElement.call(this,By.css("form#props"));
			self.browser.findElement(By.id("acc_curency")).sendKeys("USD");
			self.browser.findElement(By.xpath("//input[@value='Confirm']")).click();
			self.done();
		});
		it("Add transaction 1", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			self.browser.findElement(By.xpath("//a[contains(.,'" + tr.name + "')]")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			self.done();
		});

		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);
			self.done();
		});

		it("Add transaction 1", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			self.done();
		});

		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);
			self.done();
		});

		it("Add transaction 1", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			self.done();
		});

		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);
			self.done();
		});
		it("Add transaction 1", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			self.done();
		});

		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);
			self.done();
		});
		it("Add transaction 1", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='deposit']//input")).sendKeys(Key.RETURN);
			self.done();
		});

		it("Add transaction 2", function(done) {
			var self = this;
			self.trackError(done);
			var tr = self.fixtures.dataentry.trs[0];
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']"));

			helpers.waitGridUpdate.call(this);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='date']//input")).sendKeys(tr.date);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='num']//input")).sendKeys(tr.num);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='description']//input")).sendKeys(tr.description);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).clear();
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(tr.path);
			helpers.waitElement.call(this, By.css(".typeahead"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='path']//input")).sendKeys(Key.RETURN);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']")).click();
			helpers.waitElement.call(this, By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input"));
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(tr.deposite);
			self.browser.findElement(By.xpath("//tr[@data-id='blank']/td[@data-name='withdrawal']//input")).sendKeys(Key.RETURN);
			self.done();
		});
	});
});
