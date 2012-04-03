var async = require("async");
var skconnect = require('skilap-connect');

module.exports = function account(ctx, app, api, prefix) {

	app.use(skconnect.vstatic(__dirname + '/../public',{vpath:"/core"}));
	
	app.get(prefix+"/user", function(req, res, next) {
		async.waterfall([
			function (cb1) {
				var rdata = {prefix:prefix, header:true, token:req.session.apiToken};
				cb1(null, rdata);
			},
			function render (data) {
				res.render(__dirname+"/../views/user", data);
			}],
			next
		);
	});
}
