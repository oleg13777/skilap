define(["jquery","eventemitter2","safe", "jquery-block","bootstrap"], function ($,emit,safe) {
	var modal = function () {
		var self = this;
		var $modal = null;
		this.hide = function () {
			if ($modal)
				$modal.modal('hide')
		}
		this.show = function(id) {
			(function (cb) {
				require(['api','clitpl','lodash'], function (api,tf,_) {
					var batch = {
						"settings":{
							"cmd":"api",
							"prm":["cash.web_getTabSettings", id],
							"res":{"a":"store","v":"settings"}
						},
						"currencies":{
							"cmd":"api",
							"prm":["cash.web_getUseRangedCurrencies"],
							"res":{"a":"store","v":"currencies"}
						}
					}
					api.batch(batch, safe.sure(cb, function (data) {
						tf.render('pagesettings', data, safe.sure(cb,function(text, ctx) {
							self.emit('shown');
							$("body").append(text);
							$modal = $("#"+ctx.uniq).modal();
							$modal.on('frm-saved', function (evt,acc) {
								location.reload();
								self.emit('result','saved', acc)
							})
							$modal.on('hidden', function () {
								self.emit('result','closed')
							})
						}))
					}))
				},cb)
			})(function (err) {
				if (err) appError(err);
			})
		}
	}
	safe.inherits(modal,emit);
	return modal;
})
