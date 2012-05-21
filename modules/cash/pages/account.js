var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("MM/dd/yyyy");
var sprintf = require('sprintf').sprintf;
var _ = require('underscore');
var async = require('async');
var safe = require('safe');
var sanitize = require('validator').sanitize
var SkilapError = require("skilap-utils").SkilapError;

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;

	app.get(webapp.prefix+'/account', function(req, res, next) {		
		var idx=0,c=0;
		var pageSize = 20;
		var count;
		async.waterfall([
			function (cb1) {
				cashapi.getAccountInfo(req.session.apiToken,req.query.id,['count','path'], cb1);
			},
			function (data, cb1) {
				count = data.count;
				webapp.guessTab(req, {pid:'acc'+req.query.id,name:data.path,url:req.url}, cb1);
			},
			safe.trap(function (vtabs,cb1) {
				var pageSize = 25;
				var firstVisible = Math.max(0, count-pageSize);
				var scrollGap = pageSize*5;
				var firstDelivered = Math.max(0, count-pageSize-scrollGap);
				res.render(__dirname+"/../views/account", {
					settings:{views:__dirname+"/../views"},
					tabs:vtabs,
					prefix:prefix,
					accountId:req.query.id,
					accountSize:count,
					firstVisible:firstVisible,
					pageSize:pageSize,
					scrollGap:scrollGap,
					host:req.headers.host
				});
			})
		], function (err) {
			if (err) return next(err);
		});
	});	
	
	app.post(webapp.prefix+'/account/:id/updaterow', function(req, res, next) {		
		var result = validateTrData(req.body);
		if(result.error){
			res.send(result)
			return false;
		}					
		async.waterfall([
			function (cb1) {
				async.parallel({
					tr:function (cb2) {
						cashapi.getTransaction(req.session.apiToken, req.body.id, cb2);
					},
					splits:function (cb2) {						
						if (req.body.splits){							
							var splits = [];																
							async.forEach(req.body.splits, function(split,cb3){								
								if(split.path && split.path != ''){									
									cashapi.getAccountByPath(req.session.apiToken,split.path, function(err,acc){										
										split.accountId = acc.id;	
										splits.push(split);																		
										cb3();										
									});	
								}
								else{
									cb3();
								}													
							},function(){cb2(null,splits);});						
						}
						else{ 							
							cb2(null,null);
						}
					}
				}, function (err, results) {										
					cb1(err, results.tr,results.splits);
				});
			},			
			function (tr, modifiedSplits,cb1) {
				createTransactionFromData(req,tr,modifiedSplits,function(err,trans){					
					if(err){
						if(err.skilap){
							res.send(err.message);
							return cb1(null);
						}
						else{
							return cb1(err);
						}						
					}
					else{						
						cashapi.saveTransaction(req.session.apiToken, trans, req.params.id, cb1);
						res.send(req.body.id);
					}
				});									
			}
		], function (err) {
			if (err) return next(err);
		});
	});	
	
	
	app.post(webapp.prefix+'/account/:id/addrow', function(req, res, next) {		
		var result = validateTrData(req.body,true);
		if(result.error){
			res.send(result);
			return false;
		}		
		async.waterfall([		
			function (cb1) {
				var newSplits = [];
				if(req.body.splits){																			
					async.forEach(req.body.splits, function(split,cb2){								
						if(split.path && sanitize(split.path).trim() != ''){									
							cashapi.getAccountByPath(req.session.apiToken,split.path, function(err,acc){
								split.accountId = acc.id;
								newSplits.push(split);																
								cb2();
							});	
						}
						else{
							cb2();
						}													
					},function(){cb1(null,newSplits);});						
				}
				else{
					cb1(null,newSplits);
				}
			},
			function (newSplits,cb1) {
				createTransactionFromData(req,null,newSplits,function(err,trans){
					if(err){
						res.send(err);
						cb1(null);
					}
					else{
						cashapi.saveTransaction(req.session.apiToken, trans, req.params.id, function(err){							
							if(err){
								cb1(err);								
							}
							else{
								res.send({result:"1"});
								cb1(null);
							}
						});
					}
				});					
			}
		], function (err) {
			if (err) return next(err);
		});		
	});	
	
	app.post(webapp.prefix+'/account/:id/delrow', function(req, res, next) {		
		async.waterfall([			
			function (cb1) {							
				cashapi.clearTransactions(req.session.apiToken, [req.body.recordId], function(err){
					result = {"recordId":req.body.recordId};
					if(err){						
						result.error = "1";
					}
					res.send(result);
				});					
			}
		], function (err) {
			if (err) return next(err);
		});		
	});
	
	app.post(webapp.prefix+'/account/:id/delsplit', function(req, res, next) {	
		res.send(req.body.splitId);
		
	});


	app.get(webapp.prefix+'/account/:id/getaccounts', function(req, res, next) {
		var tmp = [];		
		async.waterfall([
			function (cb) { cashapi.getAllAccounts(req.session.apiToken, cb) },
			function (accounts,cb1) {
				var tmp = {};
				async.forEach(accounts, function (acc, cb2) {					
					cashapi.getAccountInfo(req.session.apiToken, acc.id, ["path"], safe.trap_sure_result(cb2,function (info) {
						if ((info.path.search(req.query.term)!=-1) && !(acc.hidden) && !(acc.placeholder))
							tmp[info.path] = {currency:acc.cmdty.id};
						cb2();
					}));
				}, function (err) {
					cb1(err, tmp);
				})
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
		var tmp = [];		
		async.waterfall([
			function (cb1) {
				cashapi.getAccountRegister(req.session.apiToken, req.params.id,0,null, cb1);
			},
			function (register,cb1) {
				var tmp = [];
				async.forEach(register, function (trs,cb2) {
					cashapi.getTransaction(req.session.apiToken,trs.id, safe.trap_sure_result(cb2,function(tr) {
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
		var idx=Math.max(req.query.iDisplayStart,0);
		var count,register,currentAccountPath,accountCurrency;
		async.waterfall([
			function (cb1) {
				cashapi.getAccountInfo(req.session.apiToken, req.params.id,["count","path"], cb1);
			},
			function (data,cb1) {
				count = data.count;
				currentAccountPath = data.path;				
				var limit = Math.min(count-idx,req.query.iDisplayLength);
				cashapi.getAccountRegister(req.session.apiToken, req.params.id,idx,limit, cb1);
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
						async.forEach(register, function (trs, cb3) {
							cashapi.getTransaction(req.session.apiToken,trs.id,safe.trap_sure_result(cb3,function (tr) {
								transactions.push(tr);								
							}));
						}, function (err) {							
							cb2(err, transactions);
						});
					},					
					function (cb2) {
						var accInfo = {};											
						async.forEach(_.keys(aids), function (aid, cb3) {
							cashapi.getAccount(req.session.apiToken, aid,safe.trap_sure_result(cb3,function(acc) {
								cashapi.getAccountInfo(req.session.apiToken,aid,['path'], safe.trap_sure_result(cb3,function(info) {
									accInfo[acc.id] = {id:acc.id,path:info.path,currency:acc.cmdty.id};	
								}));														
							}));
						}, function (err) {
							cb2(err, accInfo);
						});
					}
				], function (err, results) {
					cb1(err, register, results[0], results[1])
				})
			},
			safe.trap(function (register, transactions, accInfo, cb1) {				
				var i;
				for (i=0; i<_.size(register); i++) {
					var tr = transactions[i]; 					
					var trs = register[i];
					var recv = trs.recv;
					var send = trs.send;
					var dp = new Date(tr.dateEntered);
					var splitsInfo=[];
					var multicurr = 0;
					_.forEach(tr.splits,function(split){
						if(accInfo[split.accountId].currency != accInfo[req.params.id].currency){
							multicurr = 1;
						}						
						split.path = accInfo[split.accountId].path;
						split.currency = accInfo[split.accountId].currency;
						splitsInfo.push(split);
					});	
					data.aaData.push({
						id:tr.id,
						date:df.format(dp),
						num:tr.num ? tr.num : '',
						description:tr.description,
						path:(recv.length==1?accInfo[recv[0].accountId].path:"-- Multiple --"),
						path_curr: (recv.length==1 && accInfo[recv[0].accountId].currency != accInfo[req.params.id].currency ? accInfo[recv[0].accountId].currency :null),
						transfer: tr.transfer ? tr.transfer : 'n',
						deposit:(send.value>0?sprintf("%.2f",send.value):''),
						deposit_quantity: (recv.length == 1 && recv[0].quantity<=0?sprintf("%.2f",recv[0].quantity*-1):''),
						withdrawal:(send.value<=0?sprintf("%.2f",send.value*-1):''),
						withdrawal_quantity: (recv.length == 1 && recv[0].quantity>0?sprintf("%.2f",recv[0].quantity):''),
						total:sprintf("%.2f",trs.ballance),
						splits:splitsInfo,
						multicurr:multicurr
					});
				}				
				data.iTotalRecords = count;
				data.iTotalDisplayRecords = count;
				data.currentDate = df.format(new Date());
				data.currentAccount = {id:req.params.id,path:currentAccountPath,currency:accInfo[req.params.id].currency};
				res.send(data);
			})
		], function (err) {
			if (err) return next(err);
		});
	});
	
	var validateTrData = function(data,fullValidate){
		var result = {};		
		/* verify path, deposit and withdrawal values of splits */
		result.splits = {};
		var regex = /^\d+(\.\d+)?$/;
		if(data.splits){
			data.splits.forEach(function(split){
				var invalidFields ={};				
				if(sanitize(split.deposit).trim() != "" && !regex.test(split.deposit)){					
					invalidFields.deposit = 1;
				}
				if(sanitize(split.withdrawal).trim() != "" && !regex.test(split.withdrawal)){
					invalidFields.withdrawal = 1;
				}				
				if(_.size(invalidFields)){
					result.splits[split.id] = invalidFields;
				}
			});
		}
		if(_.size(result.splits)){
			result.error = 'validateError';
		}			
		return result;
	};
	
	var createTransactionFromData = function(req,oldTr,splits,cb){
		var tr={};
		if(oldTr){
			tr.id = oldTr.id;
		}
		var dateFormat = new DateFormat(DateFormat.W3C);
		var datePosted = dateFormat.format(new Date());	
		tr['datePosted'] = datePosted;	
		if(req.body.date){
			var dateEntered = dateFormat.format(new Date(req.body.date));										
			tr['dateEntered'] = dateEntered;	
		}
		if(req.body.num){
			tr['num'] = req.body.num;
		}				
		if (req.body.description) {
			tr['description'] = req.body.description;
		}	
		if(req.body.transfer){
			tr['transfer'] = req.body.transfer;
		}
		tr['splits'] = [];		
		if(splits) {		
			_.forEach(splits,function(spl){
				var depositVal  = (spl.deposit && spl.deposit != "") ? parseFloat(spl.deposit) : 0;
				var depositQuantity  = spl.deposit_quantity != "" ? parseFloat(spl.deposit_quantity) : 0;
				var withdrawalVal  = spl.withdrawal != "" ? parseFloat(spl.withdrawal) : 0;
				var withdrawalQuantity  = spl.withdrawal_quantity != "" ? parseFloat(spl.withdrawal_quantity) : 0;
				splitVal = depositVal - withdrawalVal;
				splitQuantity = depositQuantity - withdrawalQuantity;
				var modifiedSplit = {													
					value: splitVal,
					accountId: spl.accountId,
					description: spl.description,
					num:spl.num					
				};
				if (spl.deposit_quantity != "" || spl.withdrawal_quantity != "")
					modifiedSplit.quantity = splitQuantity;
				if(spl.id && spl.id!=-1){
					modifiedSplit.id = spl.id;
				}
				tr['splits'].push(modifiedSplit);
			});				
			cb(null,tr);
		}
		else if(oldTr){
			tr['splits'] = oldTr.splits;
			cb(null,tr);
		}
		else{			
			cb(null,tr);
		}
	};
}
