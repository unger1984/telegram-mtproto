'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ApiManager = undefined;

require('eventemitter2');

require('mtproto-shared');

require('./index.h');

require('../main/index.h');

require('../../newtype.h');

var _configProvider = require('../../config-provider');

var _configProvider2 = _interopRequireDefault(_configProvider);

var _request = require('../main/request');

var _request2 = _interopRequireDefault(_request);

var _action = require('../../state/action');

var _state = require('../../state');

var _invoke = require('../invoke');

var _mtprotoLogger = require('mtproto-logger');

var _mtprotoLogger2 = _interopRequireDefault(_mtprotoLogger);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var log = _mtprotoLogger2.default`api-manager`;

class ApiManager {
  constructor(config, uid) {
    this.online = false;

    var {
      server,
      api,
      app: {
        storage,
        publicKeys
      }
    } = config;
    this.uid = uid;
    this.apiConfig = api;
    this.publicKeys = publicKeys;
    this.storage = storage;
    this.serverConfig = server;
    var emitter = _configProvider2.default.rootEmitter(this.uid);
    this.on = emitter.on;
    this.emit = emitter.emit;

    _configProvider2.default.publicKeys.init(uid, publicKeys);
    //$FlowIssue
    this.mtpInvokeApi = this.mtpInvokeApi.bind(this);
    //$off
    this.invokeNetRequest = this.invokeNetRequest.bind(this);
  }
  mtpGetNetworker() {
    // const uid = this.uid
    // return MaybeT
    //   .toFuture(
    //     ERR.noDC,
    //     queryHomeDc(uid)
    //   )
    //   .chain(dc => getThread(uid, dc))

    // return FutureT.futureEither(checkedDC)

    /*
    const cache = this.cache
    if (cache[dc]) return cache[dc]
     const qAuthKey = queryAuthKey(dc)
    const qSalt = querySalt(dc)
    if (Array.isArray(qAuthKey) && Array.isArray(qSalt)) {
      return new Thread(
        dc, authKey, serverSalt, uid
      )
    } */

    // const authKeyHex: string = await this.storage.get(akk)
    // let serverSaltHex: string = await this.storage.get(ssk)

    // const haveAuthKey =
    //   authKeyHex != null
    //   && typeof authKeyHex.length === 'number'
    //   && authKeyHex.length === 512
    // if (haveAuthKey) {
    //   if (!serverSaltHex || serverSaltHex.length !== 16)
    //     serverSaltHex = 'AAAAAAAAAAAAAAAA'
    //   const authKey = bytesFromHex(authKeyHex)
    //   const serverSalt = bytesFromHex(serverSaltHex)

    //   return this.networkSetter(dc, authKey, serverSalt)
    // }

    /* const auth = await authRequest(uid, dc).promise()
     const { authKey, serverSalt } = auth
     return new Thread(
      dc, authKey, serverSalt, uid
    ) */
  }

  mtpInvokeApi(method, params = {}, options = {}) {
    var netReq = new _request2.default({ method, params }, options, this.uid);

    (0, _state.dispatch)(_action.API.REQUEST.NEW({
      netReq,
      method,
      params,
      timestamp: Date.now()
    }, netReq.requestID), this.uid);
    return netReq.deferFinal.promise;
  }

  invokeNetRequest(netReq) {
    return (0, _invoke.makeAuthRequest)(netReq).promise();
    // try {
    //   const resultDeffered = await makeAuthRequest(this.uid, netReq).promise()
    //   console.warn('resultDeffered', resultDeffered)
    // } finally {
    //   return netReq.defer.promise
    // }
  }
}

exports.ApiManager = ApiManager;
//# sourceMappingURL=index.js.map