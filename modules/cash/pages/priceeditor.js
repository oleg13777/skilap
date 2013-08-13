var async = require("async");
var safe = require('safe');
var _ = require('underscore');

module.exports = function priceeditor(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;
	
	app.get(prefix + "/priceeditor", webapp.layout(), safe.trap(function(req, res, next) {	
		if(req.xhr){	
			if(req.query.firstCurr && req.query.secondCurr){				
				cashapi.getPricesByPair(req.session.apiToken,{from:req.query.firstCurr,to:req.query.secondCurr},safe.trap_sure(next, function(prices) {
					_.forEach(prices, function (e) {
						e.fvalue = webapp.i18n_cmdtytext(req.session.apiToken,e.currency,e.value);
					});
					var paging,pagingPrices;
					var offset = parseInt(req.query.offset ? req.query.offset : 0);
					var limit = 25;
					var len = prices.length;
					if(len > limit){
						pagingPrices = prices.slice(offset,offset + Math.min(limit,len));
						currentPageIndex = Math.ceil(offset/limit)+1;						
						pages = _.range(1,Math.ceil(len/limit)+1);
						paging = [];
						_.forEach(pages,function(index){
							pagingItem = {num:index,offset: (index-1)*limit};
							if(currentPageIndex == index){
								pagingItem.active = 1;
							}
							paging.push(pagingItem);
						});
					}
					else{
						pagingPrices = prices;
					}
					firstPrice =_.first(prices);
					var lastRate;
					if(firstPrice)
						lastRate = firstPrice.value;
					res.render(__dirname+"/../res/views/priceeditor_table",{
						layout:false,
						prices:pagingPrices,
						firstCurr:req.query.firstCurr,
						secondCurr:req.query.secondCurr,
						lastRate:lastRate,
						paging:paging});
				}));			
			}
			else if(req.query.redrawGraph) {
				cashapi.getPricesByPair(req.session.apiToken,{from:req.query.from,to:req.query.to},safe.trap_sure(next,function(prices){
					var result={};
					result.data=[];
					_.forEach(prices,function(price){
						result.data.push([new Date(price.date).valueOf(),price.value]);						
					});	
					maxPrice = _.max(prices,function(price){
						return price.value;
					});
					result.max = maxPrice;
					res.send(result);
				}));
			}
			
		}
		else{
			async.series([
				function (cb) { 
					webapp.getUseRangedCurrencies(req.session.apiToken,cb);
				},
				function(cb){
					webapp.guessTab(req, {pid:'priceeditor',name:ctx.i18n(req.session.apiToken, 'cash', 'Rate Currency Editor'), url:req.url}, cb);
				}
			], safe.trap_sure(next, function render (r) {	
				var rdata = {
					settings:{views:__dirname+"/../res/views/"},
					prefix:prefix, 
					tabs:r[1], 						
					usedCurrencies:r[0].used,
					notUsedCurrencies:r[0].unused						
				};
				res.render(__dirname+"/../res/views/priceeditor", rdata);
			}));
		}		
	}));
}
