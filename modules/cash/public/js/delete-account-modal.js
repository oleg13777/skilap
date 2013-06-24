define(["jquery","eventemitter2","safe", "jquery-block","bootstrap"], function ($,emit,safe) {
	var modal = function () {
		var self = this;
		var $modal = null;
		this.getAccount = function (id,det,cb) {
			require(['api'], function (api) {
				var batch = {
					"settings":{						
						"cmd":"api",
						"prm":["cash.web_getTabSettings", "accounts-tree"],
						"res":{"a":"store","v":"settings"}
					},					
				}
				api.batch(batch, safe.sure(cb, function (res) {
					var batch = {
							"account":{
								"cmd":"api",
								"prm":["cash.getAccountTree",id,res.settings,det],
								"res":{"a":"store","v":"accounts"}
							}
						}
						api.batch(batch, safe.sure(cb, function (res) {
							cb(null,res);
						}))	
				}))	
			},cb)		
		}
		this.hide = function () {
			if ($modal)
				$modal.modal('hide')
		}
		this.show = function(id) {
			(function (cb) {
				require(['api','clitpl','lodash'], function (api,tf,_) {
					var batch = {
						"accounts":{
							"cmd":"api",
							"prm":["cash.getAllAccounts"],
							"res":{"a":"store","v":"accounts"}
						},
						"info":{
							"dep":"accounts",
							"cmd":"api",
							"ctx":{"a":"each","v":"accounts"},
							"prm":["cash.getAccountInfo","_id",["path"]],
							"res":{"a":"merge"}
						},
						"assetTypes":{
							"cmd":"api",
							"prm":["cash.getAssetsTypes"],
							"res":{"a":"store","v":"assetsTypes"}
						},
						"currencies":{
							"cmd":"api",
							"prm":["cash.getAllCurrencies"],
							"res":{"a":"store","v":"currencies"}
						}
					}
					if (id) {
						batch.account={
							"cmd":"api",
							"prm":["cash.getAccount",id],
							"res":{"a":"store","v":"account"}
						}	
						batch.ainfo={
							"dep":"account",
							"cmd":"api",
							"prm":["cash.getAccountInfo",id,['path']],
							"res":{"a":"merge","o":"account"}
						}
					}	
					api.batch(batch, safe.sure(cb, function (data) {
						data.accounts = _.sortBy(data.accounts,function (e) { return e.path.toLowerCase(); });
						tf.render('account-delete', data, safe.sure(cb,function(text, ctx) {
							self.emit('shown');
							$("body").append(text);
							$modal = $("#"+ctx.uniq).modal();
							$modal.on('frm-saved', function (evt,acc) {
								self.emit('result','deleted', acc)
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
