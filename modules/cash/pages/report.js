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
			if (acc.type == accType)
				memo[acc.id] = {name:acc.name, id:acc.id,summ:0,periods:_(periods).map(function (p) { return _(p).clone(); })};
			return memo;
		}, {})
		// do a single pass calcs
		cashapi.getTransactionsInDateRange(token,[startDate,endDate,true,false],function (err,trns) {
			if (err) return cb1(err);
			_(trns).forEach(function (tr) {
				_(tr.splits).forEach( function(split) {
					var acs = accKeys[split.accountId];
					if (acs) {
						var val = split.quantity;
						if (accType == "INCOME")
							val *= -1;

						acs.summ+=val;
						var d = (new Date(tr.datePosted)).valueOf();
						_(acs.periods).forEach(function (p) {
							if (d>p.start.valueOf() && d<=p.end.valueOf())
								p.summ+=val;
						})
					}
				})
			})
			// find important accounts (with biggest summ over entire period)
			var iacs = _(accKeys).chain().map(function (acs) { return {id:acs.id, summ:acs.summ}})
				.sortBy(function (acs) {return acs.summ}).last(maxAcc)
				.reduce(function (memo, acs) { memo[acs.id]=1; return memo; }, {}).value();
			// colapse non important
			var final = _(accKeys).reduce( function (memo, accKey) {
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
						for(var i =0; i<other.periods.length; i++) {
							other.periods[i].summ+=accKey.periods[i].summ;
						}
					}
				}
				return memo;
			}, {});
			// transform into report form
			var report = _(final).reduce( function (memo,accKey) {
				var obj = {name:accKey.name, data:_(accKey.periods).pluck('summ')}
				memo.push(obj);
				return memo;
			}, [])
			
			cb(null, report);
		})
	}
	
	function createNewSettings(token, params, categories, vtabs, periods, cb){
		async.waterfall([
			async.apply(cashapi.getAllAccounts, token),
			function (accounts, cb1) {
				calcAccStatsByPerriod(token, accounts, params.accType, params.startDate, params.endDate, periods, params.maxAcc, cb1);
			}
		], function (err, series) {
			cb(null, {prefix:prefix, tabs:vtabs, x_title:x_title, y_title:y_title, categories:JSON.stringify(categories), series:JSON.stringify(series), params:JSON.stringify(params)});
		});
	};
	
	app.get(prefix + "/report", function(req, res, next) {
		var accType = "EXPENSE";
		x_title = "Expense Over Time";
		y_title = "Total Expense";
		var startDate = new Date(new Date().getFullYear()-1, 0, 1);
		var endDate = new Date(new Date().getFullYear()-1, 11, 31);
		var maxAcc = 10;
		var pid = 'expense';
		var name = 'expense';
		var url = req.url;
		var redirect = true;
		
		if (req.query && req.query.name) {
			name = req.query.name;
			pid = name;
			redirect = false;
		} else {
			url = req.url+"?name="+name;
		}

		var params = {startDate:startDate, endDate:endDate, accType:accType, maxAcc:maxAcc, reportName:name};
		console.log(params);
		var periods = getPeriods(params.startDate, params.endDate);
		var categories = _(periods).map(function (p) { return (p.start.getMonth()+1)+"."+p.start.getFullYear();});

		if (redirect) {
			async.waterfall([
				function (cb1) {
					webapp.guessTab(req, {pid:pid, name:name, url:url}, cb1);
				},
				function (vtabs, cb1) {
					createNewSettings(req.session.apiToken, params, categories, vtabs, periods, cb1);
				},
				function (settings, cb1) {
					webapp.saveTabSettings(req.session.apiToken, pid, settings, cb1);
				},
				function (cb1) {
					res.redirect(url);
				}],
				next
			);
		} else {
			async.waterfall([
				function (cb1) {
					webapp.getTabSettings(req.session.apiToken, pid, cb1);
				},
				function (settings, cb1) {
					if (settings && !_.isEmpty(settings)) {
						cb1(null, settings);
					} else {
						webapp.guessTab(req, {pid:pid, name:name, url:url}, function(err, vtabs) {
							createNewSettings(req.session.apiToken, params, categories, vtabs, periods, function(err, settings) {
								webapp.saveTabSettings(req.session.apiToken, pid, settings, function(err){
									cb1(err, settings);
								})
							});
						});
					}
				},
				function (settings) {
					res.render(__dirname+"/../views/report", settings);
				}],
				next
			);
		}
	});
	
	app.post(prefix+"/report", function(req, res, next) {
		async.waterfall([
			function (cb1) {
				var accType = "EXPENSE";
				var x_title = "Expense Over Time";
				var y_title = "Total Expense";
				if (req.body.reportType == "INCOME"){
					accType = "INCOME";
					x_title = "Income Over Time";
					y_title = "Total Income";
				}
				var maxAcc = req.body.maxAcc;
				var startDate = new Date(parseInt(req.body.startDate));
				var endDate = new Date(parseInt(req.body.endDate));
				var reportName = req.body.reportName;
				cb1(null, {startDate:startDate, endDate:endDate, accType:accType, maxAcc:maxAcc, reportName:reportName});
			},
			function (params, cb1) {
				var periods = getPeriods(params.startDate, params.endDate);
				var categories = _(periods).map(function (p) { return (p.start.getMonth()+1)+"."+p.start.getFullYear();});
				webapp.guessTab(req, {pid:params.reportName, name:params.reportName,url:req.url+"?name="+params.reportName}, function(err, vtabs) {
					createNewSettings(req.session.apiToken, params, categories, vtabs, periods, function(err, settings) {
						cb1(err, settings, params.reportName);
					});
				});
			},
			function(settings, name){
				webapp.saveTabSettings(req.session.apiToken, name, settings, function (err, len, pos) {
					res.writeHead(200, {'Content-Type': 'text/plain'});
					var redirectUrl = prefix+"/report?name="+name;
					res.end(redirectUrl);
				});
			}
		], next);
	});
}
