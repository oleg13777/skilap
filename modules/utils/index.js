var mongo = require('mongodb');
var _ = require('lodash');
var url = require('url');

module.exports.ApiError = module.exports.SkilapError = require('./ApiError')
module.exports.handlebarsEngine = require('./handlebarsres').handlebarsEngine;
module.exports.handlebarsMiddleware = require('./handlebarsres').handlebarsMiddleware;
module.exports.safeGet = function (obj,defres) {
	var i=2; var p = obj;
	for (;i<arguments.length;i++) {
		if (arguments[i] == undefined) 
			break;
		p=p[arguments[i].toString()];
		if (!p)
			break;
	}
	if (p != undefined && i==arguments.length)
		return p;
	else
		return defres;
}

module.exports.currency = require("./currency")

function datafix(obj) {
	_.forEach(_.keys(obj), function (k) {
		var v = obj[k];
		var prefix = null;
		if (k.length>2)
			prefix = k.substr(0,3);
		var translate = {
			"_id": function () {
				try { return new mongo.ObjectID(v.toString()) }
					catch (e) {};
			},
			"_i_": function () {
				return parseInt(v);
			},			
			"_dt":function () {
				return new Date(v);
			}
		}
		if (prefix && translate[prefix]) {
			nv = translate[prefix](v);
			if (nv != undefined)
				obj[k]=nv;
			else
				delete obj[k];
		} else {
			if (_.isObject(v))
				datafix(v)
			else if (_.isArray(v)) {
				_.each(v, function (vv) {
					datafix(vv)
				})
			}
		}
	})
	return obj;
}
module.exports.prefixify = datafix;

module.exports._wrapTypes = function(obj) {
	var self = this;
	_.each(obj, function (v,k) {
		if (_.isDate(v))
			obj[k] = {$wrap:"$date",v:v}
		else if (_.isObject(v))
			self._wrapTypes(v)
	})
	return obj;
}

module.exports._unwrapTypes = function(obj) {
	var self = this;
	_.each(obj, function (v,k) {
		if (_.isObject(v)) {
			switch (v.$wrap) {
				case "$date": obj[k] = new Date(v.v); break;
				default: self._unwrapTypes(v);
			}
		}
	})
	return obj;
}

var send = require('send')
module.exports.vstatic = function vstatic(root, options){
  options = options || {};

  // root required
  if (!root) throw new Error('static() root path required');
  options.root = root;

  return function vstatic(req, res, next) {
    if ('GET' != req.method && 'HEAD' != req.method) return next();

	if (req.url.indexOf(options.vpath)!=0)
		return next() // do nothing if path not start from vptah

	function directory() {
		var pathname = url.parse(req.originalUrl).pathname;
		res.statusCode = 301;
		res.setHeader('Location', pathname + '/');
		res.end('Redirecting to ' + utils.escape(pathname) + '/');
	}

	function error(err) {
		if (404 == err.status) return next();
		next(err);
	}

    send(req, req.url.slice(options.vpath.length))
      .maxage(options.maxAge || 0)
      .root(root)
      .hidden(options.hidden)
      .on('error', error)
      .on('directory', directory)
      .pipe(res);      
  }
}
