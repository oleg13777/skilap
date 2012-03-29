var async = require("async");
var skconnect = require('skilap-connect');

module.exports = function (ctx, app, api, prefix) {
	
	app.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/core"}));

	app.get(prefix, function (req, res, next) {
		res.redirect(prefix+"/home");
	})

	app.get("/", function(req, res, next) {
		console.log(req.cookies);
		async.waterfall([
			async.apply(ctx.getModulesInfo),
			function render (modules) {
				res.render(__dirname+"/../views/index", {prefix:prefix, modules: modules, tittle:"Welcome to SkiLap!"});
			}],
			next
		);
	});

	app.get("/logout", function (req, res, next){
		res.clearCookie("skilapid");
		res.clearCookie("sguard");
		res.clearCookie("connect.sid");
		api.logOut(req.session.apiToken, function() { res.redirect(prefix)});
	});
}
