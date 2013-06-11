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
						"currencies":{
							"cmd":"api",
							"prm":["cash.getAllCurrencies"],
							"res":{"a":"store","v":"currencies"}
						},
						"currency":{
							"cmd":"api",
							"prm":["cash.getSettings","currency",null],
							"res":{"a":"store","v":"currency"}
						},
						"checkRate":{
							"cmd":"api",
							"prm":["cash.getSettings","checkRate",false],
							"res":{"a":"store","v":"checkRate"}
						}							
					}				
					api.batch(batch, safe.sure(cb, function (data) {									
						tf.render('settings', data, safe.sure(cb,function(text, ctx) {
							self.emit('shown');
							$("body").append(text);
							$modal = $("#"+ctx.uniq).modal();
							$modal.on('frm-saved', function (evt,acc) {
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
