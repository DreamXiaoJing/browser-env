'use strict';

const { makeNative, defineProp } = require('../lib/guard');
const vm = require('vm');

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
  // 实现：blob: URL 的代码会在子 vm 沙箱中执行
  function Worker(scriptURL, options) {
    const self = this;
    this._terminated = false;
    this._listeners = {};
    this.onmessage = null;
    this.onerror = null;
    this._workerSandbox = null;
    this._pendingMessages = [];

    // 处理 inline Worker（Blob URL）
    if (scriptURL && typeof scriptURL === 'string' && scriptURL.startsWith('blob:')) {
      const registry = sandbox.__blobURLRegistry__ || {};
      const blob = registry[scriptURL];
      let code = '';
      if (blob) {
        // 获取 Blob 内容
        if (typeof blob.__content__ === 'string') {
          code = blob.__content__;
        } else if (typeof blob.text === 'function') {
          // 异步获取，但这里同步执行更安全
          code = blob.__content__ || '';
        }
      }

      if (code) {
        try {
          // 创建 Worker 沙箱 - 继承父沙箱的浏览器环境
          const workerSandbox = vm.createContext({});
          // 复制父沙箱的非函数属性（基础全局）
          const parentKeys = ['navigator', 'location', 'screen', 'performance',
            'crypto', 'console', 'Math', 'Date', 'JSON', 'parseInt', 'parseFloat',
            'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
            'encodeURI', 'decodeURI', 'escape', 'unescape', 'Object', 'Array',
            'String', 'Number', 'Boolean', 'RegExp', 'Error', 'TypeError',
            'RangeError', 'SyntaxError', 'ReferenceError', 'Function', 'Symbol',
            'Map', 'Set', 'WeakMap', 'WeakSet', 'Promise', 'Proxy', 'Reflect',
            'ArrayBuffer', 'Uint8Array', 'Uint16Array', 'Uint32Array',
            'Int8Array', 'Int16Array', 'Int32Array', 'Float32Array', 'Float64Array',
            'DataView', 'TextEncoder', 'TextDecoder', 'Infinity', 'NaN',
            'undefined', 'atob', 'btoa', 'setTimeout', 'clearTimeout',
            'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate',
            // Worker 内也可能发起 XHR/fetch（m-tk.js 的 worker 会请求 gias.jd.com）
            'XMLHttpRequest', 'fetch', 'Headers', 'Request', 'Response',
            'document', 'window', 'URL', 'URLSearchParams',
            'WebSocket', 'EventSource', 'AbortController'];
          parentKeys.forEach(function(k) {
            try {
              if (sandbox[k] !== undefined) workerSandbox[k] = sandbox[k];
            } catch(e) {}
          });
          // self / globalThis -> worker sandbox
          workerSandbox.self = workerSandbox;
          workerSandbox.globalThis = workerSandbox;
          workerSandbox.window = workerSandbox;
          // postMessage from worker -> parent
          workerSandbox.postMessage = makeNative(function(msg) {
            if (self._terminated) return;
            const ev = new MessageEvent('message', { data: msg });
            // 异步派发到父 Worker 对象
            global.setTimeout(function() {
              try {
                if (self.onmessage) self.onmessage(ev);
                if (self._listeners['message']) {
                  for (const cb of self._listeners['message']) cb(ev);
                }
              } catch(e) {
                if (self.onerror) self.onerror(e);
              }
            }, 0);
          }, 'postMessage');
          // addEventListener in worker
          workerSandbox.addEventListener = makeNative(function(type, cb) {
            if (type === 'message') {
              // 队列：worker 内部接收消息
              self._workerMessageHandlers = self._workerMessageHandlers || [];
              self._workerMessageHandlers.push(cb);
              // 派发待处理消息
              const pending = self._pendingMessages.splice(0);
              pending.forEach(function(msg) {
                global.setTimeout(function() {
                  try { cb(new MessageEvent('message', { data: msg })); } catch(e) {}
                }, 0);
              });
            } else if (type === 'error') {
              self._workerErrorHandlers = self._workerErrorHandlers || [];
              self._workerErrorHandlers.push(cb);
            }
          }, 'addEventListener');
          workerSandbox.removeEventListener = makeNative(function(type, cb) {
            if (type === 'message' && self._workerMessageHandlers) {
              self._workerMessageHandlers = self._workerMessageHandlers.filter(function(c) { return c !== cb; });
            }
          }, 'removeEventListener');
          workerSandbox.close = makeNative(function() {
            self._terminated = true;
          }, 'close');
          workerSandbox.importScripts = makeNative(function() {
            // 简化：不实际加载
          }, 'importScripts');
          // onmessage setter (worker 内部)
          Object.defineProperty(workerSandbox, 'onmessage', {
            get: function() { return self._workerOnMessage || null; },
            set: function(fn) {
              self._workerOnMessage = fn;
              // 派发待处理消息
              const pending = self._pendingMessages.splice(0);
              pending.forEach(function(msg) {
                global.setTimeout(function() {
                  try { fn(new MessageEvent('message', { data: msg })); } catch(e) {}
                }, 0);
              });
            },
            configurable: true
          });
          Object.defineProperty(workerSandbox, 'onerror', {
            get: function() { return self._workerOnError || null; },
            set: function(fn) { self._workerOnError = fn; },
            configurable: true
          });

          self._workerSandbox = workerSandbox;

          // 执行 Worker 代码
          try {
            vm.runInContext(code, workerSandbox, { filename: 'worker-blob.js', timeout: 30000 });
          } catch(e) {
            if (self.onerror) {
              global.setTimeout(function() { self.onerror(e); }, 0);
            }
          }
        } catch(e) {
          if (self.onerror) {
            global.setTimeout(function() { self.onerror(e); }, 0);
          }
        }
      }
    }
    // 处理 inline Worker（函数 + new Worker）
    if (typeof scriptURL === 'function') {
      this._evaluate(scriptURL.toString());
    }
  }
  makeNative(Worker, 'Worker');

  Worker.prototype = {
    postMessage: makeNative(function postMessage(message) {
      // 转发到 worker 沙箱
      if (this._terminated) return;
      if (this._workerSandbox) {
        const ev = new MessageEvent('message', { data: message });
        const handlers = this._workerMessageHandlers || [];
        const onMsg = this._workerOnMessage;
        if (handlers.length === 0 && !onMsg) {
          // 还没有注册 handler，缓存消息
          this._pendingMessages.push(message);
        } else {
          global.setTimeout(function() {
            try {
              if (onMsg) onMsg(ev);
              for (const cb of handlers) {
                try { cb(ev); } catch(e) {}
              }
            } catch(e) {}
          }, 0);
        }
      }
      // 兼容：内部监听
      if (!this._terminated && this._listeners['message']) {
        const event = new MessageEvent('message', { data: message });
        for (const cb of this._listeners['message']) cb(event);
      }
    }, 'postMessage'),

    terminate: makeNative(function terminate() {
      this._terminated = true;
      this._workerSandbox = null;
      this._workerMessageHandlers = null;
      this._workerOnMessage = null;
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
