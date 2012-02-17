var async = require("async");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;


	function getPerriods (sd, ed) {
		var month_name = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		function getDaysCount (d) {
			var days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
			return days;
		};
		
		var ret = [];
		if (sd.getFullYear() == ed.getFullYear() && sd.getMonth() == ed.getMonth()){
			var period = {start:sd,end:ed};
			ret.push(period);
		} else if (sd.getFullYear() == ed.getFullYear() && sd.getMonth() + 1 == ed.getMonth()) {
			ret = [{start:sd, end:new Date(sd.getFullYear(), sd.getMonth(), getDaysCount(sd)+1)}, {start:new Date(sd.getFullYear(), sd.getMonth(), getDaysCount(sd)+2), end:ed}];
		} else {
			var start = sd;
			var end = new Date(sd.getFullYear(), sd.getMonth(), getDaysCount(sd)+1);
			var month = month_name[sd.getMonth()];
			while (end.valueOf() < ed.valueOf()) {
				var obj = {start:start, end:end, month:month};
				ret.push(obj);
				start = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
				end = new Date(start.getFullYear(), start.getMonth(), getDaysCount(start)+1);
				month = month_name[start.getMonth()];
			}
			ret.push({start: new Date(ed.getFullYear(), ed.getMonth(), 2), end:ed, month:month_name[ed.getMonth()]});
		}
		
		return ret;		
	}

	// Calc accounts stats by perriod
	function calcAccStatsByPerriod (token, accounts, accType, startDate, endDate, cb1) {
		var stat = [];
		accounts.forEach(function (acc) {
			if (acc.type == accType) {
				cashapi.calcAccSummByPerriod(token, startDate, endDate, acc.id, function(err, summ) {
					stat.push({id:acc.id, summ:summ, name:acc.name});
				});
			}
		});
		cb1(null, _.sortBy(stat, function(s) { return Math.abs(s.summ)}));
	}
	
	// Split all accounts for main and other
	function splitAccounts (acc, maxAcc, cb) {
		var accounts = {main:[], others:[]};
		for(var i = 0; i<acc.length; i++) {
			if (i < (acc.length - maxAcc + 1)) {
				accounts.others.push(acc[i]);
			} else {
				accounts.main.push(acc[i]);
			}
		}
		cb(null, accounts);
	}

	function getCatigories (periods) {
		var month_name = [];
		periods.forEach(function (p) {
			month_name.push(p.month);
		});
		return month_name;
	}
			
	function calcSeries (accounts, periods, token, accType, cb) {
		async.parallel({
			main : function(cb1) {
				var series = [];
				accounts.main.forEach(function(acc) {
					var obj = {name:acc.name, data:[]};
					periods.forEach(function (p) {
						cashapi.calcAccSummByPerriod(token, p.start, p.end, acc.id, function (err, summ) {
							var val = Math.round(summ*100)/100;
							if (accType == "INCOME"){
								val *= -1;
							}
							obj.data.push(val);
						});
					});
					series.push(obj);
				});
				cb1(null, series);
			},
			other : function (cb1) {
				var data = [];
				periods.forEach(function(p) {
					var s = 0;
					accounts.others.forEach(function (acc) {
						cashapi.calcAccSummByPerriod(token, p.start, p.end, acc.id, function (err, summ) {
							s += summ;
						});
					});
					if (accType == "INCOME") { 
						s *= -1;
					}
					data.push(s);
				});
				cb1(null, {name:'Разное', data:data});
			}
		}, function (err, results) {
			results.main.push(results.other);
			cb(err, results.main);
		});
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
			//check login
			async.apply(cashapi.chPerm, req.session.apiToken),
			// parse query request
			function (err, cb1) {
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
				var perriods = getPerriods(startDate, endDate);
				var categories = getCatigories(perriods);
				if (settings && !newQuery) {
					console.log(settings);
					cb1(null, settings);
				} else {
					async.waterfall([
						async.apply(cashapi.getAllAccounts, req.session.apiToken),
						function (accounts, cb2) {
							calcAccStatsByPerriod(req.session.apiToken, accounts, params.accType, params.startDate, params.endDate, cb2);
						},
						function (accounts, cb2) {
							splitAccounts(accounts, maxAcc, cb2);
						},
						function (splitAccounts, cb2) {
							calcSeries(splitAccounts, perriods, req.session.apiToken, params.accType, cb2);
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
