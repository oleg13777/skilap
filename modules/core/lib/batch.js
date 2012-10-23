// !!!!!!!!!!! CAUTION !!!!!!!!!!!!!!
// Changes in this module require preliminary approval

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
	},
	'noop': function (obj, key, val, cb) {
		cb();
	},
	'clean': function (obj, key, val, cb) {
		_(_(obj).keys()).forEach(function (key) {
			delete obj[key];
		})
		cb();
	}
}

var cmdFunc = {
	'object': function (param, lookup, cb) {
		cb(null, lookup(param))
	},
	'api': function (param, lookup, cb) {
		var fpath = param[0].split('.');
		var mname = fpath[0];
		var func = fpath[1];
		var args = param.slice(1);
		var rargs = [];
		_(args).forEach(function (a) {
			rargs.push(lookup(a))
		})
		rargs.push(cb);
		var m = lookup(mname);
		if (!_.isObject(m))
			return cb (new Error("Can't find api module"));
		var f = m[func];
		if (!_.isFunction(f))
			return cb (new Error("Can't find api function"));
		f.apply(m,rargs);
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
	},
	'flatten': function (param, lookup, cb) {
		var col = lookup(param[0]);
		col = _.flatten(col, true);
		cb(null, col)
	}	
}

module.exports = function (core) {
	var self = this;	
	var context = {}

	this.lookup = function(a, lctx) {
		if (!_.isString(a))
			return a;
		// 1st guess, this?
		if (a=="this")
			return lctx || context;
		// 2nd guess, module name?
		var m = core.getModuleSync(a);
		if (m) 
			return m.api;
		// 3rd guess var in local context?
		if (!_.isUndefined(context[a]))
			return context[a]
		// 4rd quess var in global context
		else if (lctx && !_.isUndefined(lctx[a]))
			return lctx[a]
		// 4rd guess, this is just string
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
