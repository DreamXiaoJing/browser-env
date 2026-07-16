'use strict';

const { makeNative, defineProp } = require('../lib/guard');
const nodeHttp = require('http');
const nodeHttps = require('https');

/**
 * XMLHttpRequest 模块
 *
 * 实现浏览器 XMLHttpRequest 对象，支持同步和异步模式。
 * 底层使用 Node.js http/https。
 */

/** 在同步 XHR 中通过子进程发起阻塞 HTTP 请求（避免阻塞主线程事件循环） */
function syncHttpRequest(method, url, headers, body, timeoutMs) {
  const { execFileSync } = require('child_process');
  const payload = JSON.stringify({
    method,
    url,
    headers,
    body: body != null ? Buffer.from(String(body)).toString('base64') : null,
    timeoutMs: timeoutMs || 30000
  });

  const script = `
    const http = require('http');
    const https = require('https');
    const payload = JSON.parse(process.argv[1]);
    const u = new URL(payload.url);
    const mod = u.protocol === 'https:' ? https : http;
    const opts = {
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: payload.method,
      headers: payload.headers,
      rejectUnauthorized: false,
      timeout: payload.timeoutMs
    };
    const req = mod.request(opts, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        process.stdout.write(JSON.stringify({
          status: res.statusCode,
          statusText: res.statusMessage || '',
          headers: res.headers,
          data
        }));
      });
    });
    req.on('timeout', () => {
      req.destroy(new Error('XMLHttpRequest sync request timeout'));
    });
    req.on('error', (err) => {
      process.stderr.write(err.message || String(err));
      process.exit(1);
    });
    if (payload.body) req.write(Buffer.from(payload.body, 'base64'));
    req.end();
  `;

  try {
    const output = execFileSync(process.execPath, ['-e', script, payload], {
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      timeout: (timeoutMs || 30000) + 5000
    });
    return JSON.parse(output);
  } catch (err) {
    const msg = (err.stderr && String(err.stderr).trim()) || err.message;
    throw new Error(msg || 'XMLHttpRequest sync request failed');
  }
}

function install(sandbox, config = {}) {
  const cfg = config.xmlhttprequest || {};

  // ── 常量 ──
  const UNSENT = 0;
  const OPENED = 1;
  const HEADERS_RECEIVED = 2;
  const LOADING = 3;
  const DONE = 4;

  // ── 私有属性存储（使用 WeakMap 避免暴露在实例上）──
  const _private = new WeakMap();

  function getPrivate(xhr) {
    let p = _private.get(xhr);
    if (!p) {
      p = {};
      _private.set(xhr, p);
    }
    return p;
  }

  // ── 构造函数 ──
  function XMLHttpRequest() {
    const p = getPrivate(this);
    p.readyState = UNSENT;
    p.status = 0;
    p.statusText = '';
    p.responseText = '';
    p.responseXML = null;
    p.response = '';
    p.responseType = '';
    p.responseURL = '';
    p.timeout = 0;
    p.withCredentials = false;
    p.upload = { addEventListener: function() {}, removeEventListener: function() {} };
    p.method = null;
    p.url = null;
    p.async = true;
    p.user = null;
    p.password = null;
    p.requestHeaders = {};
    p.responseHeaders = null;
    p.aborted = false;
    p.listeners = {};
    p.onreadystatechange = null;
    p.onload = null;
    p.onerror = null;
    p.ontimeout = null;
    p.onabort = null;
    p.onloadend = null;
    p.onprogress = null;
    p.timer = null;
    p.body = null;
    p.overrideMimeType = null;
  }

  makeNative(XMLHttpRequest, 'XMLHttpRequest');

  XMLHttpRequest.UNSENT = UNSENT;
  XMLHttpRequest.OPENED = OPENED;
  XMLHttpRequest.HEADERS_RECEIVED = HEADERS_RECEIVED;
  XMLHttpRequest.LOADING = LOADING;
  XMLHttpRequest.DONE = DONE;

  // ── 内部方法 ──
  function _setState(xhr, state) {
    const p = getPrivate(xhr);
    p.readyState = state;
    if (p.onreadystatechange) {
      p.onreadystatechange.call(xhr, { type: 'readystatechange' });
    }
    _dispatchEvent(xhr, 'readystatechange');
  }

  function _dispatchEvent(xhr, type) {
    const p = getPrivate(xhr);
    const event = { type, target: xhr };
    if (p.listeners[type]) {
      for (const cb of p.listeners[type]) cb(event);
    }
    const handlerKey = 'on' + type;
    if (p[handlerKey]) p[handlerKey].call(xhr, event);
  }

  function _doSend(xhr) {
    const p = getPrivate(xhr);
    const url = new URL(p.url);
    const isHttps = url.protocol === 'https:';
    const transport = isHttps ? nodeHttps : nodeHttp;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: p.method,
      headers: p.requestHeaders,
      rejectUnauthorized: cfg.rejectUnauthorized !== false
    };

    return new Promise((resolve, reject) => {
      const req = transport.request(options, (res) => {
        p.status = res.statusCode;
        p.statusText = res.statusMessage || '';
        p.responseURL = p.url;
        p.responseHeaders = res.headers;
        _setState(xhr, HEADERS_RECEIVED);

        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          p.responseText = data;
          if (p.responseType === 'text' || !p.responseType) {
            p.response = data;
          }
          _setState(xhr, LOADING);
          _dispatchEvent(xhr, 'progress');
        });

        res.on('end', () => {
          if (p.timer) {
            global.clearTimeout(p.timer);
            p.timer = null;
          }
          p.responseText = data;
          p.response = data;
          _setState(xhr, DONE);
          _dispatchEvent(xhr, 'load');
          _dispatchEvent(xhr, 'loadend');
          resolve();
        });
      });

      req.on('error', (e) => {
        if (p.timer) {
          global.clearTimeout(p.timer);
          p.timer = null;
        }
        p.status = 0;
        _setState(xhr, DONE);
        _dispatchEvent(xhr, 'error');
        _dispatchEvent(xhr, 'loadend');
        reject(e);
      });

      if (p.body) {
        req.write(p.body);
      }
      req.end();
    });
  }

  // ── TLS 异步发送逻辑 ──
  function _doTlsSend(xhr) {
    const p = getPrivate(xhr);

    sandbox.__tlsRequest(p.method, p.url, {
      headers: p.requestHeaders,
      body: p.body,
      followRedirects: true
    }).then(result => {
      if (p.timer) {
        global.clearTimeout(p.timer);
        p.timer = null;
      }
      p.status = result.status;
      p.statusText = result.statusText || '';
      p.responseURL = p.url;
      p.responseHeaders = result.headers || {};
      p.responseText = result.body || '';
      p.response = result.body || '';
      _setState(xhr, HEADERS_RECEIVED);
      _setState(xhr, LOADING);
      _setState(xhr, DONE);
      _dispatchEvent(xhr, 'load');
      _dispatchEvent(xhr, 'loadend');
    }).catch(e => {
      if (p.timer) {
        global.clearTimeout(p.timer);
        p.timer = null;
      }
      p.status = 0;
      _setState(xhr, DONE);
      _dispatchEvent(xhr, 'error');
      _dispatchEvent(xhr, 'loadend');
    });
  }

  // ── 原型方法（全部设为不可枚举）──
  const protoMethods = {
    open: makeNative(function open(method, url, async, user, password) {
      const p = getPrivate(this);
      p.method = (method || 'GET').toUpperCase();
      p.url = url;
      p.async = async !== false;
      if (user) p.user = user;
      if (password) p.password = password;
      p.aborted = false;
      _setState(this, OPENED);
    }, 'open'),

    setRequestHeader: makeNative(function setRequestHeader(name, value) {
      const p = getPrivate(this);
      if (p.readyState !== OPENED) {
        throw new DOMException('Failed to execute \'setRequestHeader\' on \'XMLHttpRequest\': The object\'s state must be OPENED.');
      }
      p.requestHeaders[name] = value;
    }, 'setRequestHeader'),

    send: makeNative(function send(body) {
      const p = getPrivate(this);
      if (p.readyState !== OPENED) {
        throw new DOMException('Failed to execute \'send\' on \'XMLHttpRequest\': The object\'s state must be OPENED.');
      }
      p.aborted = false;
      p.body = body;

      if (p.timeout > 0) {
        p.timer = global.setTimeout(() => {
          if (p.readyState !== DONE) {
            p.onerror && p.onerror({ type: 'timeout' });
            p.ontimeout && p.ontimeout({ type: 'timeout' });
            _dispatchEvent(this, 'timeout');
            p.aborted = true;
          }
        }, p.timeout);
      }

      if (p.async) {
        // 异步模式
        global.setTimeout(() => {
          try {
            // 优先使用 TLS session
            if (sandbox.__tlsRequest) {
              _doTlsSend(this);
            } else {
              _doSend(this);
            }
          } catch (e) {
            p.onerror && p.onerror(e);
            _dispatchEvent(this, 'error');
          }
        }, 0);
      } else {
        // 同步模式 — 子进程阻塞请求
        try {
          const result = syncHttpRequest(
            p.method,
            p.url,
            p.requestHeaders,
            p.body,
            p.timeout || 30000
          );
          p.status = result.status;
          p.statusText = result.statusText;
          p.responseURL = p.url;
          p.responseHeaders = result.headers;
          p.responseText = result.data;
          p.response = result.data;
          _setState(this, HEADERS_RECEIVED);
          _setState(this, LOADING);
          _setState(this, DONE);
          _dispatchEvent(this, 'load');
          _dispatchEvent(this, 'loadend');
        } catch (e) {
          p.status = 0;
          _setState(this, DONE);
          p.onerror && p.onerror(e);
          _dispatchEvent(this, 'error');
          _dispatchEvent(this, 'loadend');
          throw e;
        }
      }
    }, 'send'),

    abort: makeNative(function abort() {
      const p = getPrivate(this);
      p.aborted = true;
      if (p.timer) {
        global.clearTimeout(p.timer);
        p.timer = null;
      }
      _dispatchEvent(this, 'abort');
      _dispatchEvent(this, 'loadend');
      p.readyState = UNSENT;
    }, 'abort'),

    getResponseHeader: makeNative(function getResponseHeader(name) {
      const p = getPrivate(this);
      if (p.readyState < HEADERS_RECEIVED) return null;
      if (!p.responseHeaders) return null;
      const val = p.responseHeaders[name.toLowerCase()];
      return val ? String(val) : null;
    }, 'getResponseHeader'),

    getAllResponseHeaders: makeNative(function getAllResponseHeaders() {
      const p = getPrivate(this);
      if (p.readyState < HEADERS_RECEIVED) return '';
      if (!p.responseHeaders) return '';
      return Object.entries(p.responseHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') + '\r\n';
    }, 'getAllResponseHeaders'),

    overrideMimeType: makeNative(function overrideMimeType(mime) {
      const p = getPrivate(this);
      p.overrideMimeType = mime;
    }, 'overrideMimeType'),

    addEventListener: makeNative(function addEventListener(type, callback) {
      const p = getPrivate(this);
      if (!p.listeners[type]) p.listeners[type] = [];
      p.listeners[type].push(callback);
    }, 'addEventListener'),

    removeEventListener: makeNative(function removeEventListener(type, callback) {
      const p = getPrivate(this);
      if (!p.listeners[type]) return;
      p.listeners[type] = p.listeners[type].filter(cb => cb !== callback);
    }, 'removeEventListener')
  };

  for (const [name, fn] of Object.entries(protoMethods)) {
    Object.defineProperty(XMLHttpRequest.prototype, name, {
      value: fn,
      writable: true,
      configurable: true,
      enumerable: false
    });
  }

  // ── 实例属性的 getter/setter（模拟浏览器的可枚举属性）──
  const instanceProps = [
    'readyState', 'status', 'statusText', 'responseText', 'responseXML',
    'response', 'responseType', 'responseURL', 'timeout', 'withCredentials',
    'upload'
  ];

  for (const prop of instanceProps) {
    Object.defineProperty(XMLHttpRequest.prototype, prop, {
      get: makeNative(function() {
        return getPrivate(this)[prop];
      }, `get ${prop}`),
      set: makeNative(function(val) {
        getPrivate(this)[prop] = val;
      }, `set ${prop}`),
      configurable: true,
      enumerable: true
    });
  }

  // ── on* 事件处理器 ──
  const eventHandlers = [
    'onreadystatechange', 'onload', 'onerror', 'ontimeout',
    'onabort', 'onloadend', 'onprogress'
  ];

  for (const handler of eventHandlers) {
    Object.defineProperty(XMLHttpRequest.prototype, handler, {
      get: makeNative(function() {
        return getPrivate(this)[handler];
      }, `get ${handler}`),
      set: makeNative(function(val) {
        getPrivate(this)[handler] = val;
      }, `set ${handler}`),
      configurable: true,
      enumerable: true
    });
  }

  // ── readyState 常量（原型上，不可枚举）──
  const constants = { UNSENT, OPENED, HEADERS_RECEIVED, LOADING, DONE };
  for (const [k, v] of Object.entries(constants)) {
    Object.defineProperty(XMLHttpRequest.prototype, k, {
      value: v, writable: false, configurable: false, enumerable: false
    });
  }

  // ── 构造函数属性 ──
  Object.defineProperty(XMLHttpRequest, 'UNSENT', { value: UNSENT, writable: false, configurable: false, enumerable: true });
  Object.defineProperty(XMLHttpRequest, 'OPENED', { value: OPENED, writable: false, configurable: false, enumerable: true });
  Object.defineProperty(XMLHttpRequest, 'HEADERS_RECEIVED', { value: HEADERS_RECEIVED, writable: false, configurable: false, enumerable: true });
  Object.defineProperty(XMLHttpRequest, 'LOADING', { value: LOADING, writable: false, configurable: false, enumerable: true });
  Object.defineProperty(XMLHttpRequest, 'DONE', { value: DONE, writable: false, configurable: false, enumerable: true });

  // ── 安装 ──
  sandbox.XMLHttpRequest = XMLHttpRequest;
}

module.exports = { install };
