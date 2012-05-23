var async = require("async");
var temp = require("temp");
var fs   = require('fs');
var zlib = require('zlib');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;

	app.get(prefix + "/export", function(req, res, next) {
		async.waterfall([
			function get(cb) {
				cashapi.export(req.session.apiToken,cb)
			},
			function gzip(raw, cb) {
				zlib.gzip(JSON.stringify(raw), cb);
			},
			function send (data) {
				res.attachment('skilap.cash.gz');
				res.send(data)
			}],
			next
		);
	});
}
