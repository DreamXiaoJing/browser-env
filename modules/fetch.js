'use strict';

const { makeNative, defineProp } = require('../lib/guard');
const nodeHttp = require('http');
const nodeHttps = require('https');
const nodeUrl = require('url');

/**
 * fetch 模块
 *
 * 实现浏览器 fetch API，底层用 Node.js http/https。
 * 返回 Thenable 对象（非真正的 Promise），兼容 d8 和 VM 环境。
 */

function install(sandbox, config = {}) {
  const cfg = config.fetch || {};

  // ── Headers ──
  function Headers(init) {
    this._map = new Map();
    if (init) {
      if (init instanceof Headers) {
        for (const [k, v] of init._map) this._map.set(k, v);
      } else if (Array.isArray(init)) {
        for (const [k, v] of init) this.append(k, v);
      } else if (typeof init === 'object') {
        for (const k of Object.keys(init)) this.append(k, init[k]);
      }
    }
  }
  makeNative(Headers, 'Headers');
  Headers.prototype.append = makeNative(function(name, value) {
    this._map.set(name.toLowerCase(), String(value));
  }, 'append');
  Headers.prototype.delete = makeNative(function(name) {
    this._map.delete(name.toLowerCase());
  }, 'delete');
  Headers.prototype.get = makeNative(function(name) {
    return this._map.get(name.toLowerCase()) || null;
  }, 'get');
  Headers.prototype.has = makeNative(function(name) {
    return this._map.has(name.toLowerCase());
  }, 'has');
  Headers.prototype.set = makeNative(function(name, value) {
    this._map.set(name.toLowerCase(), String(value));
  }, 'set');
  Headers.prototype.forEach = makeNative(function(cb) {
    this._map.forEach((v, k) => cb(v, k, this));
  }, 'forEach');
  Headers.prototype.entries = makeNative(function() {
    return this._map.entries();
  }, 'entries');
  Headers.prototype.keys = makeNative(function() {
    return this._map.keys();
  }, 'keys');
  Headers.prototype.values = makeNative(function() {
    return this._map.values();
  }, 'values');
  Headers.prototype[Symbol.iterator] = function() { return this._map.entries(); };

  // ── Response ──
  function Response(body, init = {}) {
    this._body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.redirected = false;
    this.type = 'basic';
    this.url = init.url || '';
    this._headers = init.headers || new Headers();
    this._bodyUsed = false;
  }
  makeNative(Response, 'Response');

  Response.prototype = {
    get headers() { return this._headers; },
    get bodyUsed() { return this._bodyUsed; },

    text: makeNative(function text() {
      this._bodyUsed = true;
      return _Thenable(String(this._body || ''));
    }, 'text'),

    json: makeNative(function json() {
      this._bodyUsed = true;
      try {
        return _Thenable(JSON.parse(String(this._body || '{}')));
      } catch (e) {
        return _Thenable(null);
      }
    }, 'json'),

    blob: makeNative(function blob() {
      this._bodyUsed = true;
      return _Thenable({ size: (this._body || '').length, type: '' });
    }, 'blob'),

    arrayBuffer: makeNative(function arrayBuffer() {
      this._bodyUsed = true;
      const buf = Buffer.from(String(this._body || ''), 'utf-8');
      const ab = new ArrayBuffer(buf.length);
      new Uint8Array(ab).set(buf);
      return _Thenable(ab);
    }, 'arrayBuffer'),

    clone: makeNative(function clone() {
      return new Response(this._body, { status: this.status, statusText: this.statusText, headers: this._headers, url: this.url });
    }, 'clone')
  };
  Object.defineProperty(Response.prototype, 'headers', {
    get: makeNative(function() { return this._headers; }, 'get headers'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'bodyUsed', {
    get: makeNative(function() { return this._bodyUsed; }, 'get bodyUsed'),
    configurable: true, enumerable: true
  });

  // ── Thenable（同步执行，不依赖微任务队列）──
  function _Thenable(value) { this._value = value; }
  _Thenable.prototype.then = function(onFulfilled, onRejected) {
    try {
      if (onFulfilled) return new _Thenable(onFulfilled(this._value));
      return new _Thenable(this._value);
    } catch (e) {
      if (onRejected) return new _Thenable(onRejected(e));
      return new _Thenable(null);
    }
  };
  _Thenable.prototype.catch = function(onRejected) {
    return this.then(null, onRejected);
  };

  // ── fetch 实现 ──
  sandbox.fetch = makeNative(function fetch(url, options = {}) {
    return _doFetch(url, options);
  }, 'fetch');

  sandbox.__fetchModule = _doFetch;

  function _doFetch(url, options) {
    options = options || {};
    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};
    const body = options.body || null;
    // 用于控制重定向
    let redirect = options.redirect || 'follow';
    let maxRedirects = 10;

    return _httpRequest(url, method, headers, body, 0, maxRedirects, redirect);
  }

  function _httpRequest(url, method, headers, body, redirectCount, maxRedirects, redirectMode) {
    const parsed = nodeUrl.parse(url);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? nodeHttps : nodeHttp;

    return new _Thenable(function() {
      let result = null;
      let error = null;

      try {
        const options = {
          hostname: parsed.hostname,
          port: parsed.port || (isHttps ? 443 : 80),
          path: parsed.path || '/',
          method: method,
          headers: headers,
          rejectUnauthorized: false // 允许自签名证书
        };

        const req = transport.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const respHeaders = new Headers();
            for (const [k, v] of Object.entries(res.headers)) {
              if (v !== undefined) {
                if (Array.isArray(v)) v.forEach(x => respHeaders.append(k, x));
                else respHeaders.append(k, String(v));
              }
            }

            // 处理重定向
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              if (redirectMode !== 'follow' || redirectCount >= maxRedirects) {
                const resp = new Response(data, {
                  status: res.statusCode,
                  statusText: res.statusMessage,
                  headers: respHeaders,
                  url: url
                });
                result = resp;
                return;
              }
              // 跟随重定向
              const redirectUrl = nodeUrl.resolve(url, res.headers.location);
              const redirected = _httpRequest(redirectUrl, method, headers, body, redirectCount + 1, maxRedirects, redirectMode);
              result = redirected._value;
              return;
            }

            const resp = new Response(data, {
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: respHeaders,
              url: url
            });
            result = resp;
          });
        });

        req.on('error', (e) => {
          error = new TypeError('fetch failed: ' + e.message);
        });

        if (body) {
          req.write(body);
        }
        req.end();
      } catch (e) {
        error = e;
      }

      // 同步等待（在 VM 环境中这是可行的，因为 Node.js 使用事件循环）
      // 实际上这里需要异步等待，但在同步 Thenable 模式中是阻塞的
      if (error) throw error;
      return result;
    });
  }

  // ── 安装 ──
  sandbox.Headers = Headers;
  sandbox.Response = Response;
  sandbox.Request = function Request(url, init) {
    this.url = url;
    this.method = (init && init.method) || 'GET';
    this.headers = (init && init.headers) || new Headers();
    this.body = (init && init.body) || null;
  };
  makeNative(sandbox.Request, 'Request');
}

module.exports = { install };
