var Mocha = require('mocha');
var path = require('path');
var tutils = require('./test/utils.js')
var argv = require('optimist')
    .default('db', "tingodb")
    .default('browser', "firefox")    
    .default('silent',true)
    .argv

tutils.setConfig({
	db:argv.db,
	browser:argv.browser,
	silent:argv.silent
})

var mocha = new Mocha({
	reporter:"spec",
	bailout:true
});
mocha.addFile(path.join("./test/core-test.js"));
mocha.addFile(path.join("./test/cash-test.js"));
mocha.addFile(path.join("./test/cash-registry-test.js"));
mocha.addFile(path.join("./test/cash-reports-test.js"));

// Now, you can run the tests.
mocha.run(function(failures){
  process.exit(failures);
});
