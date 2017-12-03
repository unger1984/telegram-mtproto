'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toDCInt = toDCInt;
exports.makeCarrierAction = makeCarrierAction;

var _netMessage = require('../service/networker/net-message');

/*::
export opaque type DCInt: number = number
*/

function toDCInt(int) {
  return int;
}

function makeCarrierAction(payload) {
  return {
    type: '[00] action carrier',
    payload
  };
}
//# sourceMappingURL=carrier.js.map