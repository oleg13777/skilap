var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;

	// split date range into periods
	function getPeriods (sd, ed) {
		var ret = [];
		var start = new Date(sd.valueOf());
		var end = new Date(sd.valueOf());
		while (end.valueOf() < ed.valueOf()) {
			end = new Date(start.getFullYear(),start.getMonth()+1,1);
			if (ed.valueOf()<end.valueOf())
				end = ed;
			ret.push({start:start, end:end, summ:0});
			start = end;
		}
		return ret;
	}

	// Calc accounts stats by perriod
	function calcAccStatsByPerriod (token, accounts, accType, startDate, endDate, periods, maxAcc, cb) {
		// prepare the matrix for single pass calculation
		var accKeys = _(accounts).reduce( function (memo, acc) {
			if ((acc.type == accType) && periods)
				memo[acc.id] = {name:acc.name, id:acc.id,summ:0,periods:_(periods).map(function (p) { return _(p).clone(); })};
			else if (acc.type == accType)
				memo[acc.id] = {name:acc.name, id:acc.id,summ:0};
			return memo;
		}, {})
		// do a single pass calcs
		cashapi.getTransactionsInDateRange(token,[startDate,endDate,true,false],function (err,trns) {
			if (err) return cb1(err);
			var total = 0;
			_(trns).forEach(function (tr) {
				_(tr.splits).forEach( function(split) {
					var acs = accKeys[split.accountId];
					if (acs) {
						var val = split.quantity;
						if (accType == "INCOME")
							val *= -1;
						acs.summ+=val;
						if (periods) {
							var d = (new Date(tr.datePosted)).valueOf();
							_(acs.periods).forEach(function (p) {
								if (d>p.start.valueOf() && d<=p.end.valueOf())
									p.summ+=val;
							})
						}
					}
				})
			})
			// find important accounts (with biggest summ over entire period)
			var iacs = _(accKeys).chain().map(function (acs) { return {id:acs.id, summ:acs.summ}})
				.sortBy(function (acs) {return acs.summ}).last(maxAcc)
				.reduce(function (memo, acs) { memo[acs.id]=1; return memo; }, {}).value();
			// colapse non important
			var final = _(accKeys).reduce( function (memo, accKey) {
				total += accKey.summ;
				if (_(iacs).has(accKey.id))
					memo[accKey.id] = accKey;
				else {
					var other = memo['other'];
					if (other==null) {
						accKey.name = "Other";
						accKey.id = 'other';
						memo['other'] = accKey;
					} else {
						other.summ+=accKey.summ;
						if (periods)
							for(var i =0; i<other.periods.length; i++) {
								other.periods[i].summ+=accKey.periods[i].summ;
							}
					}
				}
				return memo;
			}, {});
			// transform into report form
			var report = _(final).reduce( function (memo,accKey) {
				var obj = {};
				if (periods){
					var obj = {name:accKey.name, data:_(accKey.periods).pluck('summ')}
				} else {					
					obj = [accKey.name, accKey.summ];
				}
				memo.push(obj);
				return memo;
			}, [])
			
			if (!periods)
				report = {type:'pie', data: report};
			
			
			cb(null, report);
		})
	}
	
	function calculateDataForPie(token, params, vtabs, cb){
		async.waterfall([
			function (cb) { cashapi.getAllAccounts(token, cb) },
			function (accounts, cb1) {
				calcAccStatsByPerriod(token, accounts, params.accType, params.startDate, params.endDate, null, params.maxAcc, cb1);
			}
		], function (err, series) {			
			cb(null, {pie:true, settings:{views:__dirname+"/../views"}, prefix:prefix, tabs:vtabs, series:JSON.stringify(series), params:JSON.stringify(params)});
		});
	};

	function calculateDataForChart(token, params, vtabs, cb){
		var periods = getPeriods(params.startDate, params.endDate);
		var categories = _(periods).map(function (p) { return (p.start.getMonth()+1)+"."+p.start.getFullYear();});
		async.waterfall([
			function (cb) { cashapi.getAllAccounts(token, cb) },
			function (accounts, cb1) {
				calcAccStatsByPerriod(token, accounts, params.accType, params.startDate, params.endDate, periods, params.maxAcc, cb1);
			}
		], function (err, series) {			
			cb(null, {expense:true, settings:{views:__dirname+"/../views"}, prefix:prefix, tabs:vtabs, categories:JSON.stringify(categories), series:JSON.stringify(series), params:JSON.stringify(params)});
		});
	};
	
	function getDefaultSettings(reportName) {
		var defaultSettings = {
				startDate:new Date(new Date().getFullYear(), 0, 1),
				endDate:new Date(new Date().getFullYear(), 11, 31),
				accType:"EXPENSE",
				maxAcc:10,
				reportName:reportName,
				version: 1
			};
		return defaultSettings;
	}

	app.get(prefix + "/reports/barflow", function (req, res, next ) {
		report(req, res, next, "barflow");
	})

	app.get(prefix + "/reports/pieflow", function (req, res, next ) {
		report(req, res, next, "pieflow");
	})

	function report(req, res, next, type) {
		if (!req.query || !req.query.name) {
			res.redirect(req.url+"?name="+(type=='pieflow'?ctx.i18n(req.session.apiToken, 'cash','Pie flow chart'):ctx.i18n(req.session.apiToken,'cash','Bar flow chart')));
			return;
		}

		var pid = "reports-" +type + "-" + req.query.name;
		
		async.waterfall([
			function (cb1) {
				async.series([
					function(cb2) {
						webapp.guessTab(req, {pid: pid, name:req.query.name, url:req.url}, cb2);
					},
					function(cb2) {
						webapp.getTabSettings(req.session.apiToken, pid, cb2);
					}
				],
				function (err, results) {
					cb1(null, results[0], results[1]);
				});
			},
			function (vtabs, settings, cb1) {
				if (_.isEmpty(settings) || !settings.version || (settings.version != 1)) {
					settings = getDefaultSettings(req.query.name);
				}
				if (type == 'barflow')
					calculateDataForChart(req.session.apiToken, settings, vtabs, cb1);
				else
					calculateDataForPie(req.session.apiToken, settings, vtabs, cb1);
			},
			function (data) {
				res.render(__dirname+"/../views/report", data);
			}],
			next
		);
	};

	app.post(prefix + "/reports/barflow", function (req, res, next ) {
		saveParams(req, res, next, "barflow");
	})

	app.post(prefix + "/reports/pieflow", function (req, res, next ) {
		saveParams(req, res, next, "pieflow");
	})

	function saveParams (req, res, next, type) {
		var url = prefix+"/reports/"+type;
		var oldpid = "reports-" +type + "-" + req.query.name;
		var pid = "reports-" +type + "-" + req.body.reportName;
		var settings = getDefaultSettings();
		settings.accType = req.body.reportType;
		settings.maxAcc = req.body.maxAcc;
		settings.startDate = new Date(parseInt(req.body.startDate));
		settings.endDate = new Date(parseInt(req.body.endDate));
		settings.reportName = req.body.reportName;

		var steeps = [
			function(cb) { 
				webapp.removeTabs(req.session.apiToken, [pid], cb) 
			},
			function(cb) {
				webapp.guessTab(req, {pid:pid, name:settings.reportName, url:url+"?name="+settings.reportName}, cb);
			},
			function(cb){
				webapp.saveTabSettings(req.session.apiToken, pid, settings, cb);
			}
		];
		// if pid the same then not need to recreate tabs
		if (oldpid==pid)
			steeps = steeps.slice(2);
		
		async.series(steeps, function (err) {
			if (err) return next(err);
			res.writeHead(200, {'Content-Type': 'text/plain'});
			var redirectUrl = url+"?name="+settings.reportName;
			res.end(redirectUrl);
		})
	};
}
