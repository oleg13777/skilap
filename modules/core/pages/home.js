var async = require("async");

module.exports = function account(ctx, app, api, prefix) {

	app.get(prefix+"/home", function(req, res, next) {
		async.waterfall([
			function(cb1){
				api.getUser(req.session.apiToken, function(err, user){
					if (err) { console.log(err); cb1(err); }
					cb1(null, user);
				});
			},
			function render (user) {
				res.render(__dirname+"/../views/home", {prefix:prefix, user:user});
			}],
			next
		);
	});
}
