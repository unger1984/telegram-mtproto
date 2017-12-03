import isNode from 'detect-node';

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

export var featureDetector = () => {
  var webCrypto = testWebCrypto();
  var useWebCrypto = !!webCrypto;

  return {
    webCrypto,
    use: {
      webCrypto: useWebCrypto,
      sha1Crypto: useWebCrypto,
      sha256Crypto: useWebCrypto,
      webworker: !isNode
    }
  };
};

var cryptoCommon = featureDetector();

export default cryptoCommon;
//# sourceMappingURL=common-provider.js.map