var async = require("async");
var skconnect = require('skilap-connect');

module.exports = function (ctx, app, api, prefix) {
	
	app.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/core"}));

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
