var async = require("async");
var _ = require('underscore');

var resFunc = {
	'store': function (obj, key, val, cb) {
		obj[key]=val;
		cb();
	},
	'clone': function (obj, key, val, cb) {
		obj[key]=JSON.parse(JSON.stringify(val));
		cb();
	},
	'merge': function (obj, key, val, cb) {
		_.extend(obj,val);
		cb();
	}
}

var cmdFunc = {
	'object': function (param, lookup, cb) {
		cb(null, lookup(param))
	},
	'api': function (param, lookup, cb) {
		var func = param[0].split('.')[1];
		var args = param.slice(1);
		var rargs = [];
		_(args).forEach(function (a) {
			rargs.push(lookup(a))
		})
		rargs.push(cb);
		var cashapi = lookup("cashapi");
		cashapi[func].apply(cashapi,rargs);
	},
	'pluck': function (param, lookup, cb) {
		var col = lookup(param[0]);
		var plu = _(col).pluck(param[1]);
		if (param[2]) {
			var u = {};
			_(plu).forEach(function (e) {
				if (_.isUndefined(u[JSON.stringify(e)]))
					u[JSON.stringify(e)]=e;
			})
			plu = _(u).values();
		}
		cb(null, plu)
	},
	'filter': function (param, lookup, cb) {
		var col = lookup(param[0]);
		col = _(col).filter(function (e) {
			return _(param[2]).include(e[param[1]]);
		})
		cb(null, col)
	}	
}

var Batch = function (cashapi) {
	var self = this;	
	var context = {}
	this.cashapi = cashapi;

	this.lookup = function(a, lctx) {
		if (!_.isString(a))
			return a;
		if (a=="this")
			return lctx || context;
		if (a=="cashapi")
			return self.cashapi;
		if (!_.isUndefined(context[a]))
			return context[a]
		else if (!_.isUndefined(lctx[a]))
			return lctx[a]
		else
			return a;
	}
	
	this.run = function (task,cb) {
		var ct = {};
		_(task).forEach(function (v,k) {
			// little validation 
			if (_.isUndefined(v.prm))
				return cb(new Error("Task should have parameter"));			
			// configure job
			var job = cmdFunc[v.cmd];
			if (job==null)
				return cb(new Error("Unknown job action"));			
				
			// configure result
			var res = {};
			if (_.isObject(v.res)) _.extend(res,v.res);
			_.defaults(res,{o:"this",a:"clone",v:"key"});
			var rf = resFunc[res.a];
			if (rf==null)
				return cb(new Error("Unknown result action"));
			
			// configure worker function
			var worker;
			if (v.ctx==null) {
				worker = function (cb) {
					job(v.prm, function (a) { return self.lookup(a) }, function (err, jv) {
						if (err!=null) return cb(err);
						rf(self.lookup(res.o), res.v, jv, cb)
					})
				}
			} else if (v.ctx.a == "each") {
				worker = function (cb) {
					var col = self.lookup(v.ctx.v);
					if (!(_.isObject(col) || _.isArray(col)))
						return cb (new Error ("Bad collection for each"));
					async.forEach(col, function (e, cb) {
						job(v.prm, function (a) { return self.lookup(a,e) }, function (err, jv) {
							if (err!=null) return cb(err);
							rf(self.lookup(res.o,e), res.v, jv, cb)
						})
					}, cb)
				}
			}
			
			var atask = [];
			// add dependcies if available
			if (v.dep) {
				atask.push(v.dep);
			}
			// add safe wrapped worker function
			atask.push(function (cb) {
				try {
					worker(cb);
				} catch (err) {
					cb(err)
				}
			})
			ct[k]=atask;
		})
		
		// execute "compiled" batch
		async.auto(ct, function (err) {
			if (err!=null) return cb(err);
			cb(null, context);
		})
	}
}

module.exports = function account(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var assetsTypes = ["BANK", "CASH", "ASSET", "STOCK", "MUTUAL", "CURENCY"];
	var liabilitiesTypes = ["CREDIT", "LIABILITY", "RECEIVABLE", "PAYABLE"];
	var repCmdty = {space:"ISO4217",id:"RUB"};
	
	function getAssets(token, id, types, data, cb) {
		// filter this level data
		var level = _(data.accounts).filter(function (e) { return e.parentId == id && _(types).include(e.type); });
		var res = [];
		_(level).forEach (function (acc) {
			var det = {};
			det.cmdty = acc.cmdty;
			det.name = acc.name;
			det.id = acc.id;			
			getAssets(token, acc.id,types,data, function (err,childs) {
				if (err) return cb(err);
				if (!_(repCmdty).isEqual(det.cmdty)) 
					det.quantity = acc.value;
				var rate = 1;
				var r = _(data.cmdty).find(function (e) { return e.id==acc.cmdty.id });
				if (r!=null)
					rate = r.rate;
				det.value = parseFloat(webapp.i18n_cmdtyval(det.cmdty.id,acc.value*rate));
				det.childs = childs;
				_(childs).forEach (function (e) {
					det.value+=e.value;
				})
				det.fvalue = webapp.i18n_cmdtytext(token,repCmdty,det.value);
				if (det.quantity)
					det.fquantity = webapp.i18n_cmdtytext(token,det.cmdty,det.quantity);
				res.push(det);
			})
		})
		cb(null, res);
	}

	app.get(prefix, function(req, res, next) {
		var data;
		var assets = [];
		var liabilities = [];
		async.waterfall([
			function (cb) {
				var batch = {
					"setup":{
						"cmd":"object",
						"prm":{"token":req.session.apiToken,"repCmdty":repCmdty},
						"res":{"a":"merge"}
					},
					"accounts":{
						"dep":"setup",
						"cmd":"api",
						"prm":["cashapi.getAllAccounts","token"],
						"res":{"a":"store","v":"accounts"}
					},
					"filter":{
						"dep":"accounts",
						"cmd":"filter",
						"prm":["accounts","type",["BANK", "CASH", "ASSET", "STOCK", "MUTUAL", "CURENCY","CREDIT", "LIABILITY", "RECEIVABLE", "PAYABLE"],"IN"],
						"res":{"a":"store","v":"accounts"}
					},					
					"info":{
						"dep":"filter",
						"cmd":"api",
						"ctx":{"a":"each","v":"accounts"},
						"prm":["cashapi.getAccountInfo","token","id",["value"]],
						"res":{"a":"merge"}
					},
					"cmdty":{
						"dep":"filter",
						"cmd":"pluck",
						"prm":["accounts","cmdty","unique"],
						"res":{"a":"clone","v":"cmdty"}
					},
					"rates":{
						"dep":"cmdty",
						"cmd":"api",
						"ctx":{"a":"each","v":"cmdty"},	
						"prm":["cashapi.getCmdtyPrice","token","this","repCmdty",null,null],
						"res":{"a":"store","v":"rate"}
					}					
				}
				
				var b = new Batch(cashapi);
				b.run(batch,function (err, _data) {
					if (err) return scb(err);
					data = _data;
					cb();
				})
			},
			function (cb) { 
				getAssets(req.session.apiToken, 0, assetsTypes, data, function (err, res) {
					if (err) return cb(err);
					assets = res;
					cb();
				})
			},
			function (cb) { 
				getAssets(req.session.apiToken, 0, liabilitiesTypes, data, function (err, res) {
					if (err) return cb(err);
					liabilities = res;
					cb();
				})
			},
			function (cb) { webapp.guessTab(req, {pid:'home',name:'Home',url:req.url}, cb) },
			function render (vtabs) {
				var rdata = {settings:{views:__dirname+"/../views"},prefix:prefix, tabs:vtabs};
				rdata.assetsSum = webapp.i18n_cmdtytext(req.session.apiToken,repCmdty,_(assets).reduce(function (m,e) {return m+e.value;},0));
				rdata.liabilitiesSum = webapp.i18n_cmdtytext(req.session.apiToken,repCmdty,_(liabilities).reduce(function (m,e) {return m+e.value;},0));
				rdata.assets = assets;
				rdata.liabilities = liabilities;
				
				res.render(__dirname+"/../views/index", rdata);
			}],
			next
		);
	});

	app.get(prefix + "/close", function(req, res, next) {
		async.waterfall([
			function(cb1){
				var pid = req.query.pid;
				if (pid) {
					webapp.removeTabs(req.session.apiToken, [pid], cb1);
				} else {
					cb1();
				}
			},
			function(){
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end('true');
			}
		], next);
	})
}

