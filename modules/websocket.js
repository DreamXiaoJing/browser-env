'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * WebSocket 模块
 *
 * 实现浏览器 WebSocket 对象（stub 模式）。
 * 实际的 WebSocket 通信需要底层支持，这里提供完全兼容的结构：
 * - 构造函数
 * - readyState 常量
 * - 事件（onopen, onmessage, onclose, onerror）
 * - send, close
 */

function install(sandbox, config = {}) {
  const CONNECTING = 0;
  const OPEN = 1;
  const CLOSING = 2;
  const CLOSED = 3;

  function WebSocket(url, protocols) {
    this.url = url;
    this.protocol = Array.isArray(protocols) ? protocols[0] : (protocols || '');
    this.readyState = CONNECTING;
    this.bufferedAmount = 0;
    this.binaryType = 'blob';
    this.extensions = '';
    this._listeners = {};

    // 如果是实际连接模式
    if (config.realWebSocket !== true) {
      // 模拟连接失败（大多数补环境场景只需要有结构，不需要真实连接）
      global.setTimeout(() => {
        this.readyState = CLOSED;
        this._dispatch('close', { code: 1006, reason: 'Connection refused', wasClean: false });
      }, 0);
    }
  }

  makeNative(WebSocket, 'WebSocket');

  // 常量
  WebSocket.CONNECTING = CONNECTING;
  WebSocket.OPEN = OPEN;
  WebSocket.CLOSING = CLOSING;
  WebSocket.CLOSED = CLOSED;

  WebSocket.prototype = {
    get readyState() { return this._readyState; },
    set readyState(v) { this._readyState = v; },

    send: makeNative(function send(data) {
      if (this.readyState !== OPEN) {
        throw new DOMException("Failed to execute 'send' on 'WebSocket': WebSocket is already in CLOSING or CLOSED state.");
      }
      // 在 stub 中，send 只是静默成功
    }, 'send'),

    close: makeNative(function close(code, reason) {
      if (this.readyState === CLOSING || this.readyState === CLOSED) return;
      this.readyState = CLOSING;
      global.setTimeout(() => {
        this.readyState = CLOSED;
        this._dispatch('close', {
          code: code || 1005,
          reason: reason || '',
          wasClean: true
        });
      }, 0);
    }, 'close'),

    addEventListener: makeNative(function addEventListener(type, callback) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(callback);
    }, 'addEventListener'),

    removeEventListener: makeNative(function removeEventListener(type, callback) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(cb => cb !== callback);
    }, 'removeEventListener'),

    _dispatch: makeNative(function _dispatch(type, data) {
      const event = { type, ...data, target: this };
      if (this._listeners[type]) {
        for (const cb of this._listeners[type]) cb(event);
      }
      const handlerKey = 'on' + type;
      if (this[handlerKey]) this[handlerKey](event);
    }, '_dispatch')
  };

  // 用 defineProp 修复 readyState 访问器
  const wsProto = WebSocket.prototype;
  Object.defineProperty(wsProto, 'readyState', {
    get: makeNative(function() { return this._readyState; }, 'get readyState'),
    set: makeNative(function(v) { this._readyState = v; }, 'set readyState'),
    configurable: true, enumerable: true
  });

  // 常量
  Object.defineProperty(wsProto, 'CONNECTING', { value: CONNECTING, writable: false, configurable: false });
  Object.defineProperty(wsProto, 'OPEN', { value: OPEN, writable: false, configurable: false });
  Object.defineProperty(wsProto, 'CLOSING', { value: CLOSING, writable: false, configurable: false });
  Object.defineProperty(wsProto, 'CLOSED', { value: CLOSED, writable: false, configurable: false });

  // 安装
  sandbox.WebSocket = WebSocket;
}

module.exports = { install };
