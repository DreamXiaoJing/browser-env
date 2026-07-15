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

  // ── 构造函数 ──
  function XMLHttpRequest() {
    this._reset();
  }

  XMLHttpRequest.UNSENT = UNSENT;
  XMLHttpRequest.OPENED = OPENED;
  XMLHttpRequest.HEADERS_RECEIVED = HEADERS_RECEIVED;
  XMLHttpRequest.LOADING = LOADING;
  XMLHttpRequest.DONE = DONE;

  const XHRProto = {
    _reset: makeNative(function() {
      this.readyState = UNSENT;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.responseXML = null;
      this.response = '';
      this.responseType = '';
      this.responseURL = '';
      this.timeout = 0;
      this.withCredentials = false;
      this.upload = { addEventListener: function() {}, removeEventListener: function() {} };
      this._method = null;
      this._url = null;
      this._async = true;
      this._user = null;
      this._password = null;
      this._requestHeaders = {};
      this._responseHeaders = null;
      this._aborted = false;
      this._listeners = {};
      this._onreadystatechange = null;
      this._onload = null;
      this._onerror = null;
      this._ontimeout = null;
      this._onabort = null;
      this._onloadend = null;
      this._onprogress = null;
      this._timer = null;
    }, '_reset'),

    // ── open ──
    open: makeNative(function open(method, url, async, user, password) {
      this._method = (method || 'GET').toUpperCase();
      this._url = url;
      this._async = async !== false;
      if (user) this._user = user;
      if (password) this._password = password;
      this._aborted = false;
      this._setState(OPENED);
    }, 'open'),

    // ── setRequestHeader ──
    setRequestHeader: makeNative(function setRequestHeader(name, value) {
      if (this.readyState !== OPENED) {
        throw new DOMException('Failed to execute \'setRequestHeader\' on \'XMLHttpRequest\': The object\'s state must be OPENED.');
      }
      this._requestHeaders[name] = value;
    }, 'setRequestHeader'),

    // ── send ──
    send: makeNative(function send(body) {
      if (this.readyState !== OPENED) {
        throw new DOMException('Failed to execute \'send\' on \'XMLHttpRequest\': The object\'s state must be OPENED.');
      }
      this._aborted = false;
      this._body = body;

      // timeout 处理
      if (this.timeout > 0) {
        this._timer = global.setTimeout(() => {
          if (this.readyState !== DONE) {
            this._onerror && this._onerror({ type: 'timeout' });
            this._ontimeout && this._ontimeout({ type: 'timeout' });
            this._dispatchEvent('timeout');
            this._abort();
          }
        }, this.timeout);
      }

      if (this._async) {
        // 异步模式
        global.setTimeout(() => {
          try {
            this._doSend();
          } catch (e) {
            this._onerror && this._onerror(e);
            this._dispatchEvent('error');
          }
        }, 0);
      } else {
        // 同步模式 — 子进程阻塞请求，返回时 readyState 已为 DONE
        try {
          const result = syncHttpRequest(
            this._method,
            this._url,
            this._requestHeaders,
            this._body,
            this.timeout || 30000
          );
          this.status = result.status;
          this.statusText = result.statusText;
          this.responseURL = this._url;
          this._responseHeaders = result.headers;
          this.responseText = result.data;
          this.response = result.data;
          this._setState(HEADERS_RECEIVED);
          this._setState(LOADING);
          this._setState(DONE);
          this._dispatchEvent('load');
          this._dispatchEvent('loadend');
        } catch (e) {
          this.status = 0;
          this._setState(DONE);
          this._onerror && this._onerror(e);
          this._dispatchEvent('error');
          this._dispatchEvent('loadend');
          throw e;
        }
      }
    }, 'send'),

    // ── 内部发送逻辑（返回 Promise）──
    _doSend: makeNative(function _doSend() {
      const url = new URL(this._url);
      const isHttps = url.protocol === 'https:';
      const transport = isHttps ? nodeHttps : nodeHttp;
      const xhr = this;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: this._method,
        headers: this._requestHeaders,
        rejectUnauthorized: cfg.rejectUnauthorized !== false
      };

      return new Promise((resolve, reject) => {
        const req = transport.request(options, (res) => {
          xhr.status = res.statusCode;
          xhr.statusText = res.statusMessage || '';
          xhr.responseURL = xhr._url;
          xhr._responseHeaders = res.headers;
          xhr._setState(HEADERS_RECEIVED);

          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
            xhr.responseText = data;
            if (xhr.responseType === 'text' || !xhr.responseType) {
              xhr.response = data;
            }
            xhr._setState(LOADING);
            xhr._dispatchEvent('progress');
          });

          res.on('end', () => {
            if (xhr._timer) {
              global.clearTimeout(xhr._timer);
              xhr._timer = null;
            }
            xhr.responseText = data;
            xhr.response = data;
            xhr._setState(DONE);
            xhr._dispatchEvent('load');
            xhr._dispatchEvent('loadend');
            resolve();
          });
        });

        req.on('error', (e) => {
          if (xhr._timer) {
            global.clearTimeout(xhr._timer);
            xhr._timer = null;
          }
          xhr.status = 0;
          xhr._setState(DONE);
          xhr._dispatchEvent('error');
          xhr._dispatchEvent('loadend');
          reject(e);
        });

        if (xhr._body) {
          req.write(xhr._body);
        }
        req.end();
      });
    }, '_doSend'),

    // ── abort ──
    abort: makeNative(function abort() {
      this._aborted = true;
      if (this._timer) {
        global.clearTimeout(this._timer);
        this._timer = null;
      }
      this._dispatchEvent('abort');
      this._dispatchEvent('loadend');
      this._setState(UNSENT);
    }, 'abort'),

    // ── getResponseHeader ──
    getResponseHeader: makeNative(function getResponseHeader(name) {
      if (this.readyState < HEADERS_RECEIVED) return null;
      if (!this._responseHeaders) return null;
      const val = this._responseHeaders[name.toLowerCase()];
      return val ? String(val) : null;
    }, 'getResponseHeader'),

    // ── getAllResponseHeaders ──
    getAllResponseHeaders: makeNative(function getAllResponseHeaders() {
      if (this.readyState < HEADERS_RECEIVED) return '';
      if (!this._responseHeaders) return '';
      return Object.entries(this._responseHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') + '\r\n';
    }, 'getAllResponseHeaders'),

    // ── overrideMimeType ──
    overrideMimeType: makeNative(function overrideMimeType(mime) {
      this._overrideMimeType = mime;
    }, 'overrideMimeType'),

    // ── 状态变更 ──
    _setState: makeNative(function _setState(state) {
      this.readyState = state;
      if (this._onreadystatechange) {
        this._onreadystatechange({ type: 'readystatechange' });
      }
      this._dispatchEvent('readystatechange');
    }, '_setState'),

    // ── 事件处理 ──
    addEventListener: makeNative(function addEventListener(type, callback) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(callback);
    }, 'addEventListener'),

    removeEventListener: makeNative(function removeEventListener(type, callback) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(cb => cb !== callback);
    }, 'removeEventListener'),

    _dispatchEvent: makeNative(function _dispatchEvent(type) {
      const event = { type, target: this };
      if (this._listeners[type]) {
        for (const cb of this._listeners[type]) cb(event);
      }
      // 调用 on* 处理程序
      const handlerKey = 'on' + type;
      if (this[handlerKey]) this[handlerKey](event);
    }, '_dispatchEvent')
  };

  // 复制原型
  for (const key of Object.keys(XHRProto)) {
    XMLHttpRequest.prototype[key] = XHRProto[key];
  }

  // ── readyState 常量 ──
  const constants = { UNSENT, OPENED, HEADERS_RECEIVED, LOADING, DONE };
  for (const [k, v] of Object.entries(constants)) {
    Object.defineProperty(XMLHttpRequest.prototype, k, {
      value: v, writable: false, configurable: false, enumerable: true
    });
  }

  // ── 安装 ──
  sandbox.XMLHttpRequest = XMLHttpRequest;

  // 确保在全局也可见
  sandbox.XMLHttpRequest.UNSENT = UNSENT;
  sandbox.XMLHttpRequest.OPENED = OPENED;
  sandbox.XMLHttpRequest.HEADERS_RECEIVED = HEADERS_RECEIVED;
  sandbox.XMLHttpRequest.LOADING = LOADING;
  sandbox.XMLHttpRequest.DONE = DONE;
}

module.exports = { install };
