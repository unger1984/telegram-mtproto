import { append, toPairs, chain, allPass, pipe, view, lensPath } from 'ramda';

var makeValidator = value => currentPath => pipe(view(lensPath(currentPath)), e => e === value);

var selectCase = value => typeof value === 'object' ? processSpec(value) : makeValidator(value);

//$off
var processPair = fieldPath => ([key, value]) => selectCase(value)(append(key, fieldPath));

var processSpec = spec => fieldPath => chain(processPair(fieldPath), toPairs(spec));

/**
 * Validate object by given pattern
 *
 * @param {Object} spec
 * @returns {(x: any) => boolean}
 */
export default function guard(spec) {
  var processing = processSpec(spec);
  var withEmptyPath = processing([]);
  //$off
  return allPass(withEmptyPath);
}
//# sourceMappingURL=match-spec.js.map