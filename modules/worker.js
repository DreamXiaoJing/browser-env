'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * Worker 模块
 *
 * 模拟 Web Worker API。
 * 包含:
 * - Worker（构造函数，实际创建一个 Node.js 子进程或 vm 沙箱）
 * - SharedWorker（stub）
 * - BroadcastChannel
 * - MessageChannel / MessagePort
 * - MessageEvent
 */

function install(sandbox, config = {}) {
  const cfg = config.worker || {};

  // ── MessageEvent ──
  function MessageEvent(type, init) {
    this.type = type || 'message';
    this.data = init ? init.data : null;
    this.origin = init ? init.origin : '';
    this.lastEventId = init ? init.lastEventId : '';
    this.source = init ? init.source : null;
    this.ports = []; // 简化
    this.target = null;
  }
  makeNative(MessageEvent, 'MessageEvent');

  // ── MessagePort（简化实现）──
  function MessagePort() {
    this._listeners = {};
    this._otherPort = null;
    this.onmessage = null;
  }
  makeNative(MessagePort, 'MessagePort');
  MessagePort.prototype.postMessage = makeNative(function(message) {
    if (this._otherPort) {
      global.setTimeout(function() {
        const event = new MessageEvent('message', { data: message });
        if (this._otherPort.onmessage) this._otherPort.onmessage(event);
        if (this._otherPort._listeners['message']) {
          for (const cb of this._otherPort._listeners['message']) cb(event);
        }
      }.bind(this), 0);
    }
  }, 'postMessage');
  MessagePort.prototype.start = makeNative(function() {}, 'start');
  MessagePort.prototype.close = makeNative(function() {}, 'close');
  MessagePort.prototype.addEventListener = makeNative(function(type, cb) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(cb);
  }, 'addEventListener');
  MessagePort.prototype.removeEventListener = makeNative(function(type, cb) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(c => c !== cb);
  }, 'removeEventListener');

  // ── MessageChannel ──
  function MessageChannel() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._otherPort = this.port2;
    this.port2._otherPort = this.port1;
  }
  makeNative(MessageChannel, 'MessageChannel');

  // ── BroadcastChannel ──
  function BroadcastChannel(name) {
    this.name = name;
    this.onmessage = null;
    this.onmessageerror = null;
    this._listeners = {};
  }
  makeNative(BroadcastChannel, 'BroadcastChannel');
  BroadcastChannel.prototype.postMessage = makeNative(function(message) {
    // 广播到所有同名的 BroadcastChannel（简化：不实现跨沙箱广播）
    if (this._listeners['message']) {
      const event = new MessageEvent('message', { data: message, origin: sandbox.location ? sandbox.location.origin : '' });
      for (const cb of this._listeners['message']) cb(event);
    }
    if (this.onmessage) this.onmessage(new MessageEvent('message', { data: message }));
  }, 'postMessage');
  BroadcastChannel.prototype.close = makeNative(function() {
    this.onmessage = null;
    this._listeners = {};
  }, 'close');
  BroadcastChannel.prototype.addEventListener = makeNative(function(type, cb) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(cb);
  }, 'addEventListener');
  BroadcastChannel.prototype.removeEventListener = makeNative(function(type, cb) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(c => c !== cb);
  }, 'removeEventListener');

  // ── Worker ──
  // 简化：用 vm 或 inline 字符串执行
  function Worker(scriptURL, options) {
    this._terminated = false;
    this._listeners = {};
    this.onmessage = null;
    this.onerror = null;

    // 处理 inline Worker（Blob URL）
    if (scriptURL && typeof scriptURL === 'string' && scriptURL.startsWith('blob:')) {
      // 简化：不执行
    }
    // 处理 inline Worker（函数 + new Worker）
    if (typeof scriptURL === 'function') {
      this._evaluate(scriptURL.toString());
    }
  }
  makeNative(Worker, 'Worker');

  Worker.prototype = {
    postMessage: makeNative(function postMessage(message) {
      // 在简化实现中，Worker.postMessage 只是一个占位
      if (!this._terminated && this._listeners['message']) {
        const event = new MessageEvent('message', { data: message });
        for (const cb of this._listeners['message']) cb(event);
      }
    }, 'postMessage'),

    terminate: makeNative(function terminate() {
      this._terminated = true;
    }, 'terminate'),

    addEventListener: makeNative(function(type, cb) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(cb);
    }, 'addEventListener'),

    removeEventListener: makeNative(function(type, cb) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(c => c !== cb);
    }, 'removeEventListener'),

    _evaluate: makeNative(function _evaluate(code) {
      // 在简化实现中，Worker 代码在 Node.js VM 中执行
      // 这里只是一个占位
    }, '_evaluate')
  };

  // ── SharedWorker ──
  function SharedWorker(scriptURL, options) {
    this.port = new MessagePort();
    this.port.start();
  }
  makeNative(SharedWorker, 'SharedWorker');

  // ── 自身线程（self.onmessage 等）──
  // 在 vm 沙箱中，提供 self.postMessage 等
  sandbox.postMessage = makeNative(function postMessage(message) {
    global.setTimeout(function() {
      const event = new MessageEvent('message', { data: message });
      if (sandbox.onmessage) sandbox.onmessage(event);
      if (sandbox._listeners && sandbox._listeners['message']) {
        for (const cb of sandbox._listeners['message']) cb(event);
      }
    }, 0);
  }, 'postMessage');

  sandbox.close = makeNative(function close() {}, 'close');
  sandbox.importScripts = makeNative(function importScripts() {
    // 简化：不实际加载脚本
  }, 'importScripts');

  // ── 安装 ──
  sandbox.Worker = Worker;
  sandbox.SharedWorker = SharedWorker;
  sandbox.BroadcastChannel = BroadcastChannel;
  sandbox.MessageChannel = MessageChannel;
  sandbox.MessagePort = MessagePort;
  sandbox.MessageEvent = MessageEvent;
}

module.exports = { install };
