define(["handlebars.runtime","lodash","async","safe","module"], function (handlebars,_,async,safe,module) {
	handlebars.registerHelper('when', function(lvalue, op, rvalue, options) {
		if (arguments.length < 4)
			throw new Error("Handlerbars Helper 'compare' needs 3 parameters");

		var result = false;

		try {
			result = eval(JSON.stringify(lvalue)+op+JSON.stringify(rvalue));
		} catch (err) {
		}

		return result?options.fn(this):options.inverse(this);
	});

	return {
		compile:function(scans,opts, cb) {
			if (typeof cb !== "function") {
				cb = opts;
				opts = {};
			}
			var templates = {};
			_.forEach(scans, function (scan) {
				if (scan.v) return;

				var tpl = new handlebars.template(eval("("+scan.tf+")"))
				templates[scan.p]=tpl;
			})
			handlebars.partials = templates;
			cb(null, templates);
		},
		corectx:function(ctx,opts,cb) {
			if (typeof cb !== "function") {
				cb = opts;
			}
			ctx.uniq = (new Date()).valueOf();
			ctx.apiToken = _apiToken;

			if (!opts.ctx)
				return cb(null, ctx);

			var tasks = [function (cb) {cb()}];

			if (opts.ctx.i18n_date) {
				tasks.push(function (cb) {
					var deps = ["moment"];
					var lc = _user.language.charAt(0)+_user.language.charAt(1);
					if (lc!="en")
						deps.push("moment_"+lc);
					require(deps, function (moment) {
						moment.lang(lc);
						handlebars.registerHelper('i18n_date',function(d, options) {
							var f = "L";
							if (d=="format")
								return moment.langData().longDateFormat(f).toLowerCase();
							var f = "L";
							r = d.toString();
							try {
								var lm = moment(d);
								if (lm.isValid()){
									r = lm.format(f);
								}
							} catch(e) {};
							return r;
						})
						cb();
					}, cb)
				})
			}
			if (opts.ctx.i18n) {
				tasks.push(function (cb) {
					var deps = ["gettext"];
					var mPath =  module.config().mPath;
					var mName =  module.config().mName;
					deps.push("json!"+mPath+"locale/"+mName+"."+_user.language+".json");
					require(deps, function (Gettext, locale) {
						var locale_data = {};
						locale_data[mName] = locale;
						var _gt = new Gettext({  "domain" : mName,
							"locale_data" : locale_data})
						handlebars.registerHelper('i18n',function(options) {
							return _gt.gettext(options.fn(this));
						})
						cb();
					}, cb);
				})
			}
			if (opts.ctx.i18n_currency) {
				tasks.push(function (cb) {
					require(["currency"], function (currency) {
						var i18n_cytext = function(curId,value) {
							var cur = currency(curId);
							var res = cur.format(value);
							var m = res.match(/([^0123456789., ]*)([0123456789., ]*)([^0123456789., ]*)/);
							if (m && m.length>3)
								return (m[1]+" "+m[2]+ " "+m[3]).trim();
							else
								return res.trim();
						}

						handlebars.registerHelper('i18n_currency',function(iso, value, options) {
							if (value==null) return "";
							return i18n_cytext(iso,value);
						})
						cb();
					}, cb)
				})
			}
			if (opts.ctx.i18n_cost || opts.ctx.i18n_cmdtytext) {
				tasks.push(function (cb) {
					require(["currency","api"], function (currency,api) {
						var i18n_cytext = function(curId,value) {
							var cur = currency(curId);
							var res = cur.format(value);
							var m = res.match(/([^0123456789., ]*)([0123456789., ]*)([^0123456789., ]*)/);
							if (m && m.length>3)
								return (m[1]+" "+m[2]+ " "+m[3]).trim();
							else
								return res.trim();
						}
						handlebars.registerHelper('i18n_cmdtytext',function(cmdty,value) {
							if (cmdty.space == 'ISO4217')
								return i18n_cytext(cmdty.id,value);
							else {
								var res = i18n_cytext('USD',value);
								res.replace('USD',cmdty.id);
								return res;
							}
						});
						if (opts.ctx.i18n_cost) {
							api.call("cash.getCmdtyLastPrices",safe.sure(cb, function (prices) {
								handlebars.registerHelper('i18n_cost',function(cmdtyRep, cmdtySrc, value, options) {
									cmdtySrc = cmdtySrc || {space:"ISO4217", id:"USD"};
									var cmdtyDst = cmdtyRep||{space:"ISO4217", id:"USD"};
									var key = (cmdtySrc.space+cmdtySrc.id+cmdtyDst.space+cmdtyDst.id);
									var price = prices[key] || 1;
									return (price!=1?"( "+i18n_cytext(cmdtySrc.id, value) + ")":"")
										+" "+i18n_cytext(cmdtyDst.id, price*value);
								})
								cb();
							}))
						} else
							cb();
					},cb)
				})
			}

			if (opts.ctx.user) {
				tasks.push(function (cb) {
					require(["jsonrpc"], function (JsonRpc) {
						var rpc = new JsonRpc('/jsonrpc');
						rpc.call('core.getUser', _apiToken, {
							success: function (data) {
								var user = data[0];
								user[user.language]=1;
								ctx.user = user;
								cb();
							}, failure:cb
						});
					}, cb)
				})
			}
			async.parallel(tasks,function (err) {
				if (err) return cb(err);
				cb(null,ctx);
			})
		},
		make:function(scans,ctx_,opts,cb) {
			ctx = _.cloneDeep(ctx_);
			if (typeof cb !== "function") {
				cb = opts;
				opts = {ctx:{}};
			}
			var self = this;
			// autodetect some common stuff
			_.forEach(scans, function (scan) {
				if (scan.v) return;
				opts.ctx.i18n = opts.ctx.i18n || scan.tf.indexOf("helpers.i18n")!=-1;
				opts.ctx.user = opts.ctx.user || scan.tf.indexOf("depth0.user")!=-1;
				opts.ctx.i18n_currency = opts.ctx.i18n_currency || scan.tf.indexOf("helpers.i18n_currency")!=-1;
				opts.ctx.i18n_cost = opts.ctx.i18n_cost || scan.tf.indexOf("helpers.i18n_cost")!=-1;
				opts.ctx.i18n_cmdtytext = opts.ctx.i18n_cmdtytext || scan.tf.indexOf("helpers.i18n_cmdtytext")!=-1;
				opts.ctx.i18n_date = opts.ctx.i18n_date || scan.tf.indexOf("helpers.i18n_date")!=-1;
			})
			this.compile(scans,opts, function (err, templates) {
				if (err) return cb(err);
				self.corectx(ctx,opts,function(err, ctx) {
					if (err) return cb(err);
					cb(null, templates, ctx);
				})
			})
		},
		render:function(tname,ctx,opts,cb) {
			var self = this;
			if (typeof cb !== "function") {
				cb = opts;
				opts = {ctx:{}};
			}
			require(["json!hbs/"+tname+".js"], function (scans) {
				self.make(scans,ctx,opts,safe.sure(cb, function (tpl,ctx) {
					cb(null,tpl[tname](ctx),ctx);
				}))
			},cb)
		}
	};
})
