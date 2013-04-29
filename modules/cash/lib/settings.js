var async = require('async');
var safe = require('safe');
var _ = require('underscore');
var SkilapError = require("skilap-utils").SkilapError;

module.exports.getSettings = function(token, id, defs, cb) {
	var self = this;
	console.log("getSettings", arguments);

	async.series ([
		function (cb) {
			self._coreapi.checkPerm(token, ['cash.view'], cb);
		},
		function get(cb) {
			self._cash_settings.findOne({'id': id}, cb);
		}], function end(err, results) {
			if (err) return cb(err);
			var res = results[1];
			if (!res) res = defs;		
			cb(null, res);
		}
	);
};

module.exports.saveSettings = function(token, id, settings, cb) {	
	console.log("saveSettings", arguments);
	var self = this;
	async.waterfall ([
		function (cb) {
			self._coreapi.checkPerm(token, ['cash.edit'], cb);
		},
		function (cb) {
			self.getSettings(token, id, settings, cb);
		},
		function (old, cb) {			
			_.extend(old, settings);
			old.id = id;
			self._cash_settings.save(old, cb);
		}], 
		safe.sure(cb, function () {
			process.nextTick(cb);
		})
	);
};

module.exports.clearSettings = function (token, ids, cb) {
	console.log("clearSettings", arguments);
	
	var self = this;
	if (ids == null) {
		async.series ([
			function (cb) {
				async.parallel([
					function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
					function (cb) { self._waitForData(cb); }
				],cb);
			},
			function (cb) {
				self._cash_settings.remove(cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {});
		}));
	} else {
		async.series ([
			function (cb) {
				async.parallel([
					function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
					function (cb) { self._waitForData(cb); }
				],cb);
			},
			function(cb){
				self._cash_settings.remove(_.map(ids, function(id) { return new self._ctx.ObjectID(id); }),cb);
			} 
		], safe.sure_result(cb, function () {
			self._calcStats(function () {});
		}));
	}
};

module.exports.importSettings = function  (token, settings, cb) {
	console.log("importSettings", arguments);	
	var self = this;
	async.series ([
		function (cb) {
			async.parallel([
				function (cb) { self._coreapi.checkPerm(token,["cash.edit"],cb); },
				function (cb) { self._waitForData(cb); }
			],cb);
		},
		function (cb) {
			self._cash_settings.save(settings,cb);
		}, 
	], safe.sure_result(cb, function () {
		self._calcStats(function () {});
	}));
};
