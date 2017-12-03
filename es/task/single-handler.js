import { append, reject, isEmpty, chain, filter, pipe } from 'ramda';

import { Just } from 'folktale/maybe';

import './index.h';
import { dispatch } from '../state';
import describeProtocolError from './describe-protocol-error';
import { MAIN, NETWORKER_STATE } from '../state/action';
import { longToBytes, rshift32 } from '../bin';
import guard from '../util/match-spec';
import warning from '../util/warning';
import random from '../service/secure-random';
import { toDCNumber } from '../newtype.h';
import '../mtp.h.js';
import { queryRequest } from '../state/query';
import Logger from 'mtproto-logger';
import { applyServerTime } from '../service/time-manager';
import { NetMessage } from '../service/networker/net-message';
import Config from '../config-provider';
var log = Logger`single-handler`;

/*::
interface Writer<T> {
  set next(x: T): void,
  read(): T[],
}
*/
function writer() {
  var state = [];

  var facade = {};
  //$off
  Object.defineProperties(facade, {
    next: {
      set(x) {
        state = append(x, state);
      }
    },
    read: {
      value: () => state
    }
  });
  return facade;
}

var getFlags = e => e.flags;

var selector = select => pipe(filter(pipe(getFlags, select, e => !!e)), chain(select));

var noEmpty = reject(isEmpty);

export default function singleHandler(ctx, message) {
  var { flags } = message;
  var patches = writer();
  var result = message;
  if (flags.inner) {
    patches.next = handleInner(ctx, message);
  }
  if (isUnrelatedBody(flags)) {
    var unrel = handleUnrelated(ctx, message);
    if (unrel !== void 0) patches.next = unrel;
  }
  if (flags.error) {
    var { info, patch } = handleError(ctx, message);
    patches.next = patch;

    result = info;
  }

  var collected = patches.read();
  // .map(({ flags, ...e }) => ({
  //   flags: {
  //     ...emptyPatch().flags,
  //     ...flags,
  //   },
  //   ...e
  // }))

  // collected.forEach(e => log`patches`(e))
  var summary = makeSummary(collected);
  //$off
  log`summary`(noEmpty(summary));
  return {
    message: result,
    summary
  };
}

var isUnrelatedBody = guard({
  api: false,
  container: false,
  body: true
});

//$off
var processAckChain = selector(e => e.processAck);
//$off
var ackChain = selector(e => e.ack);
//$off
var homeChain = selector(e => e.home);
//$off
var authChain = selector(e => e.authKey);
//$off
var reqResendChain = selector(e => e.reqResend);
//$off
var resendChain = selector(e => e.resend);
//$off
var lastMessagesChain = selector(e => e.lastServerMessages);
//$off
var saltChain = selector(e => e.salt);
//$off
var sessionChain = selector(e => e.session);

function makeSummary(collected) {
  var processAck = processAckChain(collected);
  var ack = ackChain(collected);
  var home = homeChain(collected);
  var auth = authChain(collected);
  var reqResend = reqResendChain(collected);
  var resend = resendChain(collected);
  var lastMessages = lastMessagesChain(collected);
  var salt = saltChain(collected);
  var session = sessionChain(collected);

  return {
    processAck,
    ack,
    home,
    auth,
    reqResend,
    resend,
    lastMessages,
    salt,
    session
  };
}

function handleUnrelated(ctx, message) {
  var { thread, uid, dc } = ctx;
  //$off
  var cast = message;
  var { body } = cast;
  var { id } = cast;

  switch (body._) {
    case 'msgs_ack':
      {
        body.msg_ids.forEach(thread.processMessageAck);
        var msg_ids = body.msg_ids;
        return {
          flags: {
            net: true,
            processAck: true
          },
          net: [{
            dc,
            processAck: msg_ids
          }],
          processAck: msg_ids.map(msg => ({ dc, id: msg }))
        };
      }
    case 'msg_detailed_info':
      {
        if (!Config.fastCache.get(uid, dc).hasSent(body.msg_id)) {
          thread.ackMessage(body.answer_msg_id);
          var _id = body.answer_msg_id;
          return {
            flags: {
              net: true,
              ack: true
            },
            net: [{
              dc,
              ack: [_id]
            }],
            ack: [{ dc, id: _id }]
          };
        }
        return emptyPatch();
      }
    case 'msg_new_detailed_info':
      {
        var { answer_msg_id: _id2 } = body;
        // thread.ackMessage(id)
        // thread.reqResendMessage(id)
        return {
          flags: {
            net: true,
            ack: true,
            reqResend: true
          },
          net: [{
            dc,
            ack: [_id2],
            reqResend: [_id2]
          }],
          ack: [{ dc, id: _id2 }],
          reqResend: [{ dc, id: _id2 }]
        };
      }
    case 'msgs_state_info':
      {
        var { answer_msg_id } = body;
        // thread.ackMessage(answer_msg_id)
        var lastResendReq = thread.lastResendReq;
        if (!lastResendReq) break;
        if (lastResendReq.req_msg_id != body.req_msg_id) break;
        // const resendDel = []
        for (var _iterator = lastResendReq.resend_msg_ids, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var badMsgID = _ref;

          // resendDel.push(badMsgID)
          Config.fastCache.get(uid, dc).deleteResent(badMsgID);
        }
        var aId = answer_msg_id;
        return {
          flags: {
            net: true,
            ack: true
          },
          net: [{
            dc,
            ack: [aId]
          }],
          ack: [{ dc, id: aId }]
          // dispatch(NETWORKER_STATE.RESEND.DEL(resendDel, this.dcID))
        };
      }
    case 'rpc_result':
      {
        return handleRpcResult(ctx, message);
      }
    case 'new_session_created':
      {
        // thread.emit('new-session', {
        //   threadID   : thread.threadID,
        //   networkerDC: message.dc,
        //   messageID  : message.id,
        //   message    : body
        // })
        return handleNewSession(ctx, message);
      }
    case 'bad_server_salt':
      {
        return handleBadSalt(ctx, message);
      }
    case 'bad_msg_notification':
      {
        return handleBadNotify(ctx, message);
      }
    default:
      {
        var { id: _id3 } = message;
        thread.ackMessage(message.id);
        thread.emit('untyped-message', {
          threadID: thread.threadID,
          networkerDC: message.dc,
          message: body,
          messageID: message.id,
          sessionID: Config.session.get(ctx.thread.uid, message.dc),
          result: message
        });
        return {
          flags: {
            net: true,
            ack: true
          },
          net: [{
            dc,
            ack: [_id3]
          }],
          ack: [{ dc, id: _id3 }]
        };
      }
  }
}

function handleInner(ctx, message) {
  var { thread } = ctx;
  var { id, dc } = message;
  if (thread.lastServerMessages.indexOf(id) != -1) {
    // console.warn('[MT] Server same messageID: ', messageID)
    // thread.ackMessage(id)
    return {
      flags: {
        net: true,
        ack: true
      },
      net: [{
        dc,
        ack: [id]
      }],
      ack: [{ dc, id }]
    };
  } else {
    thread.lastServerMessages.push(id);
    if (thread.lastServerMessages.length > 100) {
      thread.lastServerMessages.shift();
    }
    return {
      flags: {
        net: true,
        lastServerMessages: true
      },
      net: [{
        dc,
        lastServerMessages: [id]
      }],
      lastServerMessages: [{ dc, id }]
    };
  }
}

var migrateRegexp = /^(PHONE_MIGRATE_|NETWORK_MIGRATE_|USER_MIGRATE_)(\d+)/;
var fileMigrateRegexp = /^(FILE_MIGRATE_)(\d+)/;
var floodWaitRegexp = /^(FLOOD_WAIT_)(\d+)/;

function handleError(ctx, data) {
  var err = data.error;
  var {
    code,
    message
  } = err;
  if (floodWaitRegexp.test(message)) {
    return handleFloodWait(message, data, code, ctx);
  } else if (fileMigrateRegexp.test(message)) {
    return handleFileMigrate(message, data, code, ctx);
  } else if (migrateRegexp.test(message)) {
    return handleMigrateError(message, data, code, ctx);
  } else {
    switch (message) {
      case 'AUTH_KEY_UNREGISTERED':
        return handleAuthUnreg(ctx, message, data, code);
      case 'AUTH_RESTART':
        return handleAuthRestart(message, data, code);
    }
  }
  return { info: data, patch: emptyPatch() };
}

var floodWarning = warning({
  isIssue: false,
  message: ['Flood wait! Too many requests, you should wait', 'seconds before new requests']
});

function handleFloodWait(message, data, code, ctx) {
  var matched = message.match(floodWaitRegexp);
  if (!matched || matched.length < 2) return { info: data, patch: emptyPatch() };
  var [,, newDcID] = matched;
  if (!isFinite(newDcID)) return { info: data, patch: emptyPatch() };
  var waitTime = parseInt(newDcID, 10);

  floodWarning(waitTime);
  var info = Object.assign({}, data, {
    error: {
      code,
      message,
      handled: true
    }
  });
  return { info, patch: emptyPatch() };
}

function handleFileMigrate(message, data, code, ctx) {
  var { uid, dc } = ctx;
  var matched = message.match(fileMigrateRegexp);
  if (!matched || matched.length < 2) return { info: data, patch: emptyPatch() };
  var [,, newDcID] = matched;
  if (!isFinite(newDcID)) return { info: data, patch: emptyPatch() };
  var newDc = /*:: toDCNumber( */parseInt(newDcID, 10); /*:: ) */
  if (data.flags.methodResult) {
    var { outID } = data.methodResult;
    var req = queryRequest(uid, dc, outID).fold(() => false, x => x);
    if (req) {
      req.dc = Just(newDc);
      var info = Object.assign({}, data, {
        error: {
          code,
          message,
          handled: true
        }
      });
      return { info, patch: emptyPatch() };
    }
  }
  return { info: data, patch: emptyPatch() };
}

function handleMigrateError(message, data, code, ctx) {
  var uid = ctx.uid;

  var matched = message.match(migrateRegexp);
  if (!matched || matched.length < 2) return { info: data, patch: emptyPatch() };
  var [,, newDcID] = matched;
  if (!isFinite(newDcID)) return { info: data, patch: emptyPatch() };
  var newDc = parseInt(newDcID, 10);
  dispatch(MAIN.RECOVERY_MODE({
    halt: data.dc,
    recovery: newDc,
    uid
  }), uid);
  Config.fastCache.init(uid, ctx.dc);
  Config.seq.set(uid, ctx.dc, 0);
  Config.halt.set(uid, ctx.dc, true);
  Config.halt.set(uid, newDc, false);
  //$off
  Config.session.set(uid, ctx.dc, null);
  Promise.all([Config.storageAdapter.set.dc(uid, newDc), Config.storageAdapter.set.nearestDC(uid, newDc)]).then(() => {
    dispatch(MAIN.DC_DETECTED({
      dc: newDc,
      uid
    }, newDc), uid);
  });
  var patch = {
    flags: {
      net: true,
      home: true
    },
    net: [{
      dc: data.dc,
      home: false
    }, {
      dc: newDc,
      home: true
    }],
    home: [newDc]
  };
  var info = Object.assign({}, data, {
    error: {
      code,
      message,
      handled: true
    }
  });
  return { info, patch };
}

function handleAuthRestart(message, data, code) {
  var { dc } = data;
  // dispatch(MAIN.AUTH_UNREG(dc))

  var info = Object.assign({}, data, {
    error: {
      code,
      message,
      handled: true
    }
  });
  return { info, patch: {
      flags: {
        net: true,
        authKey: true
      },
      net: [{
        dc,
        authKey: []
      }],
      authKey: [{
        dc,
        authKey: false
      }]
    } };
}

function handleAuthUnreg(ctx, message, data, code) {
  var { dc, uid } = ctx;
  dispatch(MAIN.AUTH_UNREG(dc), uid);

  var info = Object.assign({}, data, {
    error: {
      code,
      message,
      handled: true
    }
  });
  return { info, patch: {
      flags: {
        net: true,
        authKey: true
      },
      net: [{
        dc,
        authKey: []
      }],
      authKey: [{
        dc,
        authKey: false
      }]
    } };
}

var emptyPatch = () => ({
  flags: {
    /*:: net: true, */
  }
});

function handleNewSession(ctx, message) {
  var body = message.body;
  var { first_msg_id, server_salt } = body;
  var salt = longToBytes(server_salt);
  var { dc, id } = message;
  // const session = new Array(8)
  // random(session)
  // Config.seq.set(ctx.thread.uid, dc, 0)
  return {
    flags: {
      net: true,
      // session   : true,
      salt: true,
      ack: true,
      processAck: true
    },
    net: [{
      dc,
      salt,
      // session,
      seq: 0,
      first: first_msg_id // Refers to outcoming api message
    }],
    // session: [{
    //   dc,
    //   session,
    //   seq  : 0,
    //   first: first_msg_id,
    // }],
    salt: [{
      dc,
      salt
    }],
    ack: [{ dc, id }],
    processAck: [{ dc, id: first_msg_id }]
  };
}

function handleBadNotify(ctx, message) {
  var body = message.body;
  var { dc, uid } = ctx;
  log`Bad msg notification`(message);
  var {
    bad_msg_id: badMsg,
    bad_msg_seqno: seq,
    error_code: code
  } = body;
  var sentMessage = Config.fastCache.get(uid, dc).getSent(badMsg);
  var error = describeProtocolError(code || 0);
  errorPrint: {
    log`protocol error, code`(error.code);
    log`protocol error, message`(error.message);
    log`protocol error, description`(error.description);
  }
  if (!sentMessage || sentMessage.seq_no != seq) {
    log`Bad msg notification, seq`(badMsg, seq);
    // throw error
  }
  var { id } = message;

  var flags = {/*:: ack: true */};

  var data = {};

  if (code === 16 || code === 17) {
    if (applyServerTime(ctx.thread.uid, rshift32(id))) {

      var _session = new Array(8);
      random(_session);
      flags = Object.assign({}, flags, { session: true });
      data = Object.assign({}, data, {
        session: [{
          dc,
          session: _session,
          seq: 0,
          first: badMsg
        }]
      });
      var badMessage = ctx.thread.updateSentMessage(badMsg);
      if (badMessage instanceof NetMessage) {
        flags = Object.assign({}, flags, { resend: true });
        data = Object.assign({}, data, {
          resend: [{ dc, id: badMsg }]
        });
      }
      flags = Object.assign({}, flags, { ack: true });
      data = Object.assign({}, data, {
        ck: [{ dc, id }]
      });
    }
  }
  return Object.assign({}, data, {
    flags
  });
}

function handleBadSalt(ctx, message) {
  var body = message.body;
  log`Bad server salt`(message);
  var {
    bad_msg_id: badMsg,
    bad_msg_seqno: seq,
    error_code: code,
    new_server_salt: newSalt
  } = body;
  var { dc, uid } = ctx;
  var sentMessage = Config.fastCache.get(uid, dc).getSent(badMsg);
  var error = describeProtocolError(code || 0);
  errorPrint: {
    log`protocol error, code`(error.code);
    log`protocol error, message`(error.message);
    log`protocol error, description`(error.description);
  }
  if (!sentMessage || sentMessage.seq_no != seq) {
    log`invalid message, seq`(badMsg, seq);
    // throw error
  }
  var salt = longToBytes(newSalt);
  var { id } = message;
  var session = new Array(8);
  random(session);

  ctx.thread.pushResend(badMsg);
  return {
    flags: {
      net: true,
      session: true,
      salt: true,
      ack: true,
      resend: true
    },
    net: [{
      dc,
      salt,
      session,
      seq: 0,
      first: badMsg
    }],
    session: [{
      dc,
      session,
      seq: 0,
      first: badMsg
    }],
    salt: [{
      dc,
      salt
    }],
    ack: [{ dc, id }],
    resend: [{ dc, id: badMsg }]
  };
}

function handleRpcResult(ctx, message) {
  var { thread, dc, uid } = ctx;
  var { id } = message;
  var body = message.body;
  thread.ackMessage(id);

  var sentMessageID = body.req_msg_id;
  var sentMessage = Config.fastCache.get(uid, dc).getSent(sentMessageID);

  // thread.processMessageAck(sentMessageID)
  if (!sentMessage) {
    console.warn('No sent message!', sentMessageID, message);
    return emptyPatch();
  }
  dispatch(NETWORKER_STATE.SENT.DEL([sentMessage], dc), uid);
  Config.fastCache.get(uid, dc).deleteSent(sentMessage);
  if (body.result) {
    if (body.result._ == 'rpc_error') {
      thread.emit('rpc-error', {
        threadID: thread.threadID,
        networkerDC: dc,
        error: body.result,
        sentMessage,
        message
      });
    } else {
      thread.emit('rpc-result', {
        threadID: thread.threadID,
        networkerDC: dc,
        message,
        sentMessage,
        result: body.result
      });
    }
  } else {
    console.warn('No result!', sentMessageID, message);
  }
  if (sentMessage.isAPI) thread.connectionInited = true;
  return emptyPatch();
}
//# sourceMappingURL=single-handler.js.map