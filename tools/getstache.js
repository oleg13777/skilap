var fs = require("fs");
var _ = require("underscore");

var folder = process.argv[2];

fs.stat(folder, function (err) {
	if (!err) {
		_.forEach(fs.readdirSync(folder), function (file) {
			var f = file.match(/(.*)\.mustache$/);
			if (f) {
				var c = ""+fs.readFileSync(folder+file);
				var m = c.match(/{{#i18n}}([^{]*){{\/i18n}}/gm);
				if (m) {
					_.forEach(m, function (s) {
						var t = s.match(/{{#i18n}}([^{]*){{\/i18n}}/);
						console.log(f[1]+".i18n(f[1],i,\""+t[1]+"\");");
					})
				}
			}
		})
	}
})
