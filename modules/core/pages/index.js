var async = require("async");

module.exports = function (ctx, app, api, prefix) {

	app.get("/", function(req, res, next) {
		var t = [];
		async.waterfall([
			async.apply(ctx.getModulesInfo),
			function render (modules) {
				res.render(__dirname+"/../views/index", {prefix:prefix, modules: modules});
			}],
			next
		);
	});
}
