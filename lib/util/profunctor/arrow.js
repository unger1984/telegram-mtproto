'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _trampoline = require('./trampoline');

var _trampoline2 = _interopRequireDefault(_trampoline);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Arrow {
  constructor(λ) {
    this.λ = λ;
  }
  fn() {
    //$FlowIssue
    var arrow = run(this.λ.stack);
    return arrow;
  }
  ap(x) {
    return this.λ.run(x);
  }
  map(fn) {
    return new Arrow(this.λ.append(fn));
  }
  contramap(fn) {
    return new Arrow(this.λ.prepend(fn));
  }
  bimap(pre, post) {
    return new Arrow(this.λ.prepend(pre).append(post));
  }
  compose(arrow) {
    return new Arrow(this.λ.concat(arrow.λ));
  }
  static of(val) {
    if (isFunc(val)) {
      return ofFunc(val);
    } else if (isStack(val)) {
      return ofStack(val);
    } else if (isTrampoline(val)) {
      return ofTrampoline(val);
    } else if (isArrow(val)) {
      return ofArrow(val);
    } else {
      throw new TypeError(`Can not create arrow from ${typeof val} ${val}`);
    }
  }
  static id() {
    return Arrow.of(x => x);
  }
}

exports.default = Arrow;
function run(stack) {
  return function arrow(data) {
    return (0, _trampoline.applyStack)(stack, data);
  };
}

function isTrampoline(val) {
  return val instanceof _trampoline2.default;
}

function isStack(val) {
  return Array.isArray(val);
}

function isFunc(val) {
  return typeof val === 'function';
}

function isArrow(val) {
  return val instanceof Arrow;
}

function ofTrampoline(val) {
  return new Arrow(val);
}

function ofStack(val) {
  return new Arrow(_trampoline2.default.of(val));
}

function ofFunc(val) {
  return new Arrow(_trampoline2.default.of([val]));
}

function ofArrow(val) {
  return val;
}
//# sourceMappingURL=arrow.js.map