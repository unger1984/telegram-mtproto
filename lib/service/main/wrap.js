'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = MTProto;

var _fluture = require('fluture');

var _error = require('../../error');

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

require('./index.h');

require('../api-manager/index.h');

require('../../newtype.h');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function MTProto(config = {}) {
  var mtproto = new _index2.default(config);

  var api = mtproto.api;

  function telegram(method, params, options = {}) {
    return api.mtpInvokeApi(method, params, options);
  }

  telegram.on = api.on;
  telegram.emit = api.emit;
  telegram.storage = api.storage;
  telegram.uid = mtproto.uid;
  telegram.bus = mtproto.bus;
  telegram.mtproto = mtproto;
  telegram.future = function futureRequest(method, params = {}) {
    return (0, _fluture.encaseP2)(api.mtpInvokeApi, method, params);
  };

  return telegram;
}
//# sourceMappingURL=wrap.js.map