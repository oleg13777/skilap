var async = require("async");
var _ = require('underscore');
var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("MM/dd/yyyy");

module.exports = function priceeditor(webapp) {
	var app = webapp.web;
	var cashapi = webapp.api;
	var prefix = webapp.prefix
	var ctx = webapp.ctx;
	
	app.get(prefix + "/priceeditor", function(req, res, next) {	
		if(req.xhr){				
			if(req.query.firstCurr && req.query.secondCurr){				
				cashapi.getPricesByPair(req.session.apiToken,{from:req.query.firstCurr,to:req.query.secondCurr},function(err,prices){
					var paging,pagingPrices;
					var offset = req.query.offset ? req.query.offset : 0;
					var limit = 10;
					var len = prices.length;
					if(len > limit){
						pagingPrices = prices.slice(offset,offset+limit > len ? len : limit);
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
					res.partial(__dirname+"/../views/priceeditor/table",{
						prices:pagingPrices,
						firstCurr:req.query.firstCurr,
						secondCurr:req.query.secondCurr,
						currentDate:df.format(new Date()),
						lastRate:lastRate,
						paging:paging});
				});			
			}
			else if(req.query.mode){
				var dateFormat = new DateFormat(DateFormat.W3C);
				var date = dateFormat.format(new Date(req.query.date));
				var cmdty = {space:"ISO4217",id:req.query.from};
				var currency = {space:"ISO4217",id:req.query.to};	
				price = {cmdty:cmdty,currency:currency,date:date,value:req.query.value,source:"edit"};
				if(req.query.id != 0){
					price.id = req.query.id;
				}							
				cashapi.savePrice(req.session.apiToken,price,function(err,pricen){
					pricen.date = df.format(new Date(pricen.date));
					res.partial(__dirname+"/../views/priceeditor/pricetr",pricen);
				});				
			}
			else if(req.query.deleteId){
				cashapi.clearPrices(req.session.apiToken,[req.query.deleteId],function(err){
					var result={};
					if(err){
						result.error = 1;
					}
					res.send(result);
				});	
			}
			else if(req.query.redrawGraph){
				cashapi.getPricesByPair(req.session.apiToken,{from:req.query.from,to:req.query.to},function(err,prices){
					var result={};
					if(err){
						result.error = 1;
					}
					else{
						result.data=[];
						_.forEach(prices,function(price){
							result.data.push([new Date(price.date).valueOf(),price.value])							
						});	
						maxPrice = _.max(prices,function(price){
							return price.value;
						});
						result.max = maxPrice.value;
						
					}
					res.send(result);
				});
			}
			
		}
		else{
			async.series([
				function (cb) { 
					webapp.getUseRangedCurrencies(req.session.apiToken,cb)
				},
				function(cb){
					webapp.guessTab(req, {pid:'priceeditor',name:ctx.i18n(req.session.apiToken, 'cash', 'Rate Currency Editor'), url:req.url}, cb);
				}
			], function render (err,r) {	
				console.log(r[0]);																
				if (err) return next(err);
				var rdata = {
					settings:{views:__dirname+"/../views/"},
					prefix:prefix, 
					tabs:r[1], 						
					token: req.session.apiToken,
					usedCurrencies:r[0].used,
					notUsedCurrencies:r[0].unused						
				};
				res.render(__dirname+"/../views/priceeditor", rdata);
			});
		}		
	});
}
