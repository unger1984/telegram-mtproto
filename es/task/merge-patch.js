function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

// import { join } from 'path'
// import { outputJsonSync } from 'fs-extra'

import { mergeWith, concat, append, groupBy, pipe, map, last, filter, fromPairs, contains } from 'ramda';

import './index.h';

import singleHandler from './single-handler';

import Logger from 'mtproto-logger';
var log = Logger`merge-patch`;

// const testID = String((Date.now() - ((Date.now() / 1e8) | 0) * 1e8) / 1e3 | 0)

// let event = 0
// const eventId = () => String( ++event )
//
// const LOG_PATH = [process.cwd(), 'logs', testID]

export default function mergePatch(ctx, processed) {
  var { message, summary } = processed.reduce((acc, msg) => {
    var { message, summary } = singleHandler(ctx, msg);
    // const file = join(...LOG_PATH, eventId() + '.json')
    // outputJsonSync(file, { message, summary }, { spaces: 2 })
    return {
      message: append(message, acc.message),
      summary: append(summary, acc.summary)
    };
  }, { message: [], summary: [] });
  var mergedSummary = summary.reduce(mergeSummary, emptySummary());
  var regrouped = regroupSummary(mergedSummary);
  var noAuth = dcWithoutAuth(regrouped.auth);
  var { salt, session } = regrouped,
      omitSalt = _objectWithoutProperties(regrouped, ['salt', 'session']);
  var updatedSalt = Object.assign({}, salt, noAuth);
  var updatedSession = Object.assign({}, session, noAuth);
  var withNewSalt = Object.assign({}, omitSalt, {
    salt: updatedSalt,
    session: updatedSession
  });
  var joinedAuth = joinDcAuth(withNewSalt);
  // log`mergedSummary`(mergedSummary)
  log`regrouped`(withNewSalt);
  log`joinedAuth`(joinedAuth);
  return {
    normalized: message,
    summary: withNewSalt
  };
}

var emptySummary = () => ({
  processAck: [],
  ack: [],
  home: [],
  auth: [],
  reqResend: [],
  resend: [],
  lastMessages: [],
  salt: [],
  session: []
});

//$off
var mergeSummary = mergeWith(concat);

//$off

var groupAndExtract = /*:: <T, S>*/fn => pipe(groupBy(({ dc } /*::(*/) => dc /*:: : $FlowIssue)*/), map(map(fn)));

var groupDcIds = groupAndExtract(e => e.id);
var groupAuthKey = groupAndExtract(e => e.authKey);
var groupSalt = groupAndExtract(e => e.salt);
var groupSession = groupAndExtract(e => e);

function regroupSummary(summary) {
  var {
    processAck,
    ack,
    home,
    auth,
    reqResend,
    resend,
    lastMessages,
    salt,
    session
  } = summary;

  var regrouped = {
    processAck: groupDcIds(processAck),
    ack: groupDcIds(ack),
    home,
    auth: reduceToLast(groupAuthKey(auth)),
    reqResend: groupDcIds(reqResend),
    resend: groupDcIds(resend),
    lastMessages: groupDcIds(lastMessages),
    salt: reduceToLast(groupSalt(salt)),
    session: reduceToLast(groupSession(session))
  };

  return regrouped;
}

//$off
var reduceToLast = map(last);

//$off

var dcWithoutAuth = filter(e => e === false);

var empty = {};
var toDcs = obj => Object.keys(obj).filter(isFinite).map(e => parseInt(e, 10));

function joinDcAuth(summary) {
  var {
    auth = empty,
    salt = empty,
    session = empty
  } = summary;
  /*::
  type AuthMap = typeof summary.auth
  type SaltMap = typeof summary.salt
  type SessionMap = typeof summary.session
  */

  var authKeys = toDcs(auth);
  var saltKeys = toDcs(salt);
  var sessionKeys = toDcs(session);
  var usedDcs = [...new Set([...authKeys, ...saltKeys, ...sessionKeys])];
  var emptyDcAuth = /*::(*/{}; /*:: : any)*/
  var result = fromPairs(usedDcs.map(e => [e, emptyDcAuth]));
  for (var _iterator = usedDcs, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
    var _ref;

    if (_isArray) {
      if (_i >= _iterator.length) break;
      _ref = _iterator[_i++];
    } else {
      _i = _iterator.next();
      if (_i.done) break;
      _ref = _i.value;
    }

    var _dc = _ref;

    var dcAuth = result[_dc];
    var hasDc = contains(_dc);
    if (hasDc(authKeys)) dcAuth = Object.assign({}, dcAuth, { auth: auth[_dc] });
    if (hasDc(saltKeys)) dcAuth = Object.assign({}, dcAuth, { salt: salt[_dc] });
    if (hasDc(sessionKeys)) dcAuth = Object.assign({}, dcAuth, { session: session[_dc] });
    result = Object.assign({}, result, { [_dc]: dcAuth });
  }
  return result;
}
//# sourceMappingURL=merge-patch.js.map