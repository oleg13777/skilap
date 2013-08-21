var webdriver = require('selenium-webdriver')
var By = webdriver.By;
var Key = webdriver.Key;
var assert = require("assert");
var _ = require("lodash");

module.exports.login = function (user, check) {
	var self = this;
	this.browser.get("http://localhost:8080/login");
	// wait for page load
	self.browser.wait(function () {
		return self.browser.isElementPresent(By.name("name")).then(function (v) {return v; });
	});		
	this.browser.findElement(By.name("name")).sendKeys(user.login)
	this.browser.findElement(By.name("password")).sendKeys(user.password)
	this.browser.findElement(By.css("button[name='dologin']")).click()
	// wait for page reload
	self.browser.wait(function () {
		return self.browser.isElementPresent(By.name("name")).then(function (v) {return !v; });
	});
}

module.exports.waitModalLoad = function (selector) {
	var self = this;
	selector = selector || By.css('.modal');
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector)
	});
	var modal = this.browser.findElement(selector);

	self.browser.wait(function () {
		return modal.getCssValue("opacity").then(function (v) { return v==1; });
	})
	return modal;
}

module.exports.runModal = function (selector, run) {
	var self = this;
	selector = selector || By.css('.modal');
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector)
	});
	this.browser.findElement(selector).then(function (modal) {
		self.browser.wait(function () {
			return modal.getCssValue("opacity").then(function (v) { return v==1; });
		});
		run(modal);
		
		self.browser.wait(function () {
			return self.browser.isElementPresent(selector).then(function (v) { return !v; })
		});	
	});
}

module.exports.waitModalUnload = function (selector) {
	var self = this;
	selector = selector || By.css('.modal');
	self.browser.wait(function () {
		return self.browser.isElementPresent(selector).then(function (v) { return !v; })
	});	
}

module.exports.waitUnblock = function () {
	var self = this;
	self.browser.wait(function () {
		return self.browser.isElementPresent(By.xpath("//div[@class='blockUI blockOverlay']")).then(function (isPresent)
				 { return !isPresent; } );
	});
};

module.exports.waitGridUpdate = function () {
	var self = this;
	self.browser.wait(function () {
		return self.browser.isElementPresent(By.css(".container-dirty")).then(function (isPresent)
				 { return !isPresent; } );
	});
};

module.exports.waitElement = function (element) {
	var self = this;
	self.browser.wait(function () {
		return self.browser.isElementPresent(element).then(function (isPresent)
				 { return isPresent; } );
	});
//	self.browser.wait(function () {
//		return self.browser.findElement(element).isDisplayed();
//	});
};

module.exports.waitNoElement = function (element) {
	var self = this;
	self.browser.wait(function () {
		return self.browser.isElementPresent(element).then(function (isPresent)
				 { return !isPresent; } );
	});
};

module.exports.fillInput = function(input,val){
	input.getAttribute("value").then(function(text){
		if(text != ""){
			input.sendKeys(Key.HOME);
			for(var i=0;i<text.length;i++){
				input.sendKeys(Key.DELETE);
			}
		}
		input.sendKeys(val);
	});
}
