var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var ctx = webapp.ctx;
	
	app.get(prefix + "/restoredefaults", function(req, res, next) {
		if (_.isEmpty(req.query)) {
			async.waterfall([
				function (cb1) {
					webapp.guessTab(req, {pid:'restore',name:ctx.i18n(req.session.apiToken, 'cash', 'toDefaults'),url:req.url}, cb1);
				},
				function render (vtabs) {
					var rdata = {settings:{views:__dirname+"/../views"},prefix:prefix, tabs:vtabs};
					res.render(__dirname+"/../views/restoredefaults", rdata);
				}],
				next
			);
		} else if (req.query.confirm == 'true') {
			async.waterfall([
				function (cb1) {
					cashapi.restoreToDefaults(req.session.apiToken, cb1);
				},
				function (cb1) {
					webapp.removeTabs(req.session.apiToken, ['restore'], cb1);
				},
				function (cb1) {
					res.redirect(prefix);
				}
			],next);
		} else {
			async.waterfall([
				function (cb1) {
					webapp.removeTabs(req.session.apiToken, ['restore'], cb1);
				},
				function (cb1) {
					res.redirect(prefix);
				}
			],next);
		}
	});
}
