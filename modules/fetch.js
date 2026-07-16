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

  // ── 私有属性 WeakMap ──
  const _headersPrivate = new WeakMap();
  const _responsePrivate = new WeakMap();
  const _requestPrivate = new WeakMap();

  function getHP(h) {
    let p = _headersPrivate.get(h);
    if (!p) { p = { map: new Map() }; _headersPrivate.set(h, p); }
    return p;
  }
  function getRP(r) {
    let p = _responsePrivate.get(r);
    if (!p) { p = {}; _responsePrivate.set(r, p); }
    return p;
  }
  function getReqP(r) {
    let p = _requestPrivate.get(r);
    if (!p) { p = {}; _requestPrivate.set(r, p); }
    return p;
  }

  // ── Headers ──
  function Headers(init) {
    const p = getHP(this);
    if (init) {
      if (init instanceof Headers) {
        const op = getHP(init);
        for (const [k, v] of op.map) p.map.set(k, v);
      } else if (Array.isArray(init)) {
        for (const [k, v] of init) this.append(k, v);
      } else if (typeof init === 'object') {
        for (const k of Object.keys(init)) this.append(k, init[k]);
      }
    }
  }

  makeNative(Headers, 'Headers');

  const headerMethods = {
    append: makeNative(function(name, value) {
      getHP(this).map.set(name.toLowerCase(), String(value));
    }, 'append'),
    delete: makeNative(function(name) {
      getHP(this).map.delete(name.toLowerCase());
    }, 'delete'),
    get: makeNative(function(name) {
      return getHP(this).map.get(name.toLowerCase()) || null;
    }, 'get'),
    has: makeNative(function(name) {
      return getHP(this).map.has(name.toLowerCase());
    }, 'has'),
    set: makeNative(function(name, value) {
      getHP(this).map.set(name.toLowerCase(), String(value));
    }, 'set'),
    forEach: makeNative(function(cb) {
      const self = this;
      getHP(this).map.forEach((v, k) => cb(v, k, self));
    }, 'forEach'),
    entries: makeNative(function() {
      return getHP(this).map.entries();
    }, 'entries'),
    keys: makeNative(function() {
      return getHP(this).map.keys();
    }, 'keys'),
    values: makeNative(function() {
      return getHP(this).map.values();
    }, 'values')
  };

  for (const [name, fn] of Object.entries(headerMethods)) {
    Object.defineProperty(Headers.prototype, name, {
      value: fn, writable: true, configurable: true, enumerable: false
    });
  }

  Object.defineProperty(Headers.prototype, Symbol.iterator, {
    value: function() { return getHP(this).map.entries(); },
    writable: true, configurable: true, enumerable: false
  });

  // ── Response ──
  function Response(body, init) {
    init = init || {};
    const p = getRP(this);
    p.body = body;
    p.status = init.status || 200;
    p.statusText = init.statusText || 'OK';
    p.ok = p.status >= 200 && p.status < 300;
    p.redirected = false;
    p.type = 'basic';
    p.url = init.url || '';
    p.headers = init.headers || new Headers();
    p.bodyUsed = false;
  }

  makeNative(Response, 'Response');

  Object.defineProperty(Response.prototype, 'headers', {
    get: makeNative(function() { return getRP(this).headers; }, 'get headers'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'bodyUsed', {
    get: makeNative(function() { return getRP(this).bodyUsed; }, 'get bodyUsed'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'ok', {
    get: makeNative(function() { return getRP(this).ok; }, 'get ok'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'status', {
    get: makeNative(function() { return getRP(this).status; }, 'get status'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'statusText', {
    get: makeNative(function() { return getRP(this).statusText; }, 'get statusText'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'redirected', {
    get: makeNative(function() { return getRP(this).redirected; }, 'get redirected'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'type', {
    get: makeNative(function() { return getRP(this).type; }, 'get type'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Response.prototype, 'url', {
    get: makeNative(function() { return getRP(this).url; }, 'get url'),
    configurable: true, enumerable: true
  });

  const responseMethods = {
    text: makeNative(function text() {
      const p = getRP(this);
      p.bodyUsed = true;
      return _Thenable(String(p.body || ''));
    }, 'text'),
    json: makeNative(function json() {
      const p = getRP(this);
      p.bodyUsed = true;
      try {
        return _Thenable(JSON.parse(String(p.body || '{}')));
      } catch (e) {
        return _Thenable(null);
      }
    }, 'json'),
    blob: makeNative(function blob() {
      const p = getRP(this);
      p.bodyUsed = true;
      return _Thenable({ size: (p.body || '').length, type: '' });
    }, 'blob'),
    arrayBuffer: makeNative(function arrayBuffer() {
      const p = getRP(this);
      p.bodyUsed = true;
      const buf = Buffer.from(String(p.body || ''), 'utf-8');
      const ab = new ArrayBuffer(buf.length);
      new Uint8Array(ab).set(buf);
      return _Thenable(ab);
    }, 'arrayBuffer'),
    clone: makeNative(function clone() {
      const p = getRP(this);
      return new Response(p.body, { status: p.status, statusText: p.statusText, headers: p.headers, url: p.url });
    }, 'clone')
  };

  for (const [name, fn] of Object.entries(responseMethods)) {
    Object.defineProperty(Response.prototype, name, {
      value: fn, writable: true, configurable: true, enumerable: false
    });
  }

  // ── Thenable（支持同步和异步两种模式）──
  function _Thenable(value) {
    const obj = {};

    // 如果 value 是 Promise/Thenable，异步处理
    if (value && typeof value.then === 'function') {
      obj._promise = value;
      obj.then = function(onFulfilled, onRejected) {
        return _Thenable(value.then(onFulfilled, onRejected));
      };
      obj.catch = function(onRejected) {
        return _Thenable(value.catch(onRejected));
      };
    } else {
      // 同步模式（不依赖微任务队列）
      obj._value = value;
      obj.then = function(onFulfilled, onRejected) {
        try {
          if (onFulfilled) return _Thenable(onFulfilled(obj._value));
          return _Thenable(obj._value);
        } catch (e) {
          if (onRejected) return _Thenable(onRejected(e));
          return _Thenable(null);
        }
      };
      obj.catch = function(onRejected) {
        return obj.then(null, onRejected);
      };
    }

    return obj;
  }

  // ── fetch 实现 ──
  sandbox.fetch = makeNative(function fetch(url, options) {
    return _doFetch(url, options || {});
  }, 'fetch');

  sandbox.__fetchModule = _doFetch;

  function _doFetch(url, options) {
    options = options || {};
    const method = (options.method || 'GET').toUpperCase();
    const headers = options.headers || {};
    const body = options.body || null;
    let redirect = options.redirect || 'follow';
    let maxRedirects = 10;

    // 优先使用 TLS session（如果已初始化）
    if (sandbox.__tlsRequest) {
      return _tlsFetch(url, method, headers, body, redirect);
    }

    return _httpRequest(url, method, headers, body, 0, maxRedirects, redirect);
  }

  // ── TLS fetch（使用 node-tls-client）──
  function _tlsFetch(url, method, headers, body, redirectMode) {
    const promise = Promise.resolve()
      .then(() => sandbox.__tlsRequest(method, url, {
        headers: headers,
        body: body,
        followRedirects: redirectMode === 'follow'
      }))
      .then(result => {
        const respHeaders = new Headers();
        if (result.headers) {
          for (const [k, v] of Object.entries(result.headers)) {
            if (v !== undefined) {
              if (Array.isArray(v)) v.forEach(x => respHeaders.append(k, x));
              else respHeaders.append(k, String(v));
            }
          }
        }
        return new Response(result.body, {
          status: result.status,
          statusText: result.statusText,
          headers: respHeaders,
          url: result.url || url
        });
      })
      .catch(e => {
        throw new TypeError('fetch failed: ' + (e.message || e));
      });

    return _Thenable(promise);
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
          rejectUnauthorized: false
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

      if (error) throw error;
      return result;
    });
  }

  // ── Request ──
  function Request(url, init) {
    const p = getReqP(this);
    p.url = url;
    p.method = (init && init.method) || 'GET';
    p.headers = (init && init.headers) || new Headers();
    p.body = (init && init.body) || null;
  }

  makeNative(Request, 'Request');

  Object.defineProperty(Request.prototype, 'url', {
    get: makeNative(function() { return getReqP(this).url; }, 'get url'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Request.prototype, 'method', {
    get: makeNative(function() { return getReqP(this).method; }, 'get method'),
    configurable: true, enumerable: true
  });
  Object.defineProperty(Request.prototype, 'headers', {
    get: makeNative(function() { return getReqP(this).headers; }, 'get headers'),
    configurable: true, enumerable: true
  });

  // ── 安装 ──
  sandbox.Headers = Headers;
  sandbox.Response = Response;
  sandbox.Request = Request;
}

module.exports = { install };
