var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("MM/dd/yyyy");
var dfW3C = new DateFormat(DateFormat.W3C);
var async = require("async");
var _ = require('underscore');
var repCmdty = {space:"ISO4217",id:"RUB"};

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;
	var reportSettingsVersion = 2;

	app.get(prefix + "/reports/barflow", function (req, res, next ) {
		report1(req, res, next, "barflow");
	});

	app.get(prefix + "/reports/pieflow", function (req, res, next ) {
		report1(req, res, next, "pieflow");
	});

	app.get(prefix + "/reports/statment", function (req, res, next ) {
		report1(req, res, next, "statment");
	});

	app.post(prefix + "/reports/barflow", function (req, res, next ) {
		saveParams(req, res, next, "barflow");
	});

	app.post(prefix + "/reports/pieflow", function (req, res, next ) {
		saveParams(req, res, next, "pieflow");
	});

	app.post(prefix + "/reports/statment", function (req, res, next ) {
		saveParams(req, res, next, "statment");
	});

	function report1(req, res, next, type) {
		if (!req.query || !req.query.name) {
			var ct = "Income statement";
			if (type == 'pieflow')
				ct = 'Pie flow chart';
			else if (type == 'barflow')
				ct = 'Bar flow chart';

			res.redirect(req.url + "?name=" +  ctx.i18n(req.session.apiToken, 'cash', ct));
			return;
		}

		var pid = "reports-" + type + "-" + req.query.name;
		var vtabs,data,reportSettings,currencies;
		async.waterfall([
			function (cb1) {
				async.series([
					function(cb2) {
						webapp.guessTab(req, {pid: pid, name:req.query.name, url:req.url}, cb2);
					},
					function(cb2) {
						webapp.getTabSettings(req.session.apiToken, pid, cb2);
					},
					function(cb2) {
						webapp.getUseRangedCurrencies(req.session.apiToken,cb2)
					}
				],
				function (err, results) {
					cb1(null, results[0], results[1], results[2]);
				});
			},
			function (vtabs_, reportSettings_, currencies_, cb1) {
				vtabs = vtabs_;
				reportSettings = reportSettings_;
				if (_.isEmpty(reportSettings) || !reportSettings.version || (reportSettings.version != reportSettingsVersion))
					reportSettings = getDefaultSettings(req.query.name);

				currencies = currencies_;
				if (type == "statment")
					calculateStatmentData(req.session.apiToken,type,reportSettings,cb1);
				else
					calculateGraphData(req.session.apiToken,type,reportSettings,cb1);
			},
			function(data_,cb1){
				data = data_;
				cashapi.getAssetsTypes(req.session.apiToken,cb1);
			},
			function (assetsTypes,cb1) {
				reportSettings.startDate = df.format(new Date(reportSettings.startDate));
				reportSettings.endDate = df.format(new Date(reportSettings.endDate));
				reportSettings.accIsVisible = type == "statment" ? 1 : 0;

				reportSettings.accLevelOptions = _(reportSettings.accLevelOptions).reduce(function(memo,item){
					item.isSelected = item.name == reportSettings.accLevel ? 1 : 0;
					memo.push(item);
					return memo;
				},[]);

				reportSettings.accTypeOptions = _(assetsTypes).reduce(function(memo,item){
					item.isSelected = item.value == reportSettings.accType ? 1 : 0;
					memo.push(item);
					return memo;
				},[]);

				reportSettings.accTypeName = _(assetsTypes).reduce(function(memo,item){
					if (item.value == reportSettings.accType)
						memo = item.name;
					return memo;
				});

				data.reportSettings = reportSettings;

				data.accountsTree = _(data.accountsTree).reduce(function(memo,item){
					if(_.isNull(reportSettings.accIds) || _.indexOf(reportSettings.accIds,item['id']) != -1 )
						item.isSelected = 1;
					memo.push(item);
					return memo;
				},[]);

				//fix without res.partial doesn't render reportsettings accounts tree
				res.partial(__dirname+"/../views/reportsettings",{},cb1);
			},
			function(somedata,cb1){
				res.render(__dirname+"/../views/report", _.extend({settings:{views:__dirname+"/../views"}, prefix:prefix, tabs:vtabs, usedCurrencies:currencies.used, notUsedCurrencies:currencies.unused},data));
			}],
			next
		);
	};

	function calculateStatmentData(token, type, params, cb){
		var accountsTree, accKeys;
		async.waterfall([
			function (cb1) {
				cashapi.getAllAccounts(token, cb1);
			},
			function (accounts, cb1) {
				accountsTree = cashapi.createAccountsTree(accounts);
				//check selected accounts
				if(_.isArray(params.accIds) && accounts.length != params.accIds.length){
					accounts = _(accounts).filter(function(item){
						return _.indexOf(params.accIds,item['id']) != -1;
					});
				}

				accKeys = _.reduce(accounts, function (memo, acc) {
					if (acc.type == 'INCOME' || acc.type == 'EXPENSE')
						memo[acc._id] = {name:acc.name, id:acc._id, parentId:acc.parentId, add:0, lost:0, type:acc.type};
					return memo;
				}, {});
				cashapi.getTransactionsInDateRange(token, [params.startDate, params.endDate, true, false], cb1);
			},
			function(trns, cb1){
				_.forEach(trns, function (tr) {
					cashapi.getCmdtyPrice(token,tr.currency,{space:"ISO4217", id:params.reportCurrency}, null, 'safe', function(err,rate){
						if(err && !(err.skilap && err.skilap.subject == "UnknownRate"))
							return cb1(err);
						var irate;
						if (!err && rate != 0)
							irate = rate;
						_.forEach(tr.splits, function(split) {
							var acs = accKeys[split.accountId];
							if (acs) {
								var val = split.quantity * irate;
								if (acs.type == "INCOME")
									acs.add += val;
								else
									acs.lost += val;
							}
						});
					})
				});

				//collapse accounts to accLevel
				if(params.accLevel != 'All'){
					async.series([
						function(cb2){
							async.forEach(_.keys(accKeys), function(key,cb3){
								cashapi.getAccountInfo(token,key,['level'],function(err,res){
									accKeys[key].level = res.level;
									cb3();
								});
							},cb2);
						},
						function(cb2){
							var accountsOverLevel = _(accKeys)
								.chain()
								.values()
								.filter(function(item){return item.level > params.accLevel;})
								.groupBy(function(item){return item.parentId;})
								.values()
								.reduce(function(memo,items){
									_.forEach(items, function(item){
										if(!_.has(memo,item.parentId))
											memo[item.parentId] = {add:0, lost:0, ids:[]};
										memo[item.parentId].add += item.add;
										memo[item.parentId].lost += item.lost;
										memo[item.parentId]._ids.push(item._id);
									});
									return memo;
								}, {})
								.value();

							accKeys = _(accKeys)
								.chain()
								.values()
								.filter(function(item){return item.level <= params.accLevel;})
								.reduce(function(memo,item){
									memo[item._id] = item;
									return memo;
								},{})
								.value();

								_.forEach(_(accountsOverLevel).keys(),function(key){
									if(accKeys[key]){
										accKeys[key].add += accountsOverLevel[key].add;
										accKeys[key].lost += accountsOverLevel[key].lost;
										delete accountsOverLevel[key];
									}
								});

							cb2();
						}
					], function(err){
						if(err) return cb1(err);
						cb1();
					});
				}
				else
					cb1();
			},
			function(cb1){
				// transform into report form
				var report = _.chain(accKeys)
					.map(function(accKey) {
						return {_id:accKey._id, pid:accKey.parentId, name:accKey.name, add:accKey.add, lost:accKey.lost};
					}).filter(function(accKey) {
						return (accKey.add || accKey.lost);
					}).sortBy(function(accKey){
						return !!accKey.pid;
					}).value();

				cb1(null,report);
			}
		], function (err, series) {
			if(err) return cb(err);

			var data = {series:JSON.stringify(series), accountsTree:accountsTree};
			data[type] = 1;
			cb(null, data);
		});
	}

	function calculateGraphData(token, type, params, cb){
		var periods=categories=null;
		var accountsTree,accKeys;
		switch(type){
			case 'barflow':
				periods = getPeriods(new Date(params.startDate), new Date(params.endDate));
				categories = _.map(periods, function (p) { return (p.start.getMonth()+1)+"."+p.start.getFullYear();});
			break;
			case 'pieflow':
			break;
		}
		async.waterfall([
			function (cb1) {
				cashapi.getAllAccounts(token, cb1);
			},
			function (accounts, cb1) {
				accountsTree = cashapi.createAccountsTree(accounts);
				//check selected accounts
				if(_.isArray(params.accIds) && accounts.length != params.accIds.length){
					accounts = _(accounts).filter(function(item){
						return _.indexOf(params.accIds, item['_id']) != -1;
					});
				}
				accKeys = _(accounts).reduce(function (memo, acc) {
					if (acc.type == params.accType){
						memo[acc._id] = {name:acc.name, _id:acc._id, parentId:acc.parentId,summ:0};
						if(periods)
							memo[acc._id].periods = _(periods).map(function (p) { return _.clone(p); });
					}
					return memo;
				}, {});
				cashapi.getTransactionsInDateRange(token,[params.startDate,params.endDate,true,false],cb1);
			},
			function(trns,cb1){
				_.forEach(trns, function (tr) {
					cashapi.getCmdtyPrice(token,tr.currency,{space:"ISO4217",id:params.reportCurrency},null,'safe',function(err,rate){
						if(err && !(err.skilap && err.skilap.subject == "UnknownRate"))
							return cb1(err);
						if (!err && rate!=0)
							var irate = rate;
						_.forEach(tr.splits, function(split) {
							var acs = accKeys[split.accountId];
							if (acs) {
								var val = split.quantity*irate;
								if (params.accType == "INCOME")
									val *= -1;
								acs.summ += val;
								if (periods) {
									var d = (new Date(tr.datePosted)).valueOf();
									_.forEach(acs.periods, function (p) {
										if (d > p.start.valueOf() && d <= p.end.valueOf())
											p.summ += val;
									});
								}
							}
						});
					})
				});

				//collapse accounts to accLevel
				if(params.accLevel != 'All'){
					async.series([
						function(cb2){
							async.forEach(_.keys(accKeys), function(key,cb3){
								cashapi.getAccountInfo(token,key,['level'],function(err,res){
									accKeys[key].level = res.level;
									cb3();
								});
							},cb2);
						},
						function(cb2){
							var accountsOverLevel = _(accKeys)
								.chain()
								.values()
								.filter(function(item){return item.level > params.accLevel;})
								.groupBy(function(item){return item.parentId;})
								.values()
								.reduce(function(memo,items){
									_.forEach(items, function(item){
										if(!_.has(memo,item.parentId))
											memo[item.parentId] = {summ:0,ids:[]};
										memo[item.parentId].summ += item.summ;
										memo[item.parentId]._ids.push(item._id);
									});
									return memo;
								}, {})
								.value();

							accKeys = _(accKeys)
								.chain()
								.values()
								.filter(function(item){	return item.level <= params.accLevel})
								.reduce(function(memo,item){
									memo[item._id] = item;
									return memo;
								},{})
								.value();

							_.forEach(_(accountsOverLevel).keys(),function(key){
								if(accKeys[key]){
									accKeys[key].summ += accountsOverLevel[key].summ;
									delete accountsOverLevel[key];
								}
							});

							cb2();
						}
					],function(err){
						if(err) return cb1(err);
						cb1();
					});
				}
				else
					cb1();
			},
			function(cb1){
				var total = 0;
				// find important accounts (with biggest summ over entire period)
				var iacs = _(accKeys).chain().map(function (acs) { return {_id:acs._id, summ:acs.summ}})
					.sortBy(function (acs) {return acs.summ}).last(params.maxAcc)
					.reduce(function (memo, acs) { memo[acs._id]=1; return memo; }, {}).value();
				// colapse non important
				var final = _(accKeys).reduce( function (memo, accKey) {
					total += accKey.summ;
					if (_(iacs).has(accKey._id))
						memo[accKey._id] = accKey;
					else {
						var other = memo['other'];
						if (other==null) {
							accKey.name = "Other";
							accKey._id = 'other';
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
				cb1(null,report);

			}
		], function (err, series) {
			if(err) return cb(err);
			if(type == 'pieflow')
				series = {type:'pie', data: series};

			var data = {categories:JSON.stringify(categories), series:JSON.stringify(series), accountsTree:accountsTree};
			data[type] = 1;
			cb(null, data);
		});
	}

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

	function getDefaultSettings(reportName) {
		var defaultSettings = {
				startDate:dfW3C.format(new Date(new Date().getFullYear(), 0, 1)),
				endDate:dfW3C.format(new Date(new Date().getFullYear(), 11, 31)),
				accIsVisible:1,
				accType:"EXPENSE",
				maxAcc:10,
				reportName:reportName,
				accIds:null,
				accLevel:2,
				accLevelOptions:[{name:'All'},{name:1},{name:2},{name:3},{name:4},{name:5},{name:6}],
				version: reportSettingsVersion,
				reportCurrency:repCmdty.id
			};
		return defaultSettings;
	}

	function saveParams (req, res, next, type) {
		var url = prefix+"/reports/"+type;
		var oldpid = "reports-" +type + "-" + req.query.name;
		var pid = "reports-" +type + "-" + req.body.reportName;
		var settings = getDefaultSettings();
		settings.accType = req.body.accType;
		settings.maxAcc = req.body.maxAcc;
		settings.startDate = dfW3C.format(new Date(req.body.startDate));
		settings.endDate = dfW3C.format(new Date(req.body.endDate));
		settings.reportName = req.body.reportName;
		settings.accIds = _.isArray(req.body.accIds) ? _.map(req.body.accIds,function(item){ return parseInt(item);	}) : null;
		settings.accLevel = req.body.accLevel;
		settings.reportCurrency = req.body.reportCurrency;

		var steeps = [
			function(cb) {
				webapp.removeTabs(req.session.apiToken, oldpid, cb);
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
