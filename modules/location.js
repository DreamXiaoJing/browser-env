'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * location 模块
 *
 * 注意：location 是 [LegacyUnforgeable] 属性：
 * - 不可删除
 * - 赋值会触发导航（在补环境中只是修改 URL 字符串）
 * - 所有属性都是自己定义的（不在原型上）
 */

function install(sandbox, config = {}) {
  const cfg = config.location || {};

  let href = cfg.href || 'about:blank';
  let protocol = cfg.protocol || 'about:';
  let host = cfg.host || '';
  let hostname = cfg.hostname || '';
  let port = cfg.port || '';
  let pathname = cfg.pathname || 'blank';
  let search = cfg.search || '';
  let hash = cfg.hash || '';
  let origin = cfg.origin || 'null';

  // 如果是完整 URL，解析它
  if (href && href !== 'about:blank') {
    try {
      const url = new URL(href);
      protocol = url.protocol;
      host = url.host;
      hostname = url.hostname;
      port = url.port;
      pathname = url.pathname;
      search = url.search;
      hash = url.hash;
      origin = url.origin;
    } catch (e) {
      // use defaults
    }
  }

  function updateFromHref(newHref) {
    href = newHref;
    try {
      const url = new URL(newHref);
      protocol = url.protocol;
      host = url.host;
      hostname = url.hostname;
      port = url.port;
      pathname = url.pathname;
      search = url.search;
      hash = url.hash;
      origin = url.origin;
    } catch (e) {}
  }

  // Location 对象 — 使用访问器属性模拟浏览器行为
  const location = {};

  // href 赋值触发导航（在模拟环境中只是修改 URL）
  const setHref = makeNative(function(v) {
    updateFromHref(String(v));
  }, 'set href');

  const getHref = makeNative(function() { return href; }, 'get href');
  const getProtocol = makeNative(function() { return protocol; }, 'get protocol');
  const getHost = makeNative(function() { return host; }, 'get host');
  const getHostname = makeNative(function() { return hostname; }, 'get hostname');
  const getPort = makeNative(function() { return port; }, 'get port');
  const getPathname = makeNative(function() { return pathname; }, 'get pathname');
  const getSearch = makeNative(function() { return search; }, 'get search');
  const getHash = makeNative(function() { return hash; }, 'get hash');
  const getOrigin = makeNative(function() { return origin; }, 'get origin');

  const setProtocol = makeNative(function(v) { protocol = String(v).replace(/:$/, '') + ':'; }, 'set protocol');
  const setHost = makeNative(function(v) { host = String(v); }, 'set host');
  const setHostname = makeNative(function(v) { hostname = String(v); }, 'set hostname');
  const setPort = makeNative(function(v) { port = String(v); }, 'set port');
  const setPathname = makeNative(function(v) { pathname = String(v); }, 'set pathname');
  const setSearch = makeNative(function(v) { search = String(v); }, 'set search');
  const setHash = makeNative(function(v) { hash = String(v); }, 'set hash');

  defineProp(location, 'href', null, {
    get: getHref,
    set: setHref,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'protocol', null, {
    get: getProtocol,
    set: setProtocol,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'host', null, {
    get: getHost,
    set: setHost,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'hostname', null, {
    get: getHostname,
    set: setHostname,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'port', null, {
    get: getPort,
    set: setPort,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'pathname', null, {
    get: getPathname,
    set: setPathname,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'search', null, {
    get: getSearch,
    set: setSearch,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'hash', null, {
    get: getHash,
    set: setHash,
    configurable: false,
    enumerable: true
  });
  defineProp(location, 'origin', null, {
    get: getOrigin,
    set: undefined,
    configurable: false,
    enumerable: true
  });

  // 方法
  location.assign = makeNative(function assign(url) {
    updateFromHref(String(url));
  }, 'assign');

  location.replace = makeNative(function replace(url) {
    updateFromHref(String(url));
  }, 'replace');

  location.reload = makeNative(function reload() {}, 'reload');

  location.toString = makeNative(function toString() { return href; }, 'toString');

  // Symbol.toPrimitive
  location[Symbol.toPrimitive] = makeNative(function(hint) {
    return href;
  }, '[Symbol.toPrimitive]');

  // 安装
  sandbox.Location = function Location() {}; // 不可直接构造
  makeNative(sandbox.Location, 'Location');
  sandbox.location = location;
  sandbox.document = sandbox.document || {};
  sandbox.document.location = location;
  sandbox.document.URL = href;
  sandbox.document.documentURI = href;
  sandbox.document.baseURI = href;
}

module.exports = { install };
