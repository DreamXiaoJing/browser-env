'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * storage 模块
 *
 * 实现:
 * - localStorage（持久化到文件）
 * - sessionStorage（内存存储）
 * - Storage 构造函数
 * - cookie（在 document 模块中已实现，但在 storage 模块加载时同步）
 */

const fs = require('fs');
const path = require('path');

function install(sandbox, config = {}) {
  const cfg = config.storage || {};

  // ── Storage 构造函数原型 ──
  const storageProto = {
    get length() { return Object.keys(this._data || {}).length; },

    key: makeNative(function key(index) {
      const keys = Object.keys(this._data || {});
      return keys[index] !== undefined ? keys[index] : null;
    }, 'key'),

    getItem: makeNative(function getItem(name) {
      if (!this._data) return null;
      return (name in this._data) ? String(this._data[name]) : null;
    }, 'getItem'),

    setItem: makeNative(function setItem(name, value) {
      if (!this._data) this._data = {};
      this._data[String(name)] = String(value);
      this._length = Object.keys(this._data).length;
      this._onChange(name, String(value));
    }, 'setItem'),

    removeItem: makeNative(function removeItem(name) {
      if (this._data && name in this._data) {
        delete this._data[name];
        this._length = Object.keys(this._data).length;
        this._onChange(name, null);
      }
    }, 'removeItem'),

    clear: makeNative(function clear() {
      if (this._data) {
        this._data = {};
        this._length = 0;
        this._onChange(null, null);
      }
    }, 'clear')
  };

  // ── localStorage（持久化到文件）──
  const localStoragePath = cfg.localStoragePath || path.join(__dirname, '..', '.localstorage.json');
  let storageData = {};

  // 从文件加载
  if (fs.existsSync(localStoragePath)) {
    try {
      storageData = JSON.parse(fs.readFileSync(localStoragePath, 'utf8'));
    } catch (e) {
      storageData = {};
    }
  }

  function saveLocalStorage() {
    try {
      fs.writeFileSync(localStoragePath, JSON.stringify(storageData, null, 2), 'utf8');
    } catch (e) {
      // 静默失败
    }
  }

  const localStorage = Object.create(storageProto);
  localStorage._data = storageData;
  localStorage._onChange = makeNative(function(name, value) {
    saveLocalStorage();
  }, '_onChange');
  // 用 Object.defineProperty 处理 length
  Object.defineProperty(localStorage, 'length', {
    get: makeNative(function() { return Object.keys(localStorage._data).length; }, 'get length'),
    enumerable: true,
    configurable: false
  });

  // ── sessionStorage（内存存储）──
  const sessionData = {};
  const sessionStorage = Object.create(storageProto);
  sessionStorage._data = sessionData;
  sessionStorage._onChange = makeNative(function() {}, '_onChange');
  Object.defineProperty(sessionStorage, 'length', {
    get: makeNative(function() { return Object.keys(sessionStorage._data).length; }, 'get length'),
    enumerable: true,
    configurable: false
  });

  // ── 安装到 sandbox ──
  sandbox.Storage = function Storage() {};
  makeNative(sandbox.Storage, 'Storage');
  // 将原型指向 storageProto
  sandbox.Storage.prototype = storageProto;

  sandbox.localStorage = localStorage;
  sandbox.sessionStorage = sessionStorage;

  // 确保 navigator.cookieEnabled 存在
  if (sandbox.navigator) {
    sandbox.navigator.cookieEnabled = true;
    sandbox.navigator.storage = sandbox.navigator.storage || {
      estimate: makeNative(function() {
        return Promise.resolve({ quota: 1073741824, usage: Object.keys(localStorage._data).length * 100 });
      }, 'estimate'),
      persist: makeNative(function() { return Promise.resolve(false); }, 'persist'),
      persisted: makeNative(function() { return Promise.resolve(false); }, 'persisted')
    };
  }

  // storage 事件（stub）
  const storageEvent = {
    type: 'storage',
    key: null,
    oldValue: null,
    newValue: null,
    url: sandbox.location ? sandbox.location.href : '',
    storageArea: null
  };
  sandbox.StorageEvent = function StorageEvent() {};
  makeNative(sandbox.StorageEvent, 'StorageEvent');
}

module.exports = { install };
