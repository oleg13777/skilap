(function () {

var safe={};
	
safe.result = function (callback,fn) {
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		
		var result = fn.apply(this, arguments);
		if (result != undefined)
			callback(null, result);
		else
			callback(null);
	}
}

safe.sure = function (callback,fn) {
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		if (arguments[0])
			callback(arguments[0])
		else
			fn.apply(this, Array.prototype.slice.call(arguments,1));
	}
}

safe.trap = function (callback,fn) {
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		try {
			fn.apply(this, arguments);
		}
		catch (err) {
			callback(err);
		}
	}
}

safe.run = function (fn,cb) {
	return fn.apply(this, [cb])
}

safe.empty = function () {};

safe.nothing = function () {
	callback = arguments[arguments.length-1];
	callback();
}

safe.trap_sure = function (callback,fn) {
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		if (arguments[0])
			return callback(arguments[0])
		try {
			fn.apply(this, Array.prototype.slice.call(arguments,1));
		}
		catch (err) {
			callback(err);
		}
	}	
}

safe.trap_sure_result = function (callback, fn) {
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		if (arguments[0])
			return callback(arguments[0])
		var result;
		try {
			result = fn.apply(this, Array.prototype.slice.call(arguments,1));
		}
		catch (err) {
			return callback(err);
		}
		if (result != undefined)
			callback(null, result);
		else
			callback(null);
	}	
}

safe.sure_result = function (callback,fn) {
	return function () {
		if (fn == undefined) {
			fn = callback;
			callback = arguments[arguments.length-1];
		}
		if (arguments[0])
			return callback(arguments[0])
		var result = fn.apply(this, Array.prototype.slice.call(arguments,1));
		if (result != undefined)
			callback(null, result);
		else
			callback(null);
	}	
}

if (typeof module !== 'undefined' && module.exports)
	// commonjs module
	module.exports = safe;
else if (typeof define !== 'undefined' && define.amd )
	// AMD module
	define([],function () {
		return safe;
	})
else
	// finally old school 
	this.safe =safe;

})();
