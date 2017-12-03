function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

import { pipe, map } from 'ramda';
import { encaseP, of, reject } from 'fluture';

import './index.h';
import { isApiObject } from './fixtures';
import parser from '../service/chain';
import processing from './processing';
// import { dispatch } from 'State'
// import { MAIN } from 'Action'
import { queryKeys } from '../state/query';
import { MaybeT } from '../util/monad-t';
import Config from '../config-provider';

import mergePatch from './merge-patch';

import Logger from 'mtproto-logger';
var log = Logger`task-index`;

/*::
declare var inp: RawInput
declare function wait<T>(data: Promise<T>): T
const decryptedData = wait(decrypt(inp).promise())

type NormalizeInput = typeof decryptedData
*/

export default function normalize(ctx) {
  var flattenRaw = flattenMessage(ctx);
  var processed = processing(ctx, flattenRaw);
  return Object.assign({}, mergePatch(ctx, processed), ctx);
}

export function decrypt(_ref) {
  var { result: { data }, dc, uid } = _ref,
      input = _objectWithoutProperties(_ref, ['result', 'dc', 'uid']);

  var session = Config.session.get(uid, dc);
  var keys = MaybeT.toFuture(ERR.noKeys, queryKeys(uid, dc));
  return keys.map(keys => Object.assign({}, input, { data, dc, uid }, keys, { session })).chain(decryptor).chain(validateDecrypt).map(decrypted => Object.assign({}, input, { dc, uid }, decrypted));
}

var decryptor = (_ref2) => {
  var { thread, data, uid, dc, authID, auth, session } = _ref2,
      rest = _objectWithoutProperties(_ref2, ['thread', 'data', 'uid', 'dc', 'authID', 'auth', 'session']);

  return encaseP(parser, {
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
  if (!isApiObject(response)) {
    return reject(ERR.invalidResponse());
  }
  return of(decrypted); //{ ...input, ...decrypted }
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
  var session = Config.session.get(input.thread.uid, input.dc);

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