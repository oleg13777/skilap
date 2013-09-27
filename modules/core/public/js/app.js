(function () {
	require.config({
		baseUrl: "/common/js",
		paths: {
			"hbs": _prefix+"/hbs"
			, "admin": _prefix+"/js"
			/* cutstart */
			, "jquery": "/common/js/jquery"
			, "jquery-block": "/common/js/jquery.blockUI"
			, "bootstrap": "/common/js/bootstrap"
			, "moment": "/common/js/moment/moment"
			/* cutend */
			, "moment_ru": "/common/js/moment/lang/ru"
		},
		shim:{
			"gettext": {
				exports: "Gettext",
				init: function () {
					delete this.Getext;
				}
			},
			"bootstrap": {
				deps:["jquery"]
			},
			"jquery-block": {
				deps:["jquery"]
			},
		},
		config: {
			'clitpl': {
				mPath: '/core/',
				mName: 'core'
			}
		}
	});

	define("api", function () {
		return {
			call:function () {
				var la = Array.prototype.slice.call(arguments);
				la.splice(1,0,_apiToken);
				var cb = la[la.length-1];
				la[la.length-1] = {
					success: function (data) {
						data.splice(0,0,null);
						cb.apply(this,data);
					},
					failure: cb
				}
				require(['jsonrpc'], function (JsonRpc) {
					var rpc = new JsonRpc('/jsonrpc');
					rpc.call.apply(rpc, la)
				},cb)
			},
			batch:function (batch,cb) {
				require(['lodash','jsonrpc'], function (_,JsonRpc) {
					_.forEach(batch, function (s) {
						if (s.cmd == "api")
							s.prm.splice(1,0,_apiToken)
					})
					var rpc = new JsonRpc('/jsonrpc');
					rpc.call("batch.runBatch",batch,{
						success: function (data) {
							data.splice(0,0,null);
							cb.apply(this,data);
						},
						failure: cb
					})
				},cb)
			}
		}
	})

	window.appError = function(err,title) {
		if (err) {
			require(["jquery","bootstrap"], function ($) {
				var message = "Unknown error";
				if (err.message)
					message = err.message;
				if (err.data && err.data.subject)
					message+=" ("+err.data.subject + ")"
				if (err.requireModules)
					message+="<br>"+ err.requireType + " modules: "+JSON.stringify(err.requireModules);
				var t = title || "Ops, something weird happened !";
				var $ctx = $(".context");
				if ($('.modal').is(':visible'))
					$ctx = $('.modal');
				if ($('.localctx').is(':visible'))
					$ctx = $('.localctx');

				$ctx.prepend('<div class="alert alert-error"><button class="close" data-dismiss="alert">×</button><strong>'+t+'</strong><br>'+message+'</div>').alert();
			})
		}
	}
})();
