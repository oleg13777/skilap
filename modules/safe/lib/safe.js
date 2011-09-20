function result (fn,callback) {
	return function () {
		// no callback specified, assume it is last paramaeter of function call
		if (callback == undefined)
			callback = arguments[arguments.length-1];
		else 
			{ var tmp; tmp = callback; callback = fn; fn = tmp }
		
		var result = fn.apply(this, arguments);
		callback(null,result);
	}
}


function sure (fn,callback) {
	return function () {
		// no callback specified, assume it is last paramaeter of function call
		if (callback == undefined)
			callback = arguments[arguments.length-1];
		else 
			{ var tmp; tmp = callback; callback = fn; fn = tmp }
		if (arguments[0])
			callback(arguments[0])
		else
			fn.apply(this, Array.prototype.slice.call(arguments,1));
	}
}

function trap (fn,callback) {
	return function () {
		try {
			// no callback specified, assume it is last paramaeter of function call
			if (callback == undefined)
				callback = arguments[arguments.length-1];
			else 
				{ var tmp; tmp = callback; callback = fn; fn = tmp }
			fn.apply(this, arguments);
		}
		catch (err) {
			callback(err);
		}
	}
}

module.exports.trap_sure = function (fn, callback) {
    return trap(sure(fn,callback));
}

module.exports.trap_sure_result = function (fn, callback) {
    return trap(sure(result(fn,callback)));
}

module.exports.trap = trap;
module.exports.sure = sure;
module.exports.sure = result;