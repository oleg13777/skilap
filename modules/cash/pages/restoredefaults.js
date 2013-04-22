var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var ctx = webapp.ctx;
	
	app.get(prefix + "/new/register", webapp.layout(), function(req, res, next) {
		if (_.isEmpty(req.query)) {
			async.series([
				function (cb1) {
					webapp.guessTab(req, {pid:'new-register',name:ctx.i18n(req.session.apiToken, 'cash', 'New register'),url:req.url}, cb1);
				},
				function (cb1) {				
					ctx.i18n_getCurrencies(req.session.apiToken, cb1);
				},				
			], function (err, r) {
				if (err) return next(err);
				var rdata = {settings:{views:__dirname+"/../res/views"},prefix:prefix, tabs:r[0], curencies:r[1]};
				res.render(__dirname+"/../res/views/restoredefaults", rdata);
			});
		} else if (req.query.confirm == 'true') {
			async.waterfall([
				function (cb1) {
					cashapi.newRegistry(req.session.apiToken, {"space":"ISO4217","id":req.query.currency || "USD"}, req.query.type || "default", cb1);
				},
				function (cb1) {
					webapp.removeTabs(req.session.apiToken, null, cb1);
				}
			], function (err) {
				if (err) return next(err);
				res.redirect(prefix+"/accounts/tree");
			});
		} else {
			async.waterfall([
				function (cb1) {
					webapp.removeTabs(req.session.apiToken, ['new-register'], cb1);
				}
			], function (err) {
				if (err) return next(err);
				res.redirect(prefix);
			});
		}
	});
}
