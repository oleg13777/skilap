var async = require("async");

module.exports = function (ctx, app, api, prefix) {
	
	app.get(prefix, function (req, res, next) {
		res.redirect(prefix+"/user");
	})

	app.get("/", function(req, res, next) {
		async.waterfall([
			async.apply(ctx.getModulesInfo,req.session.apiToken),
			function render (modules) {
				res.render(__dirname+"/../views/index", {prefix:prefix, modules: modules});
			}],
			next
		);
	});
}
