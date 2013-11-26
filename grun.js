module.exports = function(grunt) {
	"use strict";

	var	fs = require('fs'),
		_ = require('lodash'),
		uglyfiles = {},
		cashmustache = {},
		coremustache = {},
		relisets = new Date().valueOf().toString();

	(function (uglyfiles) {
		_.each(["public/js", "modules/cash/public/js", "modules/core/public/js"], function (dir) {
			_.each(fs.readdirSync(dir), function (file) {
				if (file.indexOf(".js") !== -1) {
					if (file.indexOf("app.js") !== -1)
						file = file.replace("app.js", "app-" + relisets + ".js"); // synk with buildapp!!!

					uglyfiles[dir + "/" + file] = dir + "/" + file;
				}
			});
		});
	})(uglyfiles);

	(function (mustachefiles) {
		var dir = "modules/cash/res/views";
		_.each(_.sortBy(fs.readdirSync(dir)), function (file) {
			if (file.indexOf("sitemap") !== -1)
				return;

			if (file.indexOf(".mustache") !== -1)
				mustachefiles[dir + "/" + file] = dir + "/" + file;
		});
	})(cashmustache);

	(function (mustachefiles) {
		var dir = "modules/core/res/views";
		_.each(_.sortBy(fs.readdirSync(dir)), function (file) {
			if (file.indexOf("sitemap") !== -1)
				return;

			if (file.indexOf(".mustache") !== -1)
				mustachefiles[dir + "/" + file] = dir + "/" + file;
		});
	})(coremustache);

	var req_jslibs = {
		"jquery":						"./public/js/jquery"
		, "jquery-block": 				"./public/js/jquery.blockUI"
		, "jquery-mousewheel": 			"./public/js/jquery.mousewheel"
		, "bootstrap": 					"./public/js/bootstrap"
		, "bootstrap-typeahead": 		"./public/js/bootstrap-typeahead"
		, "bootstrap-datepicker-core": 	"./public/js/bootstrap-datepicker"
		, "moment": 					"./public/js/moment/moment"
		, "handlebars.runtime":			"./public/js/handlebars.runtime"
		, "lodash":						"./public/js/lodash"
		, "async":						"./public/js/async"
		, "safe":						"./public/js/safe"
		, "jsonrpc":					"./public/js/jsonrpc"
		, "text":						"./public/js/text"
		, "json":						"./public/js/json"
		, "clitpl":						"./public/js/clitpl"
		, "currency": 					"./public/js/currency"
		, "eventemitter2":				"./public/js/eventemitter2"
		, "edit-account-modal":			"./modules/cash/public/js/edit-account-modal"
		, "delete-account-modal":		"./modules/cash/public/js/delete-account-modal"
		, "pagesettings":				"./modules/cash/public/js/pagesettings"
		, "reportsettings":				"./modules/cash/public/js/reportsettings"
		, "settings-modal":				"./modules/cash/public/js/settings-modal"
	};

	grunt.initConfig({
		requirejs: {
			/* share */
			options: {
				paths:req_jslibs,
				shim:{
					"bootstrap": { deps:["jquery"] },
					"bootstrap-datepicker-core": { deps:["bootstrap"] },
					"bootstrap-typeahead": { deps:["bootstrap","lodash"] },
					"jquery-block": { deps:["jquery"] },
					"jquery-mousewheel": { deps:["jquery"] }
				},
				optimize: "none"
			},
			/* cash */
			cash: {
				options: {
					include:[
						"jquery"
						, "jquery-block"
						, "jquery-mousewheel"
						, "bootstrap"
						, "bootstrap-typeahead"
						, "bootstrap-datepicker-core"
						, "moment"
						, "handlebars.runtime"
						, "lodash"
						, "async"
						, "safe"
						, "jsonrpc"
						, "text"
						, "json"
						, "clitpl"
						, "currency"
						, "eventemitter2"
						, "edit-account-modal"
						, "delete-account-modal"
						, "pagesettings"
						, "reportsettings"
						, "settings-modal"
					],
					out: "./modules/cash/public/js/main.js"
				}
			},
			/* core */
			core: {
				options: {
					include:[
						"jquery"
						, "jquery-block"
						, "bootstrap"
						, "moment"
						, "handlebars.runtime"
						, "lodash"
						, "async"
						, "safe"
						, "jsonrpc"
						, "text"
						, "json"
						, "clitpl"
						, "currency"
					],
					out: "./modules/core/public/js/main.js"
				}
			}
		},
		buildapp: {},
		cutmustache:{},
		uglify: {
			all: {
				files: uglyfiles,
				options: {
					preserveComments: false,
					beautify: {
						ascii_only: false,
						quote_keys: true
					},
					compress: {
						hoist_funs: true,
						join_vars: true,
						loops: true,
						conditionals: true,
						if_return: true,
						unused: true,
						comparisons: true
					},
					report: "min",
					mangle: {
						except: [ "undefined" ]
					}
				}
			}
		},
		/*htmlcompressor: {
			options: {
				type: 'html',
				removeStyleAttr: true,
				removeLinkAttr: true,
				removeScriptAttr: true,
				removeSurroundingSpaces: "all",
				removeIntertagSpaces: true
			},
			core: {
				files: coremustache
			},
			cash: {
				files: cashmustache
			}
		},*/
		pngmin: {
			compile: {
				files: [
					{src:'modules/core/public/img/*.png',dest:'modules/core/public/img/'},
					{src:'modules/cash/public/img/*.png',dest:'modules/cash/public/img/'}
				],
				options: {
					binary: 'pngquant',
					concurrency: 2,
					colors: 256,
					ext: '.png',
					force: true,
					quality: 100,
					speed: 3,
					iebug: false
				}
			}
		},
		smushit: {
			img: {
				src:['modules/core/public/img/*.png', 'modules/cash/public/img/*.png']
			}
		}
	});

	grunt.registerTask("buildapp", function() {
		try {
			_.each(["core", "cash"], function(folder) {
				var	file = "./modules/" + folder + "/public/js/app.js",
					main = grunt.file.read("./modules/" + folder + "/public/js/main.js"),
					contents = grunt.file.read(file);
				contents = contents.replace(/cutstart[\s\S\w.*]+cutend/gmi,"");
				contents += "\n" + main;
				var newfile = file.replace("app.js", "app-" + relisets + ".js"); // synk with uglyfiles!!!
				grunt.file.write(newfile, contents);
				grunt.file.delete(file, {force: true});
				grunt.log.writeln('✔ '.green + newfile);
			});
		} catch (err) {
			grunt.log.writeln(err);
		}
	});

	grunt.registerTask("cutmustache", function() {
		try {
			_.each(["core", "cash"], function(folder) {
				_.each(fs.readdirSync("./modules/" + folder + "/res/views"), function(file) {
					file = "./modules/" + folder + "/res/views/" + file;
					var contents = grunt.file.read(file);
					contents = contents.replace("{{relisets}}","-" + relisets).replace(/>\s+</gmi,">\n<").replace(/^\s+/gmi,"").replace(/\t+/gmi," ");
					grunt.file.write(file, contents);
				});
				grunt.log.writeln('✔ '.green + "./modules/" + folder + "/res/views/*");
			});
		} catch (err) {
			grunt.log.writeln(err);
		}
	});

	grunt.loadNpmTasks('grunt-contrib-requirejs');
	grunt.loadNpmTasks("grunt-contrib-uglify");
	//grunt.loadNpmTasks('grunt-htmlcompressor');
	grunt.loadNpmTasks('grunt-smushit');
	grunt.loadNpmTasks('grunt-pngmin');

	grunt.registerTask('default', ['requirejs','buildapp','uglify','cutmustache'/*,'htmlcompressor'*/,'smushit']);
}
