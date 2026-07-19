'use strict';

const { makeNative } = require('../lib/guard');

/**
 * DOM 额外 API 模块
 *
 * 提供浏览器特有的观察者 API：
 * - MutationObserver
 * - IntersectionObserver
 * - ResizeObserver
 * - PerformanceObserver
 * - MediaQueryList / matchMedia
 */

function install(sandbox, config = {}) {
  const cfg = config.domExtra || {};

  // ── MutationObserver ──
  function MutationObserver(callback) {
    this._callback = callback;
    this._target = null;
    this._config = null;
    this._records = [];
  }
  makeNative(MutationObserver, 'MutationObserver');

  MutationObserver.prototype = {
    observe: makeNative(function observe(target, options) {
      this._target = target;
      this._config = options || {};
    }, 'observe'),

    disconnect: makeNative(function disconnect() {
      this._target = null;
      this._config = null;
      this._records = [];
    }, 'disconnect'),

    takeRecords: makeNative(function takeRecords() {
      var records = this._records;
      this._records = [];
      return records;
    }, 'takeRecords')
  };

  // MutationRecord
  function MutationRecord() {}
  makeNative(MutationRecord, 'MutationRecord');

  // ── IntersectionObserver ──
  function IntersectionObserver(callback, options) {
    this._callback = callback;
    this._options = options || {};
    this._targets = [];
    this.root = (options && options.root) || null;
    this.rootMargin = (options && options.rootMargin) || '0px 0px 0px 0px';
    this.thresholds = (options && options.threshold) !== undefined
      ? (Array.isArray(options.threshold) ? options.threshold : [options.threshold])
      : [0];
  }
  makeNative(IntersectionObserver, 'IntersectionObserver');

  IntersectionObserver.prototype = {
    observe: makeNative(function observe(target) {
      if (this._targets.indexOf(target) === -1) {
        this._targets.push(target);
      }
      // 异步触发一次回调（模拟初始可见性）
      var self = this;
      global.setTimeout(function() {
        if (self._callback) {
          self._callback([createIntersectionEntry(target, 0)], self);
        }
      }, 0);
    }, 'observe'),

    unobserve: makeNative(function unobserve(target) {
      this._targets = this._targets.filter(function(t) { return t !== target; });
    }, 'unobserve'),

    disconnect: makeNative(function disconnect() {
      this._targets = [];
    }, 'disconnect'),

    takeRecords: makeNative(function takeRecords() {
      return [];
    }, 'takeRecords')
  };

  function createIntersectionEntry(target, ratio) {
    return {
      boundingClientRect: { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0, x: 0, y: 0 },
      intersectionRect: { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0, x: 0, y: 0 },
      intersectionRatio: ratio,
      isIntersecting: ratio > 0,
      rootBounds: null,
      target: target,
      time: Date.now()
    };
  }

  // ── ResizeObserver ──
  function ResizeObserver(callback) {
    this._callback = callback;
    this._targets = [];
  }
  makeNative(ResizeObserver, 'ResizeObserver');

  ResizeObserver.prototype = {
    observe: makeNative(function observe(target, options) {
      if (this._targets.indexOf(target) === -1) {
        this._targets.push(target);
      }
    }, 'observe'),

    unobserve: makeNative(function unobserve(target) {
      this._targets = this._targets.filter(function(t) { return t !== target; });
    }, 'unobserve'),

    disconnect: makeNative(function disconnect() {
      this._targets = [];
    }, 'disconnect')
  };

  function ResizeObserverEntry() {}
  makeNative(ResizeObserverEntry, 'ResizeObserverEntry');

  // ── PerformanceObserver ──
  function PerformanceObserver(callback) {
    this._callback = callback;
    this._entryTypes = [];
  }
  makeNative(PerformanceObserver, 'PerformanceObserver');

  PerformanceObserver.supportedEntryTypes = [
    'element', 'event', 'first-input', 'largest-contentful-paint',
    'layout-shift', 'longtask', 'mark', 'measure', 'navigation',
    'paint', 'resource', 'taskattribution', 'visibility-state'
  ];

  PerformanceObserver.prototype = {
    observe: makeNative(function observe(options) {
      if (options && options.entryTypes) {
        this._entryTypes = options.entryTypes;
      }
    }, 'observe'),

    disconnect: makeNative(function disconnect() {
      this._entryTypes = [];
    }, 'disconnect'),

    takeRecords: makeNative(function takeRecords() {
      return [];
    }, 'takeRecords')
  };

  function PerformanceObserverEntryList() {}
  makeNative(PerformanceObserverEntryList, 'PerformanceObserverEntryList');

  // ── MediaQueryList / matchMedia ──
  function MediaQueryList(media, matches) {
    this.media = media;
    this.matches = matches !== undefined ? matches : false;
    this.onchange = null;
    this._listeners = {};
  }

  MediaQueryList.prototype = {
    addListener: makeNative(function addListener(callback) {
      this.addEventListener('change', callback);
    }, 'addListener'),

    removeListener: makeNative(function removeListener(callback) {
      this.removeEventListener('change', callback);
    }, 'removeListener'),

    addEventListener: makeNative(function addEventListener(type, callback) {
      if (!this._listeners[type]) this._listeners[type] = [];
      if (this._listeners[type].indexOf(callback) === -1) {
        this._listeners[type].push(callback);
      }
    }, 'addEventListener'),

    removeEventListener: makeNative(function removeEventListener(type, callback) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(function(cb) { return cb !== callback; });
    }, 'removeEventListener'),

    dispatchEvent: makeNative(function dispatchEvent(event) {
      var list = this._listeners[event.type];
      if (list) {
        for (var i = 0; i < list.length; i++) {
          list[i].call(this, event);
        }
      }
      if (this['on' + event.type]) {
        this['on' + event.type].call(this, event);
      }
      return true;
    }, 'dispatchEvent')
  };
  makeNative(MediaQueryList, 'MediaQueryList');

  // matchMedia — 瑞数会检测 (any-pointer: fine) 等
  // 返回真实浏览器应有的匹配值
  function matchMedia(mediaQuery) {
    var matches = false;
    var normalized = String(mediaQuery).replace(/\s+/g, ' ').toLowerCase();

    // 桌面端 Chrome 的标准匹配结果
    if (
      normalized === '(any-pointer: fine)' ||
      normalized === '(any-hover: hover)' ||
      normalized === '(pointer: fine)' ||
      normalized === '(hover: hover)' ||
      normalized === '(color)' ||
      normalized === '(color-gamut: srgb)' ||
      normalized === '(prefers-color-scheme: light)' ||
      normalized === '(prefers-reduced-motion: no-preference)' ||
      normalized === '(prefers-contrast: no-preference)' ||
      normalized === '(orientation: landscape)' ||
      normalized.indexOf('min-width') >= 0 ||
      normalized.indexOf('max-width') >= 0 ||
      normalized.indexOf('min-height') >= 0 ||
      normalized.indexOf('max-height') >= 0 ||
      normalized.indexOf('min-resolution') >= 0 ||
      normalized.indexOf('max-resolution') >= 0 ||
      normalized.indexOf('min-device-pixel-ratio') >= 0 ||
      normalized.indexOf('max-device-pixel-ratio') >= 0 ||
      normalized.indexOf('-webkit-min-device-pixel-ratio') >= 0 ||
      normalized.indexOf('-webkit-max-device-pixel-ratio') >= 0
    ) {
      matches = true;
    }

    // 明确不匹配的
    if (
      normalized === '(any-pointer: coarse)' ||
      normalized === '(any-hover: none)' ||
      normalized === '(pointer: coarse)' ||
      normalized === '(hover: none)' ||
      normalized === '(any-pointer: none)' ||
      normalized === '(prefers-color-scheme: dark)' ||
      normalized === '(prefers-reduced-motion: reduce)' ||
      normalized === '(prefers-contrast: more)' ||
      normalized === '(prefers-contrast: custom)' ||
      normalized === '(monochrome)' ||
      normalized === '(color-index)' ||
      normalized.indexOf('(pointer:') >= 0 ||
      normalized.indexOf('(hover:') >= 0
    ) {
      matches = false;
    }

    // (pointer: fine) 等具体指针类型
    if (normalized.indexOf('(pointer:') >= 0 && normalized.indexOf('fine') >= 0) {
      matches = true;
    }
    if (normalized.indexOf('(any-pointer:') >= 0 && normalized.indexOf('fine') >= 0) {
      matches = true;
    }
    if (normalized.indexOf('(hover:') >= 0 && normalized.indexOf('hover') >= 0) {
      matches = true;
    }
    if (normalized.indexOf('(any-hover:') >= 0 && normalized.indexOf('hover') >= 0) {
      matches = true;
    }

    return new MediaQueryList(mediaQuery, matches);
  }

  // ── indexedDB 最小模拟（瑞数会检查）──
  function IDBFactory() {}
  makeNative(IDBFactory, 'IDBFactory');

  var indexedDB = {
    _dbs: {},
    _cmp: makeNative(function(a, b) { return a < b ? -1 : a > b ? 1 : 0; }, 'cmp'),
    open: makeNative(function(name, version) {
      var req = new IDBRequest();
      req._name = name;
      req._version = version || 1;
      // 异步触发成功
      var self = this;
      if (typeof global !== 'undefined' && global.setTimeout) {
        global.setTimeout(function() {
          var db = self._dbs[name];
          if (!db) {
            db = new IDBDatabase(name, version || 1);
            self._dbs[name] = db;
            req.result = db;
            if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: db } });
            if (typeof req.onupgradeneeded === 'function') {
              req.onupgradeneeded({ target: { result: db }, oldVersion: 0, newVersion: version || 1 });
            }
          } else {
            req.result = db;
            if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: db } });
          }
        }, 0);
      }
      return req;
    }, 'open'),
    deleteDatabase: makeNative(function(name) {
      delete this._dbs[name];
      var req = new IDBRequest();
      var self = this;
      if (typeof global !== 'undefined' && global.setTimeout) {
        global.setTimeout(function() {
          if (typeof req.onsuccess === 'function') req.onsuccess({ target: {} });
        }, 0);
      }
      return req;
    }, 'deleteDatabase'),
    databases: makeNative(function() {
      var names = Object.keys(this._dbs);
      return Promise.resolve(names.map(function(n) { return { name: n, version: 1 }; }));
    }, 'databases')
  };

  function IDBRequest() {
    this.result = null;
    this.error = null;
    this.source = null;
    this.transaction = null;
    this.readyState = 'pending';
    this.onsuccess = null;
    this.onerror = null;
    this.onupgradeneeded = null;
  }
  makeNative(IDBRequest, 'IDBRequest');

  function IDBDatabase(name, version) {
    this.name = name;
    this.version = version || 1;
    this.objectStoreNames = [];
    this.onclose = null;
    this.onversionchange = null;
  }
  makeNative(IDBDatabase, 'IDBDatabase');
  IDBDatabase.prototype = {
    close: makeNative(function() {}, 'close'),
    createObjectStore: makeNative(function(name, options) {
      return { name: name, keyPath: options && options.keyPath, autoIncrement: options && options.autoIncrement };
    }, 'createObjectStore'),
    deleteObjectStore: makeNative(function(name) {}, 'deleteObjectStore'),
    transaction: makeNative(function(storeNames, mode) {
      return {
        objectStore: makeNative(function(name) {
          return {
            name: name,
            add: makeNative(function(value, key) {}, 'add'),
            put: makeNative(function(value, key) {}, 'put'),
            get: makeNative(function(key) {
              var req = new IDBRequest();
              var self = this;
              if (typeof global !== 'undefined' && global.setTimeout) {
                global.setTimeout(function() {
                  req.result = undefined;
                  if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: undefined } });
                }, 0);
              }
              return req;
            }, 'get'),
            delete: makeNative(function(key) {
              var req = new IDBRequest();
              if (typeof global !== 'undefined' && global.setTimeout) {
                global.setTimeout(function() {
                  if (typeof req.onsuccess === 'function') req.onsuccess({ target: {} });
                }, 0);
              }
              return req;
            }, 'delete'),
            clear: makeNative(function() {
              var req = new IDBRequest();
              if (typeof global !== 'undefined' && global.setTimeout) {
                global.setTimeout(function() {
                  if (typeof req.onsuccess === 'function') req.onsuccess({ target: {} });
                }, 0);
              }
              return req;
            }, 'clear'),
            count: makeNative(function(key) {
              var req = new IDBRequest();
              if (typeof global !== 'undefined' && global.setTimeout) {
                global.setTimeout(function() {
                  req.result = 0;
                  if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: 0 } });
                }, 0);
              }
              return req;
            }, 'count'),
            getAll: makeNative(function(query, count) {
              return Promise.resolve([]);
            }, 'getAll'),
            index: makeNative(function(name) {
              var idx = {
                name: name,
                objectStore: this,
                keyPath: name,
                multiEntry: false,
                unique: false
              };
              idx.get = makeNative(function(key) {
                var req = new IDBRequest();
                if (typeof global !== 'undefined' && global.setTimeout) {
                  global.setTimeout(function() {
                    req.result = undefined;
                    if (typeof req.onsuccess === 'function') req.onsuccess({ target: { result: undefined } });
                  }, 0);
                }
                return req;
              }, 'get');
              return idx;
            }, 'index'),
            createIndex: makeNative(function(name, keyPath, options) {
              return { name: name, keyPath: keyPath, unique: options && options.unique, multiEntry: options && options.multiEntry };
            }, 'createIndex')
          };
        }, 'objectStore'),
        abort: makeNative(function() {}, 'abort'),
        objectStoreNames: Array.isArray(storeNames) ? storeNames : [storeNames],
        mode: mode || 'readonly',
        db: this,
        error: null,
        onabort: null,
        oncomplete: null,
        onerror: null
      };
    }, 'transaction'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(evt) { return true; }, 'dispatchEvent')
  };
  Object.defineProperty(IDBDatabase.prototype, 'constructor', {
    value: IDBDatabase,
    writable: true,
    configurable: true,
    enumerable: false
  });

  // IDBIndex, IDBObjectStore, IDBTransaction 等略（瑞数只检查 indexedDB.open 是否存在）
  function IDBIndex() {}
  makeNative(IDBIndex, 'IDBIndex');
  function IDBObjectStore() {}
  makeNative(IDBObjectStore, 'IDBObjectStore');
  function IDBTransaction() {}
  makeNative(IDBTransaction, 'IDBTransaction');
  function IDBCursor() {}
  makeNative(IDBCursor, 'IDBCursor');
  function IDBCursorWithValue() {}
  makeNative(IDBCursorWithValue, 'IDBCursorWithValue');
  function IDBKeyRange() {}
  makeNative(IDBKeyRange, 'IDBKeyRange');
  IDBKeyRange.only = makeNative(function(value) { return { lower: value, upper: value, lowerOpen: false, upperOpen: false }; }, 'only');
  IDBKeyRange.lowerBound = makeNative(function(lower, open) { return { lower: lower, upper: undefined, lowerOpen: !!open, upperOpen: true }; }, 'lowerBound');
  IDBKeyRange.upperBound = makeNative(function(upper, open) { return { lower: undefined, upper: upper, lowerOpen: true, upperOpen: !!open }; }, 'upperBound');
  IDBKeyRange.bound = makeNative(function(l, u, lo, uo) { return { lower: l, upper: u, lowerOpen: !!lo, upperOpen: !!uo }; }, 'bound');

  // ── window.external（被某些检测脚本使用）──
  var external = {
    AddSearchProvider: makeNative(function(engineURL) {}, 'AddSearchProvider'),
    IsSearchProviderInstalled: makeNative(function(engineURL) { return 0; }, 'IsSearchProviderInstalled')
  };

  // ── CSS 对象 ──
  var CSS = {
    supports: makeNative(function(property, value) {
      return false;
    }, 'supports'),
    escape: makeNative(function(value) {
      return String(value).replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\\\$&');
    }, 'escape'),
    registerProperty: makeNative(function(propertyDefinition) {}, 'registerProperty'),
    paintWorklet: {
      addModule: makeNative(function(moduleURL) { return Promise.resolve(); }, 'addModule')
    }
  };

  // ── 安装到 sandbox ──
  sandbox.MutationObserver = MutationObserver;
  sandbox.MutationRecord = MutationRecord;
  sandbox.IntersectionObserver = IntersectionObserver;
  sandbox.IntersectionObserverEntry = function IntersectionObserverEntry() {};
  makeNative(sandbox.IntersectionObserverEntry, 'IntersectionObserverEntry');
  sandbox.ResizeObserver = ResizeObserver;
  sandbox.ResizeObserverEntry = ResizeObserverEntry;
  sandbox.PerformanceObserver = PerformanceObserver;
  sandbox.PerformanceObserverEntryList = PerformanceObserverEntryList;
  sandbox.MediaQueryList = MediaQueryList;
  sandbox.matchMedia = makeNative(matchMedia, 'matchMedia');
  sandbox.external = external;
  sandbox.CSS = CSS;
  
  // indexedDB
  sandbox.indexedDB = indexedDB;
  sandbox.IDBFactory = IDBFactory;
  sandbox.IDBRequest = IDBRequest;
  sandbox.IDBDatabase = IDBDatabase;
  sandbox.IDBIndex = IDBIndex;
  sandbox.IDBObjectStore = IDBObjectStore;
  sandbox.IDBTransaction = IDBTransaction;
  sandbox.IDBCursor = IDBCursor;
  sandbox.IDBCursorWithValue = IDBCursorWithValue;
  sandbox.IDBKeyRange = IDBKeyRange;
  
  // 确保 window.indexedDB 也存在
  if (sandbox.window) {
    sandbox.window.indexedDB = indexedDB;
  }

  // ── CSSStyleDeclaration ──
  function CSSStyleDeclaration() {}
  makeNative(CSSStyleDeclaration, 'CSSStyleDeclaration');

  // ── getComputedStyle ──
  function getComputedStyle(element, pseudoElement) {
    // 浏览器默认计算样式（桌面 Chrome 标准值）
    var defaults = {
      'display': 'block', 'visibility': 'visible', 'opacity': '1',
      'position': 'static', 'overflow': 'visible', 'float': 'none',
      'z-index': 'auto', 'width': 'auto', 'height': 'auto',
      'max-width': 'none', 'max-height': 'none', 'min-width': '0px', 'min-height': '0px',
      'margin-top': '0px', 'margin-right': '0px', 'margin-bottom': '0px', 'margin-left': '0px',
      'padding-top': '0px', 'padding-right': '0px', 'padding-bottom': '0px', 'padding-left': '0px',
      'border-top-width': '0px', 'border-right-width': '0px', 'border-bottom-width': '0px', 'border-left-width': '0px',
      'border-top-style': 'none', 'border-right-style': 'none', 'border-bottom-style': 'none', 'border-left-style': 'none',
      'color': 'rgb(0, 0, 0)', 'background-color': 'rgba(0, 0, 0, 0)',
      'font-family': '"Times New Roman"', 'font-size': '16px', 'font-weight': '400', 'font-style': 'normal',
      'line-height': 'normal', 'text-align': 'start', 'text-decoration': 'none solid rgb(0, 0, 0)',
      'cursor': 'auto', 'box-sizing': 'content-box', 'transform': 'none',
      'top': 'auto', 'right': 'auto', 'bottom': 'auto', 'left': 'auto'
    };

    var decl = Object.create(CSSStyleDeclaration.prototype);
    decl.cssText = '';
    decl.parentRule = null;
    decl._keys = Object.keys(defaults);
    decl.length = decl._keys.length;

    // 读取元素内联样式覆盖默认值
    if (element && element.style) {
      for (var k$$ in element.style) {
        if (Object.prototype.hasOwnProperty && !Object.prototype.hasOwnProperty.call(element.style, k$$)) continue;
        var v$$ = element.style[k$$];
        if (v$$ && typeof v$$ === 'string' && v$$ !== '' && k$$.charAt(0) !== '_' && k$$ !== 'cssText') {
          var dash$$ = k$$.replace(/([A-Z])/g, '-$1').toLowerCase();
          if (dash$$ in defaults) defaults[dash$$] = v$$;
        }
      }
    }

    // 设置属性（dash 和 camelCase 都设置）
    for (var di = 0; di < decl._keys.length; di++) {
      (function(prop$$, val$$) {
        decl[prop$$] = val$$;
        var camel$$ = prop$$.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
        if (camel$$ !== prop$$) decl[camel$$] = val$$;
      })(decl._keys[di], defaults[decl._keys[di]]);
    }

    decl.getPropertyValue = makeNative(function(property) {
      var v = decl[property];
      if (v !== undefined) return String(v);
      var camel = property.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
      v = decl[camel];
      return v !== undefined ? String(v) : '';
    }, 'getPropertyValue');

    decl.setProperty = makeNative(function(property, value) {
      decl[property] = value;
      var camel = property.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
      if (camel !== property) decl[camel] = value;
    }, 'setProperty');

    decl.removeProperty = makeNative(function(property) {
      var old = decl[property] || '';
      delete decl[property];
      var camel = property.replace(/-([a-z])/g, function(m, c) { return c.toUpperCase(); });
      delete decl[camel];
      return old;
    }, 'removeProperty');

    decl.item = makeNative(function(index) {
      return this._keys[index] || null;
    }, 'item');

    return decl;
  }
  makeNative(getComputedStyle, 'getComputedStyle');

  // ── CSSRule 及相关常量（部分网站依赖 CSSRule 类型判断）──
  function CSSRule() {}
  makeNative(CSSRule, 'CSSRule');
  // 常见 type 常量
  CSSRule.STYLE_RULE = 1;
  CSSRule.CHARSET_RULE = 2;
  CSSRule.IMPORT_RULE = 3;
  CSSRule.MEDIA_RULE = 4;
  CSSRule.FONT_FACE_RULE = 5;
  CSSRule.PAGE_RULE = 6;
  CSSRule.KEYFRAMES_RULE = 7;
  CSSRule.KEYFRAME_RULE = 8;
  CSSRule.NAMESPACE_RULE = 10;
  CSSRule.COUNTER_STYLE_RULE = 11;
  CSSRule.SUPPORTS_RULE = 12;
  CSSRule.DOCUMENT_RULE = 13;
  CSSRule.FONT_FEATURE_VALUES_RULE = 14;
  CSSRule.VIEWPORT_RULE = 15;
  CSSRule.REGION_STYLE_RULE = 16;

  // CSSStyleRule 等子类（最小实现）
  function CSSStyleRule() {}
  makeNative(CSSStyleRule, 'CSSStyleRule');
  Object.setPrototypeOf(CSSStyleRule.prototype, CSSRule.prototype);
  CSSStyleRule.prototype.constructor = CSSStyleRule;

  function CSSMediaRule() {}
  makeNative(CSSMediaRule, 'CSSMediaRule');
  Object.setPrototypeOf(CSSMediaRule.prototype, CSSRule.prototype);

  function CSSKeyframesRule() {}
  makeNative(CSSKeyframesRule, 'CSSKeyframesRule');
  Object.setPrototypeOf(CSSKeyframesRule.prototype, CSSRule.prototype);

  function CSSKeyframeRule() {}
  makeNative(CSSKeyframeRule, 'CSSKeyframeRule');
  Object.setPrototypeOf(CSSKeyframeRule.prototype, CSSRule.prototype);

  function CSSImportRule() {}
  makeNative(CSSImportRule, 'CSSImportRule');
  Object.setPrototypeOf(CSSImportRule.prototype, CSSRule.prototype);

  function CSSFontFaceRule() {}
  makeNative(CSSFontFaceRule, 'CSSFontFaceRule');
  Object.setPrototypeOf(CSSFontFaceRule.prototype, CSSRule.prototype);

  function CSSStyleSheet() {}
  makeNative(CSSStyleSheet, 'CSSStyleSheet');

  // ── 安装到 sandbox ──
  sandbox.CSSStyleDeclaration = CSSStyleDeclaration;
  sandbox.CSSRule = CSSRule;
  sandbox.CSSStyleRule = CSSStyleRule;
  sandbox.CSSMediaRule = CSSMediaRule;
  sandbox.CSSKeyframesRule = CSSKeyframesRule;
  sandbox.CSSKeyframeRule = CSSKeyframeRule;
  sandbox.CSSImportRule = CSSImportRule;
  sandbox.CSSFontFaceRule = CSSFontFaceRule;
  sandbox.CSSStyleSheet = CSSStyleSheet;
  sandbox.getComputedStyle = getComputedStyle;
  if (sandbox.window) {
    sandbox.window.getComputedStyle = getComputedStyle;
    sandbox.window.CSSStyleDeclaration = CSSStyleDeclaration;
    sandbox.window.CSSRule = CSSRule;
    sandbox.window.CSSStyleRule = CSSStyleRule;
    sandbox.window.CSSMediaRule = CSSMediaRule;
    sandbox.window.CSSKeyframesRule = CSSKeyframesRule;
    sandbox.window.CSSKeyframeRule = CSSKeyframeRule;
    sandbox.window.CSSImportRule = CSSImportRule;
    sandbox.window.CSSFontFaceRule = CSSFontFaceRule;
    sandbox.window.CSSStyleSheet = CSSStyleSheet;
  }
}

module.exports = { install };
