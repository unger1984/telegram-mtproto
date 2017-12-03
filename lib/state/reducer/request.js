'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = requestWatch;

var _maybe = require('folktale/maybe');

var _helpers = require('../helpers');

var _newtype = require('../../newtype.h');

var _monadT = require('../../util/monad-t');

var _error = require('../../error');

var _request = require('../../service/main/request');

var _request2 = _interopRequireDefault(_request);

require('../../task/index.h');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function handleError(state, task, msgID, outID) {
  // console.log(`\n--- request error ---\n`, task.body)
  // if (task.error.handled) return state
  var errorObj = new _error.RpcApiError(task.error.code, task.error.message);
  var { command, request } = state;
  return command.maybeGetK(outID)
  /*:: .map(tuple => tuple.bimap(toUID, toUID)) */
  .chain(getRequestTuple(request)).map(x => x.bimap(removeMsgID(command, outID), req => {
    req.deferFinal.reject(errorObj);
    return request
    // .removeV(req)
    .removeK(req.requestID);
  })).fold(stateK(state), tupleToState(state));
}
// import Config from 'ConfigProvider'

/* eslint-disable object-shorthand */

// import { Pure, liftF } from '@safareli/free'
// import { of, Left, Right } from 'apropos'


var getRequestByID = request => reqID => request.maybeGetK(reqID).map(_monadT.TupleT.snd);

var removeMsgID = (command, outID) => msgID => command.removeK(msgID).removeK(outID);

var getRequestTuple = request => tuple => _monadT.TupleT.traverseMaybe(tuple.map(getRequestByID(request)));

var stateK = state => () => state;

var tupleToState = state => tuple => Object.assign({}, state, {
  command: tuple.fst(),
  request: tuple.snd()
});

function handleApiResp(state, task, msgID, outID) {
  var { body } = task;

  var { command, request } = state;
  return command.maybeGetK(outID)
  /*:: .map(tuple => tuple.bimap(toUID, toUID)) */
  .chain(getRequestTuple(request)).map(x => x.bimap(removeMsgID(command, outID), req => {
    req.deferFinal.resolve(body);
    return request
    // .removeV(req)
    .removeK(req.requestID);
  })).fold(stateK(state), tupleToState(state));
}

function resolveTask(state, task) {
  var { flags } = task;
  var msgID = /*:: toUID( */task.id; /*:: ) */
  if (flags.api) {
    if (!task.api || !task.api.resolved) {}
    if (flags.methodResult) {
      var outID = /*:: toUID( */task.methodResult.outID; /*:: ) */
      if (flags.error) {
        return handleError(state, task, msgID, outID);
      } else if (flags.body) {
        return handleApiResp(state, task, msgID, outID);
      }
    }
  }
  return state;
}

function requestWatch(state, action) {
  switch ((0, _helpers.trimType)(action.type)) {
    case 'api/task done':
      {
        var tasks = action.payload;
        var newState = state;
        for (var _iterator = tasks, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var task = _ref;

          newState = resolveTask(newState, task);
        }
        return newState;
      }
    default:
      return state;
  }
}
//# sourceMappingURL=request.js.map