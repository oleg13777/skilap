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

describe("Cash module report",function () {
	this.timeout(30000);
	before(function () {
		this.jobName = "Skilap - Cash module - Reports";
	});
	before(tutils.setupContext);
	before(function (done) {
		this.browser.manage().window().setSize(1280,768);
		this.fixture('dataentry').then(tutils.noerror(done));
	});
	after(tutils.shutdownContext);
	afterEach(tutils.afterEach);

	describe("Reports", function () {
		before(function(done) {
			var self = this;
			self.trackError(done);
			self.restoreDb('cash-gnucash');
			helpers.login.call(self, self.fixtures.dataentry.users[0], true);
			self.browser.findElement(By.linkText("Cash module")).click();
			helpers.waitElement.call(this,By.css("#index.ready"));
			self.done();
		});
		it ("Open barchart", function(done){
			var self = this;
			self.trackError(done);
			self.browser.findElement(By.linkText("Report")).click();
			self.browser.findElement(By.linkText("Spend/receive bar chart")).click();
			helpers.waitElement.call(this, By.id("highcharts-0"));

			self.browser.findElement(By.xpath("//ul[@id='page_menu']/li/a")).click();
			self.browser.wait(function () {
				return self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).isDisplayed();
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).click();
			helpers.runModal.call(self, null, function(modal) {
				modal.findElement(By.linkText("General")).click();
				helpers.fillInput.call(modal, modal.findElement(By.name("startDate")), "01/01/2011");
				helpers.fillInput.call(modal, modal.findElement(By.name("endDate")), "31/12/2011");
				modal.findElement(By.id("save")).click();
			});
			helpers.waitElement.call(self, By.id("highcharts-0"));
			self.done();
		});
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
					});
				});
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']/li/a")).click();
			self.browser.wait(function () {
				return self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).isDisplayed();
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).click();
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
					});
				});
			});
			self.done();
		});
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
					});
				});
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']/li/a")).click();
			self.browser.wait(function () {
				return self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).isDisplayed();
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).click();
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
					});
				});
			});
			self.done();
		});
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
					});
				});
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']/li/a")).click();
			self.browser.wait(function () {
				return self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).isDisplayed();
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).click();
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
			self.browser.findElement(By.xpath("//ul[@id='page_menu']/li/a")).click();
			self.browser.wait(function () {
				return self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).isDisplayed();
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).click();
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
			self.browser.findElement(By.xpath("//ul[@id='page_menu']/li/a")).click();
			self.browser.wait(function () {
				return self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).isDisplayed();
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).click();
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
			self.browser.findElement(By.xpath("//ul[@id='page_menu']/li/a")).click();
			self.browser.wait(function () {
				return self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).isDisplayed();
			});
			self.browser.findElement(By.xpath("//ul[@id='page_menu']//a[@id='settings']")).click();
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
})
