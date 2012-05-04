var fs = require("fs");
var _ = require('underscore');
var async = require('async');
var sax = require("sax");
var util = require("util");
var zlib = require("zlib");

module.exports = function (fileName, callback){
	var self = this;
	// stream usage
	// takes the same options as the parser
	var saxStream = sax.createStream();

	saxStream.on("error", function (e) {
		// unhandled errors will throw, since this is a proper node
		// event emitter.
		console.error("error!", e)
		// clear the error
		this._parser.error = null
		this._parser.resume()
	})

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
	saxStream.on("opentag", function (node) {
		path.push(node.name);
		if (node.name == "GNC:TRANSACTION") {
			tr = {currency:{},splits:[]};
		} else if (node.name == "GNC:ACCOUNT") {
			acc = {parentId:0,cmdty:{}};
		} else if (node.name == "TRN:SPLIT") {
			split = {};
		} else if (node.name == "PRICE") {
			price = {id:gluid,cmdty:{},currency:{}};
			gluid++;
		} else if (node.name == "SLOT") {
			slot = {};
		} else if (node.name == "ACT:SLOTS") {
			slots = [];
		}
	})

	saxStream.on("text", function (text) {
		nodetext = text;
	})

	saxStream.on("closetag", function (name) {
		var node = {name:name};
		path.pop();
		if (name == "GNC:TRANSACTION") {
			transactions.push(tr);
		} else if (name == "PRICE") {
			prices.push(price);
		} else if (node.name == "TRN:DESCRIPTION") {
			tr.description = nodetext;
		} else if (node.name == "TRN:ID") {
			gluMap[nodetext]=gluid;
			tr.id = gluid; gluid++;
		} else if (node.name == "TS:DATE") {
			if (path[path.length-1]=="TRN:DATE-ENTERED") {
				tr.dateEntered = new Date(nodetext);
			} else if (path[path.length-1]=="TRN:DATE-POSTED") {
				tr.datePosted = new Date(nodetext);
			} else if (path[path.length-1]=="PRICE:TIME") {
				price.date = new Date(nodetext);
			}
		} else if (node.name == "ACT:NAME") {
			acc.name = nodetext;
		} else if (node.name == "ACT:TYPE") {
			acc.type = nodetext;
		} else if (node.name == "ACT:ID") {
			gluMap[nodetext]=gluid;
			acc.id = gluid; gluid++;
		} else if (node.name == "ACT:PARENT") {
			acc.parentId = gluMap[nodetext];
			if (acc.parentId == rootId)
				acc.parentId = 0;
		} else if (node.name == "CMDTY:ID") {
			if (path[path.length-1]=="ACT:COMMODITY") {
				acc.cmdty.id = nodetext;
			} else if (path[path.length-1]=="TRN:CURRENCY") {
				tr.currency.id = nodetext;
			} else if (path[path.length-1]=="PRICE:COMMODITY") {
				price.cmdty.id = nodetext;
			} else if (path[path.length-1]=="PRICE:CURRENCY") {
				price.currency.id = nodetext;
			}
		} else if (node.name == "CMDTY:SPACE") {
			if (path[path.length-1]=="ACT:COMMODITY") {
				acc.cmdty.space = nodetext;
			} else if (path[path.length-1]=="TRN:CURRENCY") {
				tr.currency.space = nodetext;
			} else if (path[path.length-1]=="PRICE:COMMODITY") {
				price.cmdty.space = nodetext;
			} else if (path[path.length-1]=="PRICE:CURRENCY") {
				price.currency.space = nodetext;
			}
		} else if (node.name == "GNC:ACCOUNT") {
			if (acc.type != "ROOT") {
				accounts.push (acc);
				accMap[acc.id]=acc;
			} else {
				rootId = acc.id;
			}
		} else if (node.name == "SPLIT:QUANTITY") {
			split.quantity = eval(nodetext);
		} if (node.name == "SPLIT:VALUE") {
			split.value = eval(nodetext);
		} if (node.name == "SPLIT:MEMO") {
			split.memo = nodetext;
		} if (node.name == "SPLIT:ID") {
			gluMap[nodetext]=gluid;
			split.id = gluid; gluid++;
		}  if (node.name == "SPLIT:ACCOUNT") {
			split.accountId = gluMap[nodetext];
		} else if (node.name == "TRN:SPLIT") {
			if (accMap[split.accountId]==null) {
				exit(0);
			}
			tr.splits.push(split);
		} if (node.name == "PRICE:VALUE") {
			price.value = eval(nodetext);
		} if (node.name == "SPLIT:MEMO") {
			split.memo = nodetext;
		} if (node.name == "SLOT:KEY") {
			slot.key = nodetext;
		} if (node.name == "SLOT:VALUE") {
			slot.value = nodetext;
		} if ((node.name == "SLOT") && (_(flags).indexOf(slot.key) > -1)) {
			slots.push(slot);
		} if ((node.name == "ACT:SLOTS") && !(_(slots).isEmpty())) {
			console.log(slots);
			acc.slots = slots;
		}
	})

	saxStream.on("end", function (node) {
		// we need to transpond ids to our own space
		var aidMap={};
		async.series([
			function transpondAccounts(cb) {
				async.forEachSeries(accounts, function (acc,cb) {
					self._ctx.getUniqueId(function (err, id) {
						if (err) return cb(err);
						aidMap[acc.id]=id;
						acc.id = id;
						cb();
					})
				},cb)
			},
			function transpondAccountsTree(cb) {
				_(accounts).forEach(function (acc) {
					if (acc.parentId!=0)
						acc.parentId=aidMap[acc.parentId];
				})
				cb();
			},
			function transpondTransactions(cb) {
				async.forEachSeries(transactions, function (trn,cb) {
					async.forEachSeries(trn.splits, function (split,cb) {
						split.accountId = aidMap[split.accountId];
						self._ctx.getUniqueId(function (err, id) {
							if (err) return cb(err);
							split.id = id;
							cb();
						})
					}, function (err) {
						if (err) return cb(err);
						self._ctx.getUniqueId(function (err, id) {
							if (err) return cb(err);
							trn.id = id;
							cb();
						})
					})
				},cb)
			}
		], function (err) {
			if (err) return cb(err);
			var ret = {tr:transactions, acc:accounts, prices:prices};
			process.nextTick(function(){
				callback(null,ret);
			});
		})
	})
	
	var buffer = new Buffer(3);
	var fd = fs.openSync(fileName, 'r');
	fs.readSync(fd, buffer, 0, 3, 0);
	fs.closeSync(fd);

	if (buffer[0] == 31 && buffer[1] == 139 && buffer[2] == 8)
		fs.createReadStream(fileName).pipe(zlib.createUnzip()).pipe(saxStream)
	else 
		fs.createReadStream(fileName).pipe(saxStream);
}
