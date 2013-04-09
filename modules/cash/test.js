var http = require('http');
var fs = require("fs");
var sax = require("sax");
var alfred = require('alfred');
var adb = null;
var cash_accounts = null;
var cash_transactions = null;

alfred.open('../../data/db', function(err, db) {
	if (err) { throw err; }
	console.log("db: " + db);
	adb = db;
	adb.ensure("cash_accounts", {type:'cached_key_map',buffered:false}, function(err,_cash_accounts) {
		cash_accounts = _cash_accounts;
		adb.ensure("cash_transactions",{type:'cached_key_map',buffered:false}, function(err,_cash_transactions) {
			cash_transactions = _cash_transactions;
		});
	});
}); 

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
var transactions = [];
var accounts = [];
var accMap = {};
var path = [];
var gluid = 1;
var gluMap = {};
saxStream.on("opentag", function (node) {
	path.push(node.name);
	if (node.name == "GNC:TRANSACTION") {
		tr = {splits:[]};
	} else if (node.name == "GNC:ACCOUNT") {
		acc = {};
	} else if (node.name == "TRN:SPLIT") {
		split = {};
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
	} else if (node.name == "TRN:DESCRIPTION") {
		tr.description = nodetext;
	} else if (node.name == "TRN:ID") {
		gluMap[nodetext]=gluid;
		tr._id = gluid; gluid++;
	} else if (node.name == "TS:DATE") {
		if (path[path.length-1]=="TRN:DATE-ENTERED") {
			tr.dateEntered = new Date(nodetext);
		}
	} else if (node.name == "ACT:NAME") {
		console.log(nodetext);
		acc.name = nodetext;
	} else if (node.name == "ACT:TYPE") {
		acc.type = nodetext;
	} else if (node.name == "ACT:ID") {
		gluMap[nodetext]=gluid;
		acc._id = gluid; gluid++;
	} else if (node.name == "ACT:PARENT") {
		acc.parent = gluMap[nodetext];
	} else if (node.name == "CMDTY:ID") {
		if (path[path.length-1]=="ACT:COMMODITY") {
			acc.cmdtyId = nodetext;
		} else if (path[path.length-1]=="TRN:CURRENCY") {
			tr.currency = nodetext;
		}
	} else if (node.name == "GNC:ACCOUNT") {
		if (acc.type != "ROOT") {
			accounts.push (acc);
			accMap[acc._id]=acc;
		}
	} else if (node.name == "SPLIT:QUANTITY") {
		split.quantity = eval(nodetext);
	} if (node.name == "SPLIT:VALUE") {
		split.value = eval(nodetext);
	} if (node.name == "SPLIT:MEMO") {
		split.memo = nodetext;
	} if (node.name == "SPLIT:ID") {
		gluMap[nodetext]=gluid;
		split._id = gluid; gluid++;
	}  if (node.name == "SPLIT:ACCOUNT") {
		split.accountId = gluMap[nodetext];
	} else if (node.name == "TRN:SPLIT") {
		if (accMap[split.accountId]==null) {
			exit(0);
		}
		tr.splits.push(split);
	}
})



saxStream.on("end", function (node) {
	transactions.forEach(function (e) {
		cash_transactions.put(e._id,e,function (err) {if (err) { throw err; }});
	})
	accounts.forEach(function (e) {
		cash_accounts.put(e._id,e,function (err) {if (err) { throw err; }});
	})
	console.log(accounts.length);
	console.log(transactions.length);
	adb.close(function (err) {if (err) {throw err;}});
})

// pipe is supported, and it's readable/writable
// same chunks coming in also go out.
fs.createReadStream("./samples/home.xml")
  .pipe(saxStream);

console.log(new Date());
