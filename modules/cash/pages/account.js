var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("MM/dd/yyyy");
var sprintf = require('sprintf').sprintf;
var _ = require('underscore');
var async = require('async');
var safe = require('safe');
var sanitize = require('validator').sanitize;
var SkilapError = require("skilap-utils").SkilapError;

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;

	app.get(webapp.prefix+'/account', webapp.layout(), function(req, res, next) {
		var count = 0, verbs=0;
		async.waterfall([
			function (cb1) {
				cashapi.getAccountInfo(req.session.apiToken, req.query.id,['count','path','verbs'], cb1);
			},
			function (data, cb1) {
				count = data.count;
				verbs = data.verbs;
				webapp.guessTab(req, {pid:'acc'+req.query.id, name:data.path,url:req.url}, cb1);
			},
			safe.trap(function (vtabs,cb1) {
				var pageSize = 25;
				var firstVisible = Math.max(0, count-pageSize);
				var scrollGap = pageSize*5;
				res.render(__dirname+"/../res/views/account1", {
					tabs:vtabs,
					prefix:prefix,
					accountId:req.query.id,
					accountSize:++count,
					firstVisible:firstVisible,
					pageSize:pageSize,
					scrollGap:scrollGap,
					host:req.headers.host,
					verbs:verbs
				});
			})
		], function (err) {
			if (err) return next(err);
		});
	});

	app.post(webapp.prefix+'/account/:id/updaterow', function(req, res, next) {
		var tr = createTransactionFromData(req.body);
		cashapi.saveTransaction(req.session.apiToken, tr, req.params.id, function(err,trn){
			if(err){
				return res.send({error:err.message});
			}
			res.send({tr:trn});
		});
	});


	app.get(webapp.prefix+'/account/:id/getaccounts', function(req, res, next) {
		async.waterfall([
			function (cb1) {
				cashapi.getAllAccounts(req.session.apiToken, cb1);
			},
			function (accounts,cb1) {
				var tmp = {};
				async.forEach(accounts, function (acc, cb2) {
					cashapi.getAccountInfo(req.session.apiToken, acc._id, ["path"], safe.trap_sure(cb2,function (info) {
						if ((info.path.search(req.query.term)!=-1) && !(acc.hidden) && !(acc.placeholder))
							tmp[info.path] = {currency:acc.cmdty.id, id:acc._id};
						cb2();
					}));
				}, function (err) {
					cb1(err, tmp);
				});
			},
			function (hints, cb1) {
				res.send(hints);
				cb1();
			}
		], function (err) {
			if (err) return next(err);
		});
	});

	app.get(webapp.prefix+'/account/:id/getdesc', function(req, res) {
		async.waterfall([
			function (cb1) {
				cashapi.getAccountRegister(req.session.apiToken, req.params.id,0,null, cb1);
			},
			function (register,cb1) {
				var tmp = [];
				async.forEach(register, function (trs,cb2) {
					cashapi.getTransaction(req.session.apiToken,trs._id, safe.trap_sure(cb2,function(tr) {
						if (tr.description && tr.description.search(req.query.term)!=-1)
							tmp.push(tr.description);
						cb2();
					}));
				}, function (err) {
					cb1(err,tmp);
				});
			},
			function (hints,cb1) {
				res.send(_.uniq(hints));
				cb1();
			},
		], function (err) {
			if (err) return next(err);
		});
	});

	app.get(webapp.prefix+'/account/:id/getgrid', function(req, res, next) {
		var data = {sEcho:req.query.sEcho,iTotalRecords:0,iTotalDisplayRecords:0,aaData:[]};
		var idx = Math.max(req.query.iDisplayStart,0);
		var count = 0, currentAccountPath = "";

		async.waterfall([
			function (cb1) {
				cashapi.getAccountInfo(req.session.apiToken, req.params.id,["count","path"], cb1);
			},
			function (data,cb1) {
				count = data.count;
				currentAccountPath = data.path;
				var limit = Math.min(count-idx, req.query.iDisplayLength);
				cashapi.getAccountRegister(req.session.apiToken, req.params.id, idx, limit, cb1);
			},
			function (register,cb1) {
				var aids = {};
				_.forEach(register, function (trs) {
					trs.recv.forEach(function(recv){
						aids[recv.accountId] = recv.accountId;
					});
				});
				aids[req.params.id]	= currentAccountPath;
				async.parallel([
					function (cb2) {
						var transactions = [];
						async.forEachSeries(register, function (trs, cb3) {
							cashapi.getTransaction(req.session.apiToken,trs._id,safe.trap_sure_result(cb3,function (tr) {
								transactions.push(tr);
							}));
						}, function (err) {
							cb2(err, _.clone(transactions));
						});
					},
					function (cb2) {
						var accInfo = {};
						async.forEach(_.keys(aids), function (aid, cb3) {
							cashapi.getAccount(req.session.apiToken, aid, safe.trap_sure(cb3, function(acc) {
								cashapi.getAccountInfo(req.session.apiToken,aid,['path'], safe.trap_sure_result(cb3, function(info) {
									if (!acc) return;
									accInfo[acc._id] = {_id:acc._id, path:info.path, currency:acc.cmdty.id};
								}));
							}));
						}, function (err) {
							cb2(err, _.clone(accInfo));
						});
					}
				], function (err, results) {
					cb1(err, register, results[0], results[1]);
				});
			},
			safe.trap(function (register, transactions, accInfo, cb1) {
				var i;
				for (i=0; i<_.size(register); i++) {
					var tr = transactions[i];
					var trs = register[i];
					var recv = trs.recv;
					var send = trs.send;
					var dp = new Date(tr.datePosted);
					var splitsInfo=[];
					var multicurr = 0;
					_.forEach(tr.splits,function(split){
						if (!accInfo[split.accountId] || !accInfo[req.params.id]) return;
						if(accInfo[split.accountId].currency != accInfo[req.params.id].currency){
							multicurr = 1;
						}
						split.recordid = tr._id;
						split.path = accInfo[split.accountId].path;
						split.currency = accInfo[split.accountId].currency;
						split.deposit = split.quantity>0 ? sprintf("%.2f",split.quantity):'';
						split.withdrawal = split.quantity<=0?sprintf("%.2f",split.quantity*-1):'';
						splitsInfo.push(split);
					});
					var path = "",multisplit = null,recv_accid="",send_accid = send.accountId;
					//if (!recv[0] || !accInfo[recv[0].accountId]) continue;
					if(recv.length==1){
						path = accInfo[recv[0].accountId].path;
						recv_accid=recv[0].accountId;
					}
					else if(recv.length > 1){
						path = '['+accInfo[recv[0].accountId].path;
						for(j=1; j<recv.length;j++){
							path += ','+accInfo[recv[j].accountId].path;
						}
						path += ']';
						multisplit =1;
					}
					data.aaData.push({
						id:tr._id,
						date:df.format(dp),
						num:tr.num ? tr.num : '',
						description:tr.description,
						path:path,
						multisplit:multisplit,
						recv_accid:recv_accid,
						send_accid:send_accid,
						path_curr: (recv.length==1 && accInfo[recv[0].accountId].currency != accInfo[req.params.id].currency ? accInfo[recv[0].accountId].currency :null),
						acc_curr: accInfo[req.params.id].currency,
						rstate: (send.rstate ? send.rstate:"n"),
						deposit:(send.quantity>0?sprintf("%.2f",send.quantity):''),
						deposit_quantity: (recv.length == 1 && recv[0].quantity<=0?sprintf("%.2f",recv[0].quantity*-1):''),
						withdrawal:(send.quantity<=0?sprintf("%.2f",send.quantity*-1):''),
						withdrawal_quantity: (recv.length == 1 && recv[0].quantity>0?sprintf("%.2f",recv[0].quantity):''),
						total:sprintf("%.2f",trs.ballance),
						splits:splitsInfo,
						multicurr:multicurr,
						multisplit:recv.length > 1 ? 1 : 0
					});
				}
				if(count - idx <= req.query.iDisplayLength){
					if(idx != 0)
						data.aaData.shift();
					var blankSplit = {
						recordid : "blank",
						path : "",
						currency : "",
						deposit : "",
						withdrawal : ""
					};
					data.aaData.push({
						id:"blank",
						date:df.format(new Date()),
						num:'',
						description:"",
						path:"",
						multisplit:0,
						recv_accid:"fake",
						send_accid:accInfo[req.params.id]._id,
						path_curr: "",
						acc_curr: accInfo[req.params.id].currency,
						rstate: "n",
						deposit:"",
						deposit_quantity: "",
						withdrawal:"",
						withdrawal_quantity: "",
						total:"",
						splits:[
							{
								_id: "new",
								recordid : "blank",
								path : "",
								currency : "",
								deposit : "",
								withdrawal : "",
								accountId : "fake"
							},
							{
								_id:"new",
								recordid : "blank",
								path : currentAccountPath,
								currency : accInfo[req.params.id].currency,
								deposit : "",
								withdrawal : "",
								accountId : accInfo[req.params.id]._id
							},
						],
						multicurr:0,
						multisplit:0
					});
				}
				data.iTotalRecords = count+1;
				data.iTotalDisplayRecords = count+1;
				data.currentDate = df.format(new Date());
				data.currentAccount = {id:req.params.id,path:currentAccountPath,currency:accInfo[req.params.id].currency};
				res.send(data);
			})
		], function (err) {
			if (err) return next(err);
		});
	});


	var createTransactionFromData = function(data){
		var tr={};
		if(data.id){
			tr._id = data.id;
		}
		var dateFormat = new DateFormat(DateFormat.W3C);
		var dateEntered = dateFormat.format(new Date());
		tr['dateEntered'] = dateEntered;
		if(data.date){
			var datePosted = dateFormat.format(new Date(data.date));
			tr['datePosted'] = datePosted;
		}
		if(data.num){
			tr['num'] = data.num;
		}
		if (data.description) {
			tr['description'] = data.description;
		}

		tr['splits'] = [];
		if(data.splits) {
			_.forEach(data.splits,function(spl){
				var depositVal  = (spl.deposit && spl.deposit != "") ? eval(sanitizeNumericField(spl.deposit)) : 0;
				var depositQuantity  =  spl.deposit_quantity && spl.deposit_quantity != "" ? eval(sanitizeNumericField(spl.deposit_quantity)) : 0;
				var withdrawalVal  = spl.withdrawal != "" ? eval(sanitizeNumericField(spl.withdrawal)) : 0;
				var withdrawalQuantity  = spl.withdrawal_quantity && spl.withdrawal_quantity != "" ? eval(sanitizeNumericField(spl.withdrawal_quantity)) : 0;
				splitVal = depositVal - withdrawalVal;
				splitQuantity = depositQuantity - withdrawalQuantity;
				var modifiedSplit = {
					value: splitVal,
					accountId: spl.accountId,
					description: spl.description,
					num:spl.num,
					rstate:spl.rstate
				};
				if (spl.deposit_quantity != "" || spl.withdrawal_quantity != "")
					modifiedSplit.quantity = splitQuantity;
				if(spl.id && spl.id!=-1){
					modifiedSplit._id = spl.id;
				}
				tr['splits'].push(modifiedSplit);
			});

		}
		return tr;
	};

	var sanitizeNumericField = function(field){
		return field.replace(/[^0-9\.+*/\-]+/g, '');
	};

}
