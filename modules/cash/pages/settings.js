var async = require("async");
var safe = require('safe');
var _ = require('underscore');
var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("MM/dd/yyyy");

module.exports = function priceeditor(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var ctx = webapp.ctx;
	
	app.get(prefix + "/settings", webapp.layout(), safe.trap(function(req, res, next) {	
		async.series({
			currency:function (cb) { 
				webapp.getUseRangedCurrencies(req.session.apiToken,cb)
			},
			defCurrency:function(cb){
				cashapi.getSettings(req.session.apiToken,"currency",{space:"ISO4217",id:ctx.i18n(req.session.apiToken, 'cash', 'USD')}, cb)
			},
			checkRate:function(cb){
				cashapi.getSettings(req.session.apiToken,"checkRate",false, cb);
			}
		}, safe.trap_sure(next, function render (r) {	
			var rdata = {
				settings:{views:__dirname+"/../res/views/"},
				prefix:prefix, 
				values:{currency:r.defCurrency, checkRate: r.checkRate},
				usedCurrencies:r.currency.used,
				notUsedCurrencies:r.currency.unused,
				mainLayoutHide:1
			};
			res.render(__dirname+"/../res/views/settings", rdata);
		}));
	}));
	
	app.post(prefix+"/settings/update", function(req, res, next) {
		var acc = {};
		acc = req.body.data;
		settings_key = (req.body.key ? req.body.key : "currency");
		cashapi.saveSettings(req.session.apiToken, settings_key, acc, function (err, acc_) {
			if (err) return next(err);
			res.send("ok");
		})
	});	
}
