var async = require("async");

module.exports = function (webapp) {
	var app = webapp.web;
	var ctx = webapp._ctx;
	var prefix = webapp.prefix;
	var api = webapp;	
	
	app.get(prefix, function (req, res, next) {
		res.redirect(prefix+"/user");
	})

	app.get("/", webapp.layout(), function(req, res, next) {
		async.waterfall([
			async.apply(ctx.getModulesInfo,req.session.apiToken),
			function render (modules) {
				res.render(__dirname+"/../res/views/index", {modules: modules});
			}],
			next
		);
	});
}
