var hogan = require('hogan.js');
var handlebars = require('handlebars');
var fs = require("fs");
var path = require("path");
var _ = require('lodash');
var safe = require('safe');
var async = require('async');
var url = require('url');

// kind of helper for integration debug
function _log(options, key, val, type) {
	if(options.debug || type === 'error') {
		switch(type) {
			case 'log':
			case 'info':
			case 'error':
			case 'warn':
				break;
			default:
			type = 'log';
		}
		console[type]('  \033[90m%s :\033[0m \033[36m%s\033[0m', key, val);
	}
};


function ensureTemplate (sourceFile, options, cb) {	
	var log = function (key, val, type) {
		_log(options,key,val,type);
	}
	var template = null;
	// base will be used as base for relative paths for partials
	var base = path.resolve(path.dirname(sourceFile));	
	// partials and layout have to use same extentsion
	var ext = path.extname(sourceFile);
	var dst = base; // store caches right where sources are located
	
	if (options.dest) {
		// but better store them to public die for client reuse
		if (options.dest[0]='.')
			// dest can be relative
			dst = path.resolve(base,options.dest)
		else
			// or absolute
			dst = options.dest;
	}
	
	log("base",base);
	log("dest",dst);
	
	var layout = options.layout?options.layout:"";
	var tn = path.basename(sourceFile,ext)+(layout?"_"+layout:"");
	
	var st = layout || tn;
	var scans = {};
	var cscans = {};
	var dirty = false;
	var rc = 0;
	var debug = true;
	
	function getPartials(files,cb) {
		var partials = [];	
		// limit possible partials recursion
		rc++; if (rc>10) return cb(new Error("Hogan thinks that partials recursion detected"));
		async.forEach(files, function (file,cb) {
			var ofile = file;
			// very special kase for layout and its partial meaning
			if (file=="content")
				file = path.basename(sourceFile,ext);
			async.waterfall([
				function touchFile(cb) {
					var rfile = path.resolve(base,file+".mustache");
					fs.stat(rfile, function (err, sta) {
						if (err || !sta.isFile())
							return cb(new Error("Can't find template: " + rfile))
						else 
							cb(null,sta, rfile);
					})
				},
				function read(sta, tfile, cb) {
					var cscan = cscans[ofile];
					if (!cscan || cscan.mt<sta.mtime.valueOf()) {						
						log("refreshing",ofile);
						// do actual compile
						fs.readFile(tfile,safe.sure(cb, function (content) {							
							var ttext = content.toString();
							var scan = hogan.scan(ttext);
							var partials = _(scan)
								.filter(function(item) { return item.tag == '>'; })
								.map(function(item) { return item.n.replace(' this',''); })
								.without(file)
							.value();						
							var tpl = handlebars.precompile(ttext);														
							scans[ofile]={p:ofile,tf:tpl,mt:sta.mtime.valueOf(),pt:partials};							
							dirty = true;
							cb(null,partials);
						}))
					} else {
						// or use cached
						scans[ofile]=cscans[ofile];
						cb(null,scans[ofile].pt);
					}
				}], 
			safe.sure(cb, function (fpartials) {
				partials = _.union(partials, fpartials);
				cb();
			}))
		}, safe.sure(cb, function () {
			if (partials.length)
				getPartials(partials, cb);
			else 
				cb(null);
		}))
	}	
	fs.readFile(path.resolve(dst,tn+".js"), function(err, cs) {
		if (!err) {
			cscans = JSON.parse(cs);
			// ensure that cached template is of coreect version
			if (!cscans.hogan || cscans.hogan.v<3)
				cscans = {};
		}
		getPartials([st], safe.sure(cb, function () {
			scans.hogan={v:4,st:st};			
			if (!dirty) {
				cb(null,scans);
			} else {				
				var tpath = path.resolve(dst,tn+".js");
				fs.writeFile(tpath,JSON.stringify(scans),safe.sure(cb, function () {
					log("store",tpath); 
					cb(null, scans);			
				}))
			}
		}));
	})
}

module.exports.handlebarsMiddleware = function (options) {	
	var regex = {
		handle: /\.js$/,
		compress: /(\.|-)min\.js$/
	};

	var log = function (key, val, type) {
		_log(options,key,val,type);
	}

	options = options || {};	
	
	// Once option
	options.once = options.once || false;

	// Source dir required
	var src = options.src;
	if (!src) { throw new Error('handlebarsMiddleware() requires "src" directory'); }	
	
	// Default dest dir to source
	var dest = options.dest ? options.dest : src;	
 	
	return function (req, res, next) {	
		if ('GET' != req.method.toUpperCase() && 'HEAD' != req.method.toUpperCase()) { return next(); }

		var pathname = url.parse(req.url).pathname;
		// Only handle the matching files
		if (regex.handle.test(pathname) && (!options.prefix || 0 === pathname.indexOf(options.prefix))) {			
			log("match", pathname);			
			if (options.prefix)
				pathname = pathname.substring(options.prefix.length);
			var tpath = path.resolve(src,pathname)
			log("serving", tpath);
			ensureTemplate(tpath,{layout:false,debug:options.debug,dest:dest},safe.sure(next, function () {
					next();
			}))
		} else next();
	}
}

module.exports.handlebarsEngine = function (Handlebars,opts) {
	return function (sourceFile, options, cb) {
		ensureTemplate(sourceFile,{layout:options.layout,debug:opts.debug,dest:opts.dest}, safe.sure(cb, function (scans) {
			var templates = {};			
			_.forEach(scans, function (scan) {
				if (scan.v) return;
				
				templates[scan.p] = new Handlebars.template(eval("("+scan.tf+")"));					
			})				
			Handlebars.partials = templates;			
			var html = templates[scans.hogan.st](options);
			cb(null, html);
		}))
	}
}
