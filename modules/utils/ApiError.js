var util = require("util");

var ApiError = module.exports.ApiError = function(message, subject, details) {
  this.code = -14;
  this.message = message;
  this.data = {subject:subject};
  if (details)
	this.data.details = details;
  Error.captureStackTrace(this);
};

util.inherits(ApiError, Error);

module.exports = ApiError;
