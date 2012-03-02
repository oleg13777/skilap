var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("MM/dd/yyyy");
var sprintf = require('sprintf').sprintf;
var _ = require('underscore');
var async = require('async');
var safe = require('safe');

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
					scrollGap:scrollGap
				});
			})
		], function (err) {
			if (err) return next(err);
		});
	});

	app.post(webapp.prefix+'/account/:id/updatecell', function(req, res, next) {
		var newTr = null;
		async.waterfall([
			function (cb1) {
				async.parallel([
					function (cb2) {
						cashapi.getTransaction(req.session.apiToken, req.body.id, cb2);
					},
					function (cb2) {
						if (req.body.columnId==3){						
							cashapi.getAccountByPath(req.body.value, cb2);
						}
						else{ 							
							cb2(null,null);
						}
					}
				], function (err, results) {					
					cb1(err, results[0],results[1]);
				});
			},			
			function (tr, newAccId,cb1) {				
				if (req.body.columnId == 4 || req.body.columnId == 5) {
					var newVal = eval(req.body.value);
					if (req.body.columnId == 5)
						newVal *= -1;
					newTr = {id:tr.id,splits:[]};
					tr.splits.forEach(function(split) {
					if (split.accountId == req.params.id)
						newTr.splits.push({id:split.id,value:newVal})
					else
						newTr.splits.push({id:split.id,value:newVal*-1})
					});
				} else if (req.body.columnId == 3 ) {
					if (newAccId!=null) {
						newTr = {id:tr.id,splits:[]};
						tr.splits.forEach(function(split) {
							if (split.accountId != req.params.id)
								newTr.splits.push({id:split.id,accountId:newAccId})
						});
					}
				} else if (req.body.columnId == 2 ) {
					newTr = {id:tr.id,description:req.body.value};
				} else if (req.body.columnId == 1 ) {										
					var dateFormat = new DateFormat(DateFormat.W3C);
					var newDate = dateFormat.format(new Date(req.body.value));					
					newTr = {id:tr.id,dateEntered:newDate,datePosted:newDate};					
				}
				cashapi.saveTransaction(req.session.apiToken, newTr, cb1);
				res.send(req.body.value);
			}
		], function (err) {
			if (err) return next(err);
		});
	});
	
	app.post(webapp.prefix+'/account/:id/updaterow', function(req, res, next) {
		var validateData = function(data){
			var result = {};
			result.fields = [];
			if(data.description && data.description == ""){
				result.fields.push({name:'description',message:'is empty'});
			}
			/* verify path, deposit and withdrawal values of splits */
			result.splits = {};
			var regex = /^\d+$/;
			data.splits.forEach(function(split){
				var invalidFields ={};
				if(split.deposit != "" && !regex.test(split.deposit)){
					invalidFields.deposit = 1;
				}
				if(split.withdrawal != "" && !regex.test(split.withdrawal)){
					invalidFields.withdrawal = 1;
				}
				if(split.path == ""){
					invalidFields.path = 1;
				}
				if(_.size(invalidFields)){
					result.splits[split.id] = invalidFields;
				}
			});
			if(_.size(result.splits)){
				result.error = 'validateError';
			}			
			return result;
		};		
		var result = validateData(req.body);
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
							var splitsById = {};																
							async.forEach(req.body.splits, function(split,cb3){								
								if(split.path && split.path != ''){									
									cashapi.getAccountByPath(split.path, function(err,accId){
										splitsById[split.id] = split;
										splitsById[split.id].accountId = accId;										
										cb3();
									});	
								}
								else{
									cb3();
								}													
							},function(){cb2(null,splitsById);});						
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
				var modifiedTr = {id:tr.id};
				var dateFormat = new DateFormat(DateFormat.W3C);
				var datePosted = dateFormat.format(new Date());	
				modifiedTr['datePosted'] = datePosted;		
				if (req.body.date) {				
					var dateEntered = dateFormat.format(new Date(req.body.date));										
					modifiedTr['dateEntered'] = dateEntered;
				}				
				if (req.body.description) {
					modifiedTr['description'] = req.body.description;
				}	
				if(modifiedSplits){
					modifiedTr['splits'] = [];
					var imbalance = 0;					
					tr.splits.forEach(function(split) {
						var depositVal  = modifiedSplits[split.id].deposit != "" ? parseInt(modifiedSplits[split.id].deposit) : 0;
						var withdrawalVal  = modifiedSplits[split.id].withdrawal != "" ? parseInt(modifiedSplits[split.id].withdrawal) : 0;
						var splitVal = depositVal - withdrawalVal;
						imbalance += splitVal;
						var modifiedSplit = {
							id:split.id,							
							value: depositVal - withdrawalVal,
							quantity:depositVal - withdrawalVal,
							accountId: modifiedSplits[split.id].accountId							
						};
						modifiedTr['splits'].push(modifiedSplit);
						delete modifiedSplits[split.id];
					});
					for(key in modifiedSplits){
						split = modifiedSplits[key];
						var depositVal  = split.deposit != "" ? parseInt(split.deposit) : 0;
						var withdrawalVal  = split.withdrawal != "" ? parseInt(split.withdrawal) : 0;
						var splitVal = depositVal - withdrawalVal;
						if(splitVal != 0){
							imbalance += splitVal;
							modifiedTr['splits'].push({value:splitVal,quantity:splitVal,accountId:split.accountId});
						}
					}
					if(imbalance != 0){
						/* for classic transaction with two splits made automatic correct */						
						if(modifiedTr['splits'].length == 2){
							if(modifiedTr['splits'][1].accountId == req.params.id){
								modifiedTr['splits'][0].value = -1*modifiedTr['splits'][1].value;
								modifiedTr['splits'][0].quantity = -1*modifiedTr['splits'][1].quantity;
							}
							else{
								modifiedTr['splits'][1].value = -1*modifiedTr['splits'][0].value;
								modifiedTr['splits'][1].quantity = -1*modifiedTr['splits'][0].quantity;
							}
						}
						else{
							res.send({error:'imbalanceError',value:imbalance});
							return cb1(null);	
						}										
					}					
				}						
				cashapi.updateTransaction(req.session.apiToken, modifiedTr, cb1);
				res.send(req.body.id);				
			}
		], function (err) {
			if (err) return next(err);
		});
	});	
	
	
	app.post(webapp.prefix+'/account/:id/addrow', function(req, res, next) {		
		var validateData = function(data){
			var result = {};
			result.fields = [];
			if(!data.date || data.date == ""){
				result.fields.push({name:'date',message:'is empty'});
			}
			if(!data.description || data.description == ""){
				result.fields.push({name:'description',message:'is empty'});
			}
			if(!data.splits || data.splits.length == 0)
				result.fields.push({name:'splits',message:'is empty'});
			/* verify path, deposit and withdrawal values of splits */
			result.splits = {};
			var regex = /^\d+$/;
			data.splits.forEach(function(split){
				var invalidFields ={};
				if(split.deposit != "" && !regex.test(split.deposit)){
					invalidFields.deposit = 1;
				}
				if(split.withdrawal != "" && !regex.test(split.withdrawal)){
					invalidFields.withdrawal = 1;
				}
				if(split.path == ""){
					invalidFields.path = 1;
				}
				if(split.deposit == "" && split.withdrawal == ""){
					invalidFields.deposit = 1;
					invalidFields.withdrawal = 1;
				}
				if(_.size(invalidFields)){
					result.splits[split.id] = invalidFields;
				}
			});
			if(_.size(result.splits)){
				result.error = 'validateError';
			}			
			return result;
		};
		var result = validateData(req.body);
		if(result.error){
			res.send(result)
			return false;
		}		
		async.waterfall([		
			function (cb1) {
				var newSplits = [];																			
				async.forEach(req.body.splits, function(split,cb2){								
					if(split.path && split.path != ''){									
						cashapi.getAccountByPath(split.path, function(err,accId){
							split.accountId = accId;
							newSplits.push(split);																
							cb2();
						});	
					}
					else{
						cb2();
					}													
				},function(){cb1(null,newSplits);});						
				
			},
			function (newSplits,cb1) {
				var newTr = {};
				var dateFormat = new DateFormat(DateFormat.W3C);
				var datePosted = dateFormat.format(new Date());	
				newTr['datePosted'] = datePosted;	
				var dateEntered = dateFormat.format(new Date(req.body.date));										
				newTr['dateEntered'] = dateEntered;	
				newTr['description'] = req.body.description;	
				newTr['splits'] = [];
				var imbalance = 0;					
				newSplits.forEach(function(split) {
					var depositVal  = split.deposit != "" ? parseInt(split.deposit) : 0;
					var withdrawalVal  = split.withdrawal != "" ? parseInt(split.withdrawal) : 0;
					var splitVal = depositVal - withdrawalVal;
					imbalance += splitVal;
					var modifiedSplit = {													
						value: depositVal - withdrawalVal,
						quantity:depositVal - withdrawalVal,
						accountId: split.accountId							
					};
					newTr['splits'].push(modifiedSplit);					
				});				
				if(imbalance != 0){
					/* for classic transaction with two splits made automatic correct */
					if(newTr['splits'].length == 1 && newTr['splits'][0].accountId != req.params.id){
						newTr['splits'].push({
							accountId:req.params.id,
							value:-1*imbalance,
							quantity:-1*imbalance
						});
					}
					else if(newTr['splits'].length == 2){
						if(newTr['splits'][1].accountId == req.params.id){
							newTr['splits'][0].value = -1*newTr['splits'][1].value;
							newTr['splits'][0].quantity = -1*newTr['splits'][1].quantity;
						}
						else{
							newTr['splits'][1].value = -1*newTr['splits'][0].value;
							newTr['splits'][1].quantity = -1*newTr['splits'][0].quantity;
						}
					}
					else{
						res.send({error:'imbalanceError',value:imbalance});
						return cb1(null);	
					}										
				}
				console.log(newTr);				
				cashapi.addTransaction(req.session.apiToken, newTr, function(err){
					var result = {result:"1"};
					if(err){
						console.log('err=');
						console.log(err);
						result.error = "1";
					}
					res.send(result);
				});
					
			}
		], function (err) {
			if (err) return next(err);
		});		
	});

	app.get(webapp.prefix+'/account/:id/getaccounts', function(req, res, next) {
		var tmp = [];		
		async.waterfall([
			async.apply(cashapi.getAllAccounts, req.session.apiToken),
			function (accounts,cb1) {
				var tmp = [];
				async.forEach(accounts, function (acc, cb2) {
					cashapi.getAccountInfo(req.session.apiToken, acc.id, ["path"], safe.trap_sure_result(cb2,function (info) {
						if (info.path.search(req.query.term)!=-1)
							tmp.push(info.path);
						cb2();
					}));
				}, function (err) {
					cb1(err, tmp);
				})
			},
			function (hints, cb1) {				
				var hintsObject={};
				for(var i in hints){
					hintsObject[hints[i]] = hints[i];
				}
				res.send(hintsObject);
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
						if (tr.description.search(req.query.term)!=-1)
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
		var count,register,currentAccountPath;
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
						var accInfo = [];
						accInfo.push({'id':req.params.id,'path':currentAccountPath});					
						async.forEach(_.keys(aids), function (aid, cb3) {
							cashapi.getAccountInfo(req.session.apiToken, aid,["path"],safe.trap_sure_result(cb3,function(info) {
								accInfo.push(info);															
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
				var t={}; _.forEach(accInfo, function (e) { t[e.id]=e; }); accInfo = t;
				var i;
				for (i=0; i<_.size(register); i++) {
					var tr = transactions[i]; 
					var trs = register[i];
					var recv = trs.recv;
					var send = trs.send;
					var dp = new Date(tr.dateEntered);
					var splitsInfo=[];
					_.forEach(tr.splits,function(split){
						split.path = accInfo[split.accountId].path;
						splitsInfo.push(split);
					});								
					data.aaData.push([tr.id,df.format(dp),tr.description,
						recv.length==1?accInfo[recv[0].accountId].path:"-- Multiple --",
						send.value>0?sprintf("%.2f",send.value):null,
						send.value<=0?sprintf("%.2f",send.value*-1):null,
						sprintf("%.2f",trs.ballance),splitsInfo]);
				}				
				data.iTotalRecords = count;
				data.iTotalDisplayRecords = count;
				res.send(data);
			})
		], function (err) {
			if (err) return next(err);
		});
	});

}
