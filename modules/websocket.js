'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * WebSocket 模块
 *
 * 实现浏览器 WebSocket 对象（stub 模式）。
 */

function install(sandbox, config = {}) {
  const CONNECTING = 0;
  const OPEN = 1;
  const CLOSING = 2;
  const CLOSED = 3;

  const _private = new WeakMap();

  function getP(ws) {
    let p = _private.get(ws);
    if (!p) { p = {}; _private.set(ws, p); }
    return p;
  }

  function WebSocket(url, protocols) {
    const p = getP(this);
    p.url = url;
    p.protocol = Array.isArray(protocols) ? protocols[0] : (protocols || '');
    p.readyState = CONNECTING;
    p.bufferedAmount = 0;
    p.binaryType = 'blob';
    p.extensions = '';
    p.listeners = {};
    p.onopen = null;
    p.onmessage = null;
    p.onclose = null;
    p.onerror = null;

    global.setTimeout(() => {
      p.readyState = OPEN;
      _dispatch(this, 'open');
    }, 100);
  }

  makeNative(WebSocket, 'WebSocket');

  function _dispatch(ws, type, data) {
    const p = getP(ws);
    const event = { type, ...data, target: ws };
    if (p.listeners[type]) {
      for (const cb of p.listeners[type]) cb(event);
    }
    const handlerKey = 'on' + type;
    if (p[handlerKey]) p[handlerKey].call(ws, event);
  }

  // ── 原型方法（不可枚举）──
  const wsMethods = {
    send: makeNative(function send(data) {
      const p = getP(this);
      if (p.readyState !== OPEN) {
        throw new DOMException("Failed to execute 'send' on 'WebSocket': WebSocket is already in CLOSING or CLOSED state.");
      }
    }, 'send'),

    close: makeNative(function close(code, reason) {
      const p = getP(this);
      if (p.readyState === CLOSING || p.readyState === CLOSED) return;
      p.readyState = CLOSING;
      global.setTimeout(() => {
        p.readyState = CLOSED;
        _dispatch(this, 'close', {
          code: code || 1005,
          reason: reason || '',
          wasClean: true
        });
      }, 0);
    }, 'close'),

    addEventListener: makeNative(function addEventListener(type, callback) {
      const p = getP(this);
      if (!p.listeners[type]) p.listeners[type] = [];
      p.listeners[type].push(callback);
    }, 'addEventListener'),

    removeEventListener: makeNative(function removeEventListener(type, callback) {
      const p = getP(this);
      if (!p.listeners[type]) return;
      p.listeners[type] = p.listeners[type].filter(cb => cb !== callback);
    }, 'removeEventListener')
  };

  for (const [name, fn] of Object.entries(wsMethods)) {
    Object.defineProperty(WebSocket.prototype, name, {
      value: fn, writable: true, configurable: true, enumerable: false
    });
  }

  // ── 可枚举属性（getter）──
  const wsProps = [
    'url', 'protocol', 'readyState', 'bufferedAmount',
    'binaryType', 'extensions'
  ];

  for (const prop of wsProps) {
    Object.defineProperty(WebSocket.prototype, prop, {
      get: makeNative(function() {
        return getP(this)[prop];
      }, `get ${prop}`),
      set: makeNative(function(val) {
        getP(this)[prop] = val;
      }, `set ${prop}`),
      configurable: true,
      enumerable: true
    });
  }

  // ── on* 事件处理器 ──
  const eventHandlers = ['onopen', 'onmessage', 'onclose', 'onerror'];
  for (const handler of eventHandlers) {
    Object.defineProperty(WebSocket.prototype, handler, {
      get: makeNative(function() {
        return getP(this)[handler];
      }, `get ${handler}`),
      set: makeNative(function(val) {
        getP(this)[handler] = val;
      }, `set ${handler}`),
      configurable: true,
      enumerable: true
    });
  }

  // ── 常量（构造函数和原型上都有，原型上不可枚举）──
  const constants = { CONNECTING, OPEN, CLOSING, CLOSED };
  for (const [k, v] of Object.entries(constants)) {
    Object.defineProperty(WebSocket, k, {
      value: v, writable: false, configurable: false, enumerable: true
    });
    Object.defineProperty(WebSocket.prototype, k, {
      value: v, writable: false, configurable: false, enumerable: false
    });
  }

  // ── 安装 ──
  sandbox.WebSocket = WebSocket;
}

module.exports = { install };
