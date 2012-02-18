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
		var end;
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
	
	app.get(prefix + "/report", function(req, res, next) {
		var accType = "EXPENSE";
		var x_title = "";
		var y_title = "";
		var startDate = new Date(new Date().getFullYear()-1, 0, 1);
		var endDate = new Date(new Date().getFullYear()-1, 11, 31);
		var maxAcc = 10;
		var newQuery = false;
		async.waterfall([
			// parse query request
			function (cb1) {
				if (req.query) {

					if (req.query.report_type){
						if (req.query.report_type == "expense"){
							accType = "EXPENSE";
							x_title = "Expense Over Time";
							y_title = "Total Expense";
							newQuery = true;
						}
						if (req.query.report_type == "income"){
							accType = "INCOME";
							x_title = "Income Over Time";
							y_title = "Total Income";
							newQuery = true;
						}
					}

					if (req.query.max_acc) {
						maxAcc = req.query.max_acc;
						newQuery = true;
					}

					if (req.query.start_date && req.query.end_date) {
						startDate = new Date(parseInt(req.query.start_date));
						endDate = new Date(parseInt(req.query.end_date));
						newQuery = true;
					}

					if (req.query.max_acc) {
						maxAcc = req.query.max_acc;
						newQuery = true;
					}
				} else {
					newQuery = false;
				}
				cb1(null, {startDate:startDate, endDate:endDate, accType:accType, maxAcc:maxAcc});
			},
			function (params, cb1) {
				async.parallel({
					getSettings : function(cb2) {
						webapp.getTabSettings(req, 'report', cb2);
					},
					getVTabs : function(cb2) {
						webapp.guessTab(req, {pid:'report',name:'Report',url:req.url}, cb2);
					}
				}, 
				function (err, results){
					var settings = results.getSettings;
					var vtabs = results.getVTabs;
					cb1(err, params, vtabs, settings);
				});
			},
			function (params, vtabs, settings, cb1) {
				var periods = getPeriods(startDate, endDate);
				var categories = _(periods).map(function (p) { return (p.start.getMonth()+1)+"."+p.start.getFullYear();});
				if (settings && !newQuery) {
					cb1(null, settings);
				} else {
					async.waterfall([
						async.apply(cashapi.getAllAccounts, req.session.apiToken),
						function (accounts, cb2) {
							calcAccStatsByPerriod(req.session.apiToken, accounts, params.accType, params.startDate, params.endDate, periods, maxAcc, cb2);
						}
					], 
					function (err, series) {
						cb1(null, {prefix:prefix, tabs:vtabs, x_title:x_title, y_title:y_title, categories:JSON.stringify(categories), series:JSON.stringify(series), params:JSON.stringify(params)});
					});
				}
			},
			function (settings) {
				webapp.saveTabSettings(req, 'report', settings, function (err, len, pos) {
					res.render(__dirname+"/../views/report", settings);
				});
			}],
			next
		);
	});
}
