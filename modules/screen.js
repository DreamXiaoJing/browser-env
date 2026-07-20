'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * screen 模块
 *
 * 真实浏览器结构（实测 Chrome 150）：
 * - screen 实例无 own 属性
 * - 所有属性 (width/height/availWidth/availHeight/colorDepth/pixelDepth/
 *   availLeft/availTop/orientation/onchange/isExtended) 都是 Screen.prototype 上的 getter
 * - screen.orientation 是 ScreenOrientation 实例（type/angle/lock/unlock/onchange）
 * - 注意：screen 上没有 devicePixelRatio（这是 window.devicePixelRatio）
 */

function install(sandbox, config = {}) {
  const cfg = config.screen || {};
  const navCfg = config.navigator || {};
  const ua = navCfg.userAgent || '';
  const isiPhone = /iPhone/.test(ua);
  const isiPad = /iPad/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isiPhone || isiPad || isAndroid;

  const baseWidth = cfg.width || (isiPhone ? 390 : isiPad ? 1024 : isAndroid ? 412 : 1920);
  const baseHeight = cfg.height || (isiPhone ? 844 : isiPad ? 1366 : isAndroid ? 915 : 1080);
  const availWidth = cfg.availWidth || baseWidth;
  const availHeight = cfg.availHeight || baseHeight;
  const availLeft = cfg.availLeft || 0;
  const availTop = cfg.availTop || 0;
  const colorDepth = cfg.colorDepth || 24;
  const pixelDepth = cfg.pixelDepth || 24;
  const isExtended = cfg.isExtended || false;

  // ── Screen 构造函数 ──
  function Screen() { /* 不可 new */ }
  makeNative(Screen, 'Screen');

  // ScreenOrientation 构造函数
  function ScreenOrientation() {}
  makeNative(ScreenOrientation, 'ScreenOrientation');

  // ── 创建 orientation 对象（先于属性迁移）──
  const orientationType = cfg.orientation || (isMobile ? 'portrait-primary' : 'landscape-primary');
  const orientationAngle = cfg.angle || 0;

  const orientation = {};
  Object.setPrototypeOf(orientation, ScreenOrientation.prototype);
  Object.defineProperty(orientation, Symbol.toStringTag, {
    value: 'ScreenOrientation',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // orientation 的属性也放在原型上（浏览器行为）
  let _orientType = orientationType;
  let _orientAngle = orientationAngle;
  let _orientOnchange = null;
  Object.defineProperties(ScreenOrientation.prototype, {
    type: {
      get: makeNative(function() { return _orientType; }, 'get type'),
      set: undefined,
      enumerable: true,
      configurable: true
    },
    angle: {
      get: makeNative(function() { return _orientAngle; }, 'get angle'),
      set: undefined,
      enumerable: true,
      configurable: true
    },
    onchange: {
      get: makeNative(function() { return _orientOnchange; }, 'get onchange'),
      set: makeNative(function(v) { _orientOnchange = v; }, 'set onchange'),
      enumerable: true,
      configurable: true
    },
    lock: {
      value: makeNative(function lock(orientation) {
        return Promise.reject(new DOMException('lockOrientation() requires user gesture', 'SecurityError'));
      }, 'lock'),
      writable: true,
      configurable: true,
      enumerable: true
    },
    unlock: {
      value: makeNative(function unlock() {}, 'unlock'),
      writable: true,
      configurable: true,
      enumerable: true
    },
    addEventListener: {
      value: makeNative(function(type, cb) {}, 'addEventListener'),
      writable: true, configurable: true, enumerable: true
    },
    removeEventListener: {
      value: makeNative(function(type, cb) {}, 'removeEventListener'),
      writable: true, configurable: true, enumerable: true
    },
    dispatchEvent: {
      value: makeNative(function(event) { return true; }, 'dispatchEvent'),
      writable: true, configurable: true, enumerable: true
    }
  });

  // ── 创建 screen 实例 ──
  const screen = {};
  Object.setPrototypeOf(screen, Screen.prototype);

  // ── 所有属性定义在 Screen.prototype 上作为 getter（匹配真实浏览器）──
  // 使用闭包变量，setter 修改闭包（部分属性如 onchange 可写）
  let _onchange = null;

  Object.defineProperties(Screen.prototype, {
    width: {
      get: makeNative(function() { return baseWidth; }, 'get width'),
      set: undefined, enumerable: true, configurable: true
    },
    height: {
      get: makeNative(function() { return baseHeight; }, 'get height'),
      set: undefined, enumerable: true, configurable: true
    },
    availWidth: {
      get: makeNative(function() { return availWidth; }, 'get availWidth'),
      set: undefined, enumerable: true, configurable: true
    },
    availHeight: {
      get: makeNative(function() { return availHeight; }, 'get availHeight'),
      set: undefined, enumerable: true, configurable: true
    },
    availLeft: {
      get: makeNative(function() { return availLeft; }, 'get availLeft'),
      set: undefined, enumerable: true, configurable: true
    },
    availTop: {
      get: makeNative(function() { return availTop; }, 'get availTop'),
      set: undefined, enumerable: true, configurable: true
    },
    colorDepth: {
      get: makeNative(function() { return colorDepth; }, 'get colorDepth'),
      set: undefined, enumerable: true, configurable: true
    },
    pixelDepth: {
      get: makeNative(function() { return pixelDepth; }, 'get pixelDepth'),
      set: undefined, enumerable: true, configurable: true
    },
    isExtended: {
      get: makeNative(function() { return isExtended; }, 'get isExtended'),
      set: undefined, enumerable: true, configurable: true
    },
    orientation: {
      get: makeNative(function() { return orientation; }, 'get orientation'),
      set: undefined, enumerable: true, configurable: true
    },
    onchange: {
      get: makeNative(function() { return _onchange; }, 'get onchange'),
      set: makeNative(function(v) { _onchange = v; }, 'set onchange'),
      enumerable: true, configurable: true
    }
  });

  // constructor 不可枚举
  Object.defineProperty(Screen.prototype, 'constructor', {
    value: Screen, writable: true, configurable: true, enumerable: false
  });

  Object.defineProperty(Screen.prototype, Symbol.toStringTag, {
    value: 'Screen',
    writable: false, configurable: true, enumerable: false
  });

  // ── 安装到 sandbox ──
  sandbox.Screen = Screen;
  sandbox.ScreenOrientation = ScreenOrientation;
  sandbox.screen = screen;

  // 检查点
  if (cfg.__verify) {
    console.log('[verify] screen.width:', screen.width);
    console.log('[verify] screen.height:', screen.height);
    console.log('[verify] screen.availWidth:', screen.availWidth);
    console.log('[verify] screen.availHeight:', screen.availHeight);
    console.log('[verify] screen.colorDepth:', screen.colorDepth);
    console.log('[verify] screen.pixelDepth:', screen.pixelDepth);
    console.log('[verify] screen.orientation.type:', screen.orientation.type);
    console.log('[verify] screen.orientation.angle:', screen.orientation.angle);
    console.log('[verify] screen own props count:', Object.getOwnPropertyNames(screen).length);
    console.log('[verify] Screen.prototype props count:', Object.getOwnPropertyNames(Screen.prototype).length);
  }
}

module.exports = { install };
