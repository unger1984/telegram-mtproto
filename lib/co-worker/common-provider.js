'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.featureDetector = undefined;

var _detectNode = require('detect-node');

var _detectNode2 = _interopRequireDefault(_detectNode);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var testWebCrypto = () => {
  var webCrypto = void 0;

  try {
    /* eslint-disable */
    if (typeof window !== 'undefined') {
      if (window.crypto) {
        webCrypto = window.crypto.subtle || window.crypto.webkitSubtle;
      } else if (window.msCrypto) {
        webCrypto = window.msCrypto.subtle;
      }
    }
  } finally {
    return webCrypto;
  }
};
var featureDetector = exports.featureDetector = () => {
  var webCrypto = testWebCrypto();
  var useWebCrypto = !!webCrypto;

  return {
    webCrypto,
    use: {
      webCrypto: useWebCrypto,
      sha1Crypto: useWebCrypto,
      sha256Crypto: useWebCrypto,
      webworker: !_detectNode2.default
    }
  };
};

var cryptoCommon = featureDetector();

exports.default = cryptoCommon;
//# sourceMappingURL=common-provider.js.map