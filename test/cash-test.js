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
		it("Create new account")
		it("Edit account")
		it("Delete account")
	})	
	describe("Manage prices", function () {
		it("TBD")
	})
	describe("Registry input", function () {
		it("TBD")
	})
})
