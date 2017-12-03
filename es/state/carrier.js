import { NetMessage } from '../service/networker/net-message';
/*::
export opaque type DCInt: number = number
*/

export function toDCInt(int) {
  return int;
}

export function makeCarrierAction(payload) {
  return {
    type: '[00] action carrier',
    payload
  };
}
//# sourceMappingURL=carrier.js.map