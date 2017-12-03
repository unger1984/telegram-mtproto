'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = normalize;
exports.decrypt = decrypt;

var _ramda = require('ramda');

var _fluture = require('fluture');

require('./index.h');

var _fixtures = require('./fixtures');

var _chain = require('../service/chain');

var _chain2 = _interopRequireDefault(_chain);

var _processing = require('./processing');

var _processing2 = _interopRequireDefault(_processing);

var _query = require('../state/query');

var _monadT = require('../util/monad-t');

var _configProvider = require('../config-provider');

var _configProvider2 = _interopRequireDefault(_configProvider);

var _mergePatch = require('./merge-patch');

var _mergePatch2 = _interopRequireDefault(_mergePatch);

var _mtprotoLogger = require('mtproto-logger');

var _mtprotoLogger2 = _interopRequireDefault(_mtprotoLogger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }
// import { dispatch } from 'State'
// import { MAIN } from 'Action'


var log = _mtprotoLogger2.default`task-index`;

/*::
declare var inp: RawInput
declare function wait<T>(data: Promise<T>): T
const decryptedData = wait(decrypt(inp).promise())

type NormalizeInput = typeof decryptedData
*/

function normalize(ctx) {
  var flattenRaw = flattenMessage(ctx);
  var processed = (0, _processing2.default)(ctx, flattenRaw);
  return Object.assign({}, (0, _mergePatch2.default)(ctx, processed), ctx);
}

function decrypt(_ref) {
  var { result: { data }, dc, uid } = _ref,
      input = _objectWithoutProperties(_ref, ['result', 'dc', 'uid']);

  var session = _configProvider2.default.session.get(uid, dc);
  var keys = _monadT.MaybeT.toFuture(ERR.noKeys, (0, _query.queryKeys)(uid, dc));
  return keys.map(keys => Object.assign({}, input, { data, dc, uid }, keys, { session })).chain(decryptor).chain(validateDecrypt).map(decrypted => Object.assign({}, input, { dc, uid }, decrypted));
}

var decryptor = (_ref2) => {
  var { thread, data, uid, dc, authID, auth, session } = _ref2,
      rest = _objectWithoutProperties(_ref2, ['thread', 'data', 'uid', 'dc', 'authID', 'auth', 'session']);

  return (0, _fluture.encaseP)(_chain2.default, {
    responseBuffer: data,
    uid,
    dc,
    authKeyID: authID,
    authKey: auth,
    thisSessionID: session,
    prevSessionID: thread.prevSessionID,
    getMsgById: thread.getMsgById
  }).map(result => Object.assign({}, result, { thread, uid, dc, authID, auth, session }, rest));
};

function validateDecrypt(decrypted) {
  var { response } = decrypted;
  if (!(0, _fixtures.isApiObject)(response)) {
    return (0, _fluture.reject)(ERR.invalidResponse());
  }
  return (0, _fluture.of)(decrypted); //{ ...input, ...decrypted }
}

function flattenMessage(input) {
  var { messageID, seqNo, sessionID, message, response, net, thread: { uid } } = input;
  var result = checkContainer(response);
  if (result.isContainer) return flattenContainer(input, result.data);else return [{
    type: 'object',
    uid,
    id: messageID,
    seq: seqNo,
    session: sessionID,
    dc: message.dc,
    raw: result.data
  }];
}

function checkContainer(response) {
  if (Array.isArray(response.messages)) {
    //$FlowIssue
    return {
      isContainer: true,
      data: response
    };
  } else {
    return {
      isContainer: false,
      data: response
    };
  }
}

function flattenContainer(input, container) {
  var { messages } = container;
  var ids = messages.map(({ msg_id }) => msg_id);
  var session = _configProvider2.default.session.get(input.thread.uid, input.dc);

  var cont = {
    type: 'container',
    id: input.messageID,
    seq: input.seqNo,
    session,
    dc: input.message.dc,
    raw: ids
  };
  var normalizedMsgs = messages.map(msg => ({
    type: 'inner',
    id: msg.msg_id,
    seq: msg.seqno,
    session,
    dc: input.message.dc,
    raw: msg
  }));
  return [...normalizedMsgs, cont];
}

class NoSessionKeys extends Error {}
class InvalidResponse extends Error {}
var ERR = {
  noKeys: () => new NoSessionKeys('No session keys'),
  invalidResponse: () => new InvalidResponse('Invalid decrypted response')
};
//# sourceMappingURL=index.js.map