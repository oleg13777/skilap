/**
 * Module dependencies.
 */
var fs = require("fs");
var DateFormat = require('dateformatjs').DateFormat;
var df = new DateFormat("yyyy.MM.dd");
var sprintf = require('sprintf').sprintf;

var express = require('express');
var _ = require('underscore');
var cashapi = require('./cashapi');


var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'mustache');
  app.register(".mustache", require('stache'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

app.get('/', function(req, res){
        var t = [];
        cashapi.getAllAccounts(function (accounts) {
                _.forEach(accounts,(function (e) {
                        var value = cashapi.getAccountInfo(e.id,["value"]).value;
                        value = Math.round(value * 100)/100;
                        if (e.type != "EXPENSE" && e.type!= "INCOME" && value!=0)
                                t.push({name:e.name,value:value,ahref:"account?id="+e.id});
                }));

           res.render("index", {
                locals: {
                  accounts: t
                },
                partials: {
                }
          });
        });
});

app.get('/account', function(req, res) {
        var t = [];
        var idx=0,c=0;
        var pageSize = 20;
        var count = cashapi.getAccountInfo(req.query.id,["count"]).count+1;
        var firstVisible = Math.max(0, count-pageSize);
        var scrollGap = pageSize*5;
        var firstDelivered = Math.max(0, count-pageSize-scrollGap);

   res.render("account", {
    locals: {
//              transactions: t,
                accountId:req.query.id,
                accountSize:count,
                firstVisible:firstVisible,
                pageSize:pageSize,
                scrollGap:scrollGap
    },
    partials: {
    }
  });

});


app.post('/account/:id/updatecell', function(req, res) {
        cashapi.getTransaction(req.body.id, function (tr) {
                if (req.body.columnId == 5 || req.body.columnId == 6) {
                        var newVal = eval(req.body.value);
                        if (req.body.columnId == 6)
                                newVal *= -1;
                        var newTr = {id:tr.id,splits:[]};
                        tr.splits.forEach(function(split) {
                                if (split.accountId == req.params.id)
                                        newTr.splits.push({id:split.id,value:newVal})
                                else
                                        newTr.splits.push({id:split.id,value:newVal*-1})
                        });
                        cashapi.saveTransaction(newTr);
                } else if (req.body.columnId == 4 ) {
                        var newAccId = cashapi.getAccountByPath(req.body.value);
                        if (newAccId!=null) {
                                var newTr = {id:tr.id,splits:[]};
                                tr.splits.forEach(function(split) {
                                        if (split.accountId != req.params.id)
                                                newTr.splits.push({id:split.id,accountId:newAccountId})
                                });
                        }
                        cashapi.saveTransaction(newTr);
                } else if (req.body.columnId == 3 ) {
                        var newTr = {id:tr.id,description:req.body.value};
                        cashapi.saveTransaction(newTr);
                } else if (req.body.columnId == 2 ) {
                        var newDate = new Date(req.body.value);
                        var newTr = {id:tr.id,dateEntered:newDate,datePosted:newDate};
                        cashapi.saveTransaction(newTr);
                }

                res.send(req.body.value);
        });
});

app.get('/account/:id/getaccounts', function(req, res) {
                var tmp = [];
                _.forEach(cashapi.getAllAccounts(), function (acc) {
                        var path = cashapi.getAccountInfo(acc.id, ["path"]).path;
                        if (path.search(req.query.term)!=-1)
                                tmp.push(path);
                });
                res.send(tmp);
});

app.get('/account/:id/getdesc', function(req, res) {
                var tmp = [];
                _.forEach(cashapi.getAccountRegister(req.params.id,0,null), function (trs) {
                        tr = cashapi.getTransaction(trs.id);
                        if (tr.description.search(req.query.term)!=-1)
                                tmp.push(tr.description);
                });
                res.send(tmp);
});

app.get('/account/table/:id?', function(req, res) {
        console.time("getAccountData");
        var data = {sEcho:req.query.sEcho,iTotalRecords:0,iTotalDisplayRecords:0,aaData:[]};
        var idx=Math.max(req.query.iDisplayStart,0); var c = 0;
        var count = cashapi.getAccountInfo(req.params.id,["count"]).count;
        var limit = Math.min(count-idx,req.query.iDisplayLength);
        var register = cashapi.getAccountRegister(req.params.id,idx,limit);
        c = register.length;
        _.forEach(register, function (trs) {
                cashapi.getTransaction(trs.id,function (tr) {
                        c--;
                        var recv = trs.recv;
                        var send = trs.send;
                        var dp = new Date(tr.dateEntered);
                        data.aaData.push([tr.id,idx+1,df.format(dp),tr.description,
                                recv.length==1?cashapi.getAccountInfo(recv[0].accountId,["path"]).path:"Multiple",
                                send.value>0?sprintf("%.2f",send.value):null,
                                send.value<=0?sprintf("%.2f",send.value*-1):null,
                                sprintf("%.2f",trs.ballance)]);
                        if (c==0) {
                                console.log({idx:idx,total:count});
                                if (idx==count) {
                                        data.aaData.push(["new",idx+1,df.format(new Date()),"",null,null,null,sprintf("%.2f",trs.ballance)]);
                                }
                                data.iTotalRecords = count+1;
                                data.iTotalDisplayRecords = count+1;
                                console.timeEnd("getAccountData");
                                res.send(data);
                        }
                });
        });
});


app.listen(1337);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
