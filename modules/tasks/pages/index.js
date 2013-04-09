var async = require("async");
var safe = require("safe");
var _ = require('underscore');

module.exports = function account(webapp) {
	var app = webapp.web;
	var tasksapi = webapp.api;
	var prefix = webapp.prefix
	
	var responseHandler = function(req, res, next, tplName){
		var task;
		async.series([
			function (cb) {
				if (req.body.id) {
					tasksapi.getTask(req.session.apiToken, req.body.id, safe.sure_result(function (data) {
						task = data;
					}))
				}
				else {
					cb();
				}
			},
		], function (err,r) {
			if (err) return next(err);
			var rdata = {
					prefix:prefix,
					task:task,
					host:req.headers.host
				};
			res.render(__dirname+"/../views/"+tplName, rdata);
		});
	};
	
	app.get(prefix+"/create",  function(req, res, next) {
		responseHandler(req,res,next,'task-create');
	});
	
	app.get(prefix+"/delete",  function(req, res, next) {
		responseHandler(req,res,next,'task-delete');
	});
	
	app.post(prefix+"/delete", function(req, res, next) {
		tasksapi.deleteTask(req.session.apiToken, req.body.id, function (err) {
			if (err) return next(err);
			res.send({id:req.body.id});
		})
	});		

	app.post(prefix+"/update", function(req, res, next) {
		var task = {};
		task._id = req.body.id;
		task.name = req.body.name;
		task.status = req.body.status;
		task.description = req.body.description;
		task.repeat = req.body.repeat;
		task.dt=new Date(req.body.dt);
		tasksapi.saveTask(req.session.apiToken, task, function (err, task) {
			if (err) return next(err);
			res.send(task);
		})
	});	

	app.get(prefix, function(req, res, next) {
		var data;
		var tasks = [];
		var types = [];
		async.waterfall([
			function (cb) { 
				tasksapi.getAllTasks(req.session.apiToken, safe.sure_result(cb, function (res) {
					_.each(res, function(item) {
						if (item.status != 'resolved') {
							item.to_resolve = true;
						}
						else {
							item.to_resolve = false;
						}
					})
					tasks = res;
				}))
				
			},
			//function (cb) { webapp.guessTab(req, {pid:'main',name:webapp.ctx.i18n(req.session.apiToken, 'tasks','Main'),url:req.url}, cb) },
			function render (vtabs) {
				var rdata = {
					prefix: prefix,
					token: req.session.apiToken,
					host: req.headers.host,
					tasks: tasks
				};
				res.render(__dirname+"/../views/index", rdata);
			}],
			next
		);
	});
}
