'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = guard;

var _ramda = require('ramda');

var makeValidator = value => currentPath => (0, _ramda.pipe)((0, _ramda.view)((0, _ramda.lensPath)(currentPath)), e => e === value);

var selectCase = value => typeof value === 'object' ? processSpec(value) : makeValidator(value);

//$off
var processPair = fieldPath => ([key, value]) => selectCase(value)((0, _ramda.append)(key, fieldPath));

var processSpec = spec => fieldPath => (0, _ramda.chain)(processPair(fieldPath), (0, _ramda.toPairs)(spec));

/**
 * Validate object by given pattern
 *
 * @param {Object} spec
 * @returns {(x: any) => boolean}
 */
function guard(spec) {
  var processing = processSpec(spec);
  var withEmptyPath = processing([]);
  //$off
  return (0, _ramda.allPass)(withEmptyPath);
}
//# sourceMappingURL=match-spec.js.map