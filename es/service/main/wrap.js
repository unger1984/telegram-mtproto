import { encaseP2, Fluture } from 'fluture';
import { MTError } from '../../error';

import Main from './index';

import './index.h';
import '../api-manager/index.h';

import '../../newtype.h';

export default function MTProto(config = {}) {
  var mtproto = new Main(config);

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
    return encaseP2(api.mtpInvokeApi, method, params);
  };

  return telegram;
}
//# sourceMappingURL=wrap.js.map