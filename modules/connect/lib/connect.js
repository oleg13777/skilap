var fs = require('fs');

exports.middleware = {};

/**
 * Auto-load bundled middleware with getters.
 */

fs.readdirSync(__dirname + '/middleware').forEach(function(filename){
  if (/\.js$/.test(filename)) {
    var name = filename.substr(0, filename.lastIndexOf('.'));
    exports.middleware.__defineGetter__(name, function(){
      return require('./middleware/' + name);
    });
  }
});

// expose utils
exports.utils = require('./utils');

// expose getters as first-class exports
exports.utils.merge(exports, exports.middleware);

