var skilap = require('./skilap-core');

var sapp = skilap.createApp();
sapp.startApp(function () {
	sapp.getModule("cashapi", function (err, result) { 
		cashapi = result; 
	});
})
