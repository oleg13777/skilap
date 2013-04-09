var async = require("async");
var safe = require('safe');
var _ = require('underscore');
var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("MM/dd/yyyy");

module.exports = function priceeditor(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix;
	var ctx = webapp.ctx;
	
	app.get(prefix + "/priceeditor", safe.trap(function(req, res, next) {	
		if(req.xhr){				
			if(req.query.firstCurr && req.query.secondCurr){				
				cashapi.getPricesByPair(req.session.apiToken,{from:req.query.firstCurr,to:req.query.secondCurr},safe.trap_sure(next, function(prices) {
					_.forEach(prices, function (e) {
						e.fvalue = webapp.i18n_cmdtytext(req.session.apiToken,e.currency,e.value);
					});
					var paging,pagingPrices;
					var offset = parseInt(req.query.offset ? req.query.offset : 0);
					var limit = 10;
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
					_.forEach(pagingPrices,function(price){
						price.date = df.format(new Date(price.date));							
					});	
					firstPrice =_.first(prices);
					var lastRate;
					if(firstPrice)
						lastRate = firstPrice.value;
					res.partial(__dirname+"/../views/priceeditor_table",{
						prices:pagingPrices,
						firstCurr:req.query.firstCurr,
						secondCurr:req.query.secondCurr,
						currentDate:df.format(new Date()),
						lastRate:lastRate,
						paging:paging});
				}));			
			}
			else if(req.query.mode){
				var dateFormat = new DateFormat(DateFormat.W3C);
				var date = dateFormat.format(new Date(req.query.date));
				var cmdty = {space:"ISO4217",id:req.query.from};
				var currency = {space:"ISO4217",id:req.query.to};	
				price = {cmdty:cmdty,currency:currency,date:date,value:req.query.value,source:"edit"};
				if(req.query._id != 0){
					price._id = req.query._id;
				}							
				cashapi.savePrice(req.session.apiToken,price,safe.trap_sure(next, function(pricen) {
					pricen.date = df.format(new Date(pricen.date));
					res.partial(__dirname+"/../views/priceeditor_tr",pricen);
				}));				
			}
			else if(req.query.deleteId){
				cashapi.clearPrices(req.session.apiToken,[req.query.deleteId],safe.sure(next,function () {res.send({});}));
			}
			else if(req.query.redrawGraph) {
				cashapi.getPricesByPair(req.session.apiToken,{from:req.query.from,to:req.query.to},safe.trap_sure(next,function(prices){
					console.log(prices);
					var result={};
					result.data=[];
					_.forEach(prices,function(price){
						result.data.push([new Date(price.date).valueOf(),price.value]);						
					});	
					maxPrice = _.max(prices,function(price){
						return price.value;
					});
					result.max = maxPrice.value;
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
					settings:{views:__dirname+"/../views/"},
					prefix:prefix, 
					tabs:r[1], 						
					usedCurrencies:r[0].used,
					notUsedCurrencies:r[0].unused						
				};
				res.render(__dirname+"/../views/priceeditor", rdata);
			}));
		}		
	}));
}
