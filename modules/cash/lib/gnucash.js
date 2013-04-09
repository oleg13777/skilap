var fs = require("fs");
var _ = require('underscore');
var async = require('async');
var sax = require("sax");
var util = require("util");
var zlib = require("zlib");
var safe = require("safe");
var ObjectId = require('mongodb').ObjectID;


module.exports = function (fileName, cb){
	var self = this;
	// stream usage
	// takes the same options as the parser
	var saxStream = sax.createStream();

	saxStream.on("error", function (e) {
		// unhandled errors will throw, since this is a proper node
		// event emitter.
		console.error("error!", e);
		// clear the error
		this._parser.error = null;
		this._parser.resume();
	});

	var tr;
	var acc;
	var split;
	var nodetext;
	var price;
	var transactions = [];
	var accounts = [];
	var prices = [];
	var accMap = {};
	var path = [];
	var gluid = 1;
	var gluMap = {};
	var rootId = null;
	var slot = {};
	var slots = [];
	var flags = ["hidden", "placeholder"];
	var defCurrency = null;
	
	var opentag = {
		"CUST:CURRENCY":function(){
			defCurrency = {};
		},
		"GNC:TRANSACTION":function(){
			tr = {currency:{},splits:[]};
		},
		"GNC:ACCOUNT":function(){
			acc = {parentId:0,cmdty:{}};
		},		
		"TRN:SPLIT":function(){
			split = {};
		},
		"PRICE":function(){
			price = {id:gluid,cmdty:{},currency:{}};
			gluid++;
		},
		"SLOT":function(){
			slot = {};
		},
		"ACT:SLOTS":function(){
			slots = [];
		}
	};
	
	var closetag = {
		"GNC:TRANSACTION":function(){
			transactions.push(tr);
		},	
		"GNC:ACCOUNT":function(){
			if (acc.type != "ROOT") {
				accounts.push (acc);
				accMap[acc._id]=acc;
			} else {
				rootId = acc._id;
			}
		},
		"TRN:SPLIT":function(){
			if (accMap[split.accountId]==null) {
				exit(0);
			}
			tr.splits.push(split);
		},	
		"TRN:DESCRIPTION":function(){
			tr.description = nodetext;
		},
		"TRN:NUM":function(){
			tr.num = nodetext;
		},
		"TRN:ID":function(){
			gluMap[nodetext]=gluid;
			tr._id = gluid;
			gluid++;
		},		
		"TS:DATE":function(){
			switch(path[path.length-1]) {
				case "TRN:DATE-ENTERED":
					tr.dateEntered = new Date(nodetext);
					break;
				case "TRN:DATE-POSTED":
					tr.datePosted = new Date(nodetext);
					break;
				case "PRICE:TIME":
					price.date = new Date(nodetext);
					break;
			}
		},
		"ACT:NAME":function(){
			acc.name = nodetext;
		},
		"ACT:TYPE":function(){
			acc.type = nodetext;
		},
		"ACT:ID":function(){
			gluMap[nodetext]=gluid;
			acc._id = gluid; 
			gluid++;
		},
		"ACT:PARENT":function(){
			acc.parentId = gluMap[nodetext];
			if (acc.parentId == rootId)
				acc.parentId = 0;
		},
		"CMDTY:ID":function(){
			switch(path[path.length-1]){
				case "ACT:COMMODITY":
					acc.cmdty._id = nodetext;
				break;
				case "TRN:CURRENCY":
					tr.currency._id = nodetext;
				break;
				case "PRICE:COMMODITY":
					price.cmdty._id = nodetext;
				break;
				case "PRICE:CURRENCY":
					price.currency._id = nodetext;
				break;
				case "CUST:CURRENCY":
					defCurrency._id = nodetext;
				break;				
			}			
		},
		"CMDTY:SPACE":function(){
			switch(path[path.length-1]){
				case "ACT:COMMODITY":
					acc.cmdty.space = nodetext;
				break;
				case "TRN:CURRENCY":
					tr.currency.space = nodetext;
				break;
				case "PRICE:COMMODITY":
					price.cmdty.space = nodetext;
				break;
				case "PRICE:CURRENCY":
					price.currency.space = nodetext;
				break;
				case "CUST:CURRENCY":
					defCurrency.space = nodetext;
				break;
			}			
		},	
		"PRICE:VALUE":function(){
			price.value = eval(nodetext);
		},
		"PRICE:SOURCE":function(){
			price.source = nodetext == "user:xfer-dialog" ? "transaction" : "edit";
		},
		"PRICE":function(){
			prices.push(price);
		},	
		"SPLIT:QUANTITY":function(){
			split.quantity = eval(nodetext);
		},
		"SPLIT:VALUE":function(){
			split.value = eval(nodetext);
		},
		"SPLIT:MEMO":function(){
			split.memo = nodetext;
		},
		"SPLIT:ID":function(){
			gluMap[nodetext]=gluid;
			split._id = gluid; 
			gluid++;
		},
		"SPLIT:ACCOUNT":function(){
			split.accountId = gluMap[nodetext];
		},
		"SPLIT:RECONCILED-STATE":function(){
			split.rstate = nodetext;
		},
		"SPLIT:ACTION":function(){
			split.action = nodetext;
		},		
		"SLOT:KEY":function(){
			slot.key = nodetext;
		},
		"SLOT:VALUE":function(){
			slot.value = nodetext;
		},
		"SLOT":function(){
			if(_(flags).indexOf(slot.key) > -1) {
				slots.push(slot);
			}
		},
		"ACT:SLOTS":function(){
			if(!(_(slots).isEmpty())) {
				_(slots).forEach(function (s) {
					acc[s.key] = s.value;
				});
			}
		}
		
	};
	
	saxStream.on("opentag", function (node) {
		path.push(node.name);
		if(opentag[node.name]){
			opentag[node.name]();
		}		
	});

	saxStream.on("text", function (text) {
		nodetext = text;
	})

	saxStream.on("closetag", function (name) {		
		path.pop();
		if(closetag[name]){
			closetag[name]();
		}	
	});

	saxStream.on("end", function (node) {
		// we need to transpond ids to our own space
		var aidMap={};
		async.series([
			function transpondAccounts(cb) {
				async.forEachSeries(accounts, function (acc,cb) {
//					self._ctx.getUniqueId(safe.sure(cb,function (id) {
						var _id = new ObjectId();
						aidMap[acc._id]=_id;
						acc._id = _id;
						process.nextTick(cb);
//					}));
				},cb);
			},
			function transpondAccountsTree(cb) {
				_(accounts).forEach(function (acc) {
					if (acc.parentId!=0)
						acc.parentId=aidMap[acc.parentId];
				});
				cb();
			},
			function transpondTransactions(cb) {
				async.forEachSeries(transactions, function (trn,cb) {
					async.forEachSeries(trn.splits, function (split,cb) {
						split.accountId = aidMap[split.accountId];
//						self._ctx.getUniqueId(safe.sure(cb,function (id) {
							var _id = new ObjectId();
							split._id = _id;
							process.nextTick(cb);
//						}))
					}, safe.sure(cb, function () {
//						self._ctx.getUniqueId(safe.sure_result(cb, function (id) {
							var _id = new ObjectId();
							trn._id = _id;
							cb();
//						}));
					}));
				},cb);
			}
		], safe.sure(cb, function () {
			var settings = {};
			if (defCurrency)
				settings['currency____'] = defCurrency;
			var ret = {tr:transactions, acc:accounts, prices:prices, settings:settings};
			process.nextTick(function(){
				cb(null,ret);
			});
		}));
	});
	
	try {
		var buffer = new Buffer(3);
		var fd = fs.openSync(fileName, 'r');
		fs.readSync(fd, buffer, 0, 3, 0);
		fs.closeSync(fd);

		if (buffer[0] == 31 && buffer[1] == 139 && buffer[2] == 8)
			fs.createReadStream(fileName).pipe(zlib.createUnzip()).pipe(saxStream);
		else 
			fs.createReadStream(fileName).pipe(saxStream);
	} catch (err) {
		cb(err);
	}
};
