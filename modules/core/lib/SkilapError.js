var util = require("util");

var SkilapError = module.exports.SkilapError = function(message, subject) {
  this.name = "SkilapError";
  this.message = message;
  this.skilap = {subject:subject};
  Error.captureStackTrace(this);
};

util.inherits(SkilapError, Error);

module.exports = SkilapError;
