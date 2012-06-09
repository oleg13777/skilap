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
					_.forEach(prices,function(price){
						price.date = df.format(new Date(price.date));							
					});
					res.partial(__dirname+"/../views/priceeditor/table",{prices:prices,firstCurr:req.query.firstCurr,secondCurr:req.query.secondCurr});
				});			
			}
			else if(req.query.mode){
				var dateFormat = new DateFormat(DateFormat.W3C);
				var date = dateFormat.format(new Date(req.query.date));
				var cmdty = {space:"ISO4217",id:req.query.from};
				var currency = {space:"ISO4217",id:req.query.to};	
				price = {cmdty:cmdty,currency:currency,date:date,value:req.query.value};
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
						res.error = 1;
					}
					res.send(result);
				});	
			}
			
		}
		else{
			async.waterfall([
				function(cb){
					async.parallel({
						currencies:function (cb1) {				
							ctx.i18n_getCurrencies(req.session.apiToken, cb1);
						},
						vtabs:function (cb1) {				
							webapp.guessTab(req, {pid:'priceeditor',name:ctx.i18n(req.session.apiToken, 'cash', 'Rate Currency Editor'), url:req.url}, cb1);
						},
					},function (err, results) {										
						cb(err, results.currencies,results.vtabs);
					});
				},						
				function render (currencies,vtabs) {
					//console.log(currencies);												
					var rdata = {
							settings:{views:__dirname+"/../views/"},
							prefix:prefix, 
							tabs:vtabs, 						
							token: req.session.apiToken,
							currencies:currencies						
						};
					res.render(__dirname+"/../views/priceeditor", rdata);
				}],
				next
				
			);
		}		
	});
}
