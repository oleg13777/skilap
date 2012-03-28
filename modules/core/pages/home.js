var async = require("async");

module.exports = function account(ctx, app, api, prefix) {

	app.get(prefix+"/home", function(req, res, next) {
		console.log(req.session);
		async.waterfall([
			async.apply(api.getUser,req.session.apiToken),
			function render (user) {
				res.render(__dirname+"/../views/home", {prefix:prefix, user:user});
			}],
			next
		);
	});
}
