'use strict';

const { makeNative, defineProp, defineGetter, defineConstant } = require('../lib/guard');

/**
 * document 模块
 *
 * 浏览器 DOM 的顶层对象。包含：
 * - documentElement (<html>)
 * - head (<head>)
 * - body (<body>)
 * - createElement / querySelector / getElementById
 * - cookie
 * - readyState, hidden, visibilityState
 * - document.all (特殊对象)
 * - createEvent, addEventListener, createComment, etc.
 */

function install(sandbox, config = {}) {
  const cfg = config.document || {};

  // ── 简化 DOM 节点 ──
  // 使用最简实现：只保证接口存在，不依赖完整 DOM 树

  function Node() {}
  makeNative(Node, 'Node');
  // Node 常量（在构造函数上，不可枚举、不可写、不可配置）
  Object.defineProperty(Node, 'ELEMENT_NODE', { value: 1, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node, 'TEXT_NODE', { value: 3, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node, 'COMMENT_NODE', { value: 8, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node, 'DOCUMENT_NODE', { value: 9, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node, 'DOCUMENT_FRAGMENT_NODE', { value: 11, writable: false, configurable: false, enumerable: false });
  // 同时在 prototype 上也放一份（不可枚举）
  Object.defineProperty(Node.prototype, 'ELEMENT_NODE', { value: 1, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node.prototype, 'TEXT_NODE', { value: 3, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node.prototype, 'COMMENT_NODE', { value: 8, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node.prototype, 'DOCUMENT_NODE', { value: 9, writable: false, configurable: false, enumerable: false });
  Object.defineProperty(Node.prototype, 'DOCUMENT_FRAGMENT_NODE', { value: 11, writable: false, configurable: false, enumerable: false });

  function Element() {}
  makeNative(Element, 'Element');
  Object.setPrototypeOf(Element.prototype, Node.prototype);

  function HTMLElement() {}
  makeNative(HTMLElement, 'HTMLElement');
  Object.setPrototypeOf(HTMLElement.prototype, Element.prototype);

  function HTMLHtmlElement() {}
  makeNative(HTMLHtmlElement, 'HTMLHtmlElement');
  Object.setPrototypeOf(HTMLHtmlElement.prototype, HTMLElement.prototype);

  function HTMLHeadElement() {}
  makeNative(HTMLHeadElement, 'HTMLHeadElement');
  Object.setPrototypeOf(HTMLHeadElement.prototype, HTMLElement.prototype);

  function HTMLBodyElement() {}
  makeNative(HTMLBodyElement, 'HTMLBodyElement');
  Object.setPrototypeOf(HTMLBodyElement.prototype, HTMLElement.prototype);

  function HTMLScriptElement() {}
  makeNative(HTMLScriptElement, 'HTMLScriptElement');
  Object.setPrototypeOf(HTMLScriptElement.prototype, HTMLElement.prototype);

  function HTMLStyleElement() {}
  makeNative(HTMLStyleElement, 'HTMLStyleElement');
  Object.setPrototypeOf(HTMLStyleElement.prototype, HTMLElement.prototype);

  function HTMLDivElement() {}
  makeNative(HTMLDivElement, 'HTMLDivElement');
  Object.setPrototypeOf(HTMLDivElement.prototype, HTMLElement.prototype);

  function HTMLAnchorElement() {}
  makeNative(HTMLAnchorElement, 'HTMLAnchorElement');
  Object.setPrototypeOf(HTMLAnchorElement.prototype, HTMLElement.prototype);

  function HTMLCanvasElement() {}
  makeNative(HTMLCanvasElement, 'HTMLCanvasElement');
  Object.setPrototypeOf(HTMLCanvasElement.prototype, HTMLElement.prototype);

  function HTMLImageElement() {}
  makeNative(HTMLImageElement, 'HTMLImageElement');
  Object.setPrototypeOf(HTMLImageElement.prototype, HTMLElement.prototype);

  function HTMLAudioElement() {}
  makeNative(HTMLAudioElement, 'HTMLAudioElement');
  Object.setPrototypeOf(HTMLAudioElement.prototype, HTMLElement.prototype);

  function Image(width, height) {
    var img = new HTMLImageElement();
    if (width !== undefined) img.width = width;
    if (height !== undefined) img.height = height;
    return img;
  }
  makeNative(Image, 'Image');

  function Comment() {}
  makeNative(Comment, 'Comment');
  Object.setPrototypeOf(Comment.prototype, Node.prototype);
  Comment.prototype.nodeType = 8;

  // 简单实现 createElement
  const tagMap = {
    div: HTMLDivElement,
    a: HTMLAnchorElement,
    script: HTMLScriptElement,
    style: HTMLStyleElement,
    canvas: HTMLCanvasElement,
    audio: HTMLAudioElement,
    html: HTMLHtmlElement,
    head: HTMLHeadElement,
    body: HTMLBodyElement
  };

  // DOMTokenList (classList) 实现
  function DOMTokenList(el, attrName) {
    this._el = el;
    this._attr = attrName;
  }
  makeNative(DOMTokenList, 'DOMTokenList');
  DOMTokenList.prototype = {
    get length() { return this._el.className ? this._el.className.split(/\s+/).filter(Boolean).length : 0; },
    item: makeNative(function(index) {
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      return tokens[index] || null;
    }, 'item'),
    contains: makeNative(function(token) {
      if (typeof token !== 'string') return false;
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      return tokens.indexOf(token) !== -1;
    }, 'contains'),
    add: makeNative(function() {
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      for (var i = 0; i < arguments.length; i++) {
        if (tokens.indexOf(arguments[i]) === -1) tokens.push(arguments[i]);
      }
      this._el.className = tokens.join(' ');
    }, 'add'),
    remove: makeNative(function() {
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      for (var i = 0; i < arguments.length; i++) {
        var idx = tokens.indexOf(arguments[i]);
        if (idx !== -1) tokens.splice(idx, 1);
      }
      this._el.className = tokens.join(' ');
    }, 'remove'),
    toggle: makeNative(function(token, force) {
      var has = this.contains(token);
      if (force === true) { if (!has) this.add(token); return true; }
      if (force === false) { if (has) this.remove(token); return false; }
      if (has) { this.remove(token); return false; }
      this.add(token); return true;
    }, 'toggle'),
    replace: makeNative(function(oldToken, newToken) {
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      var idx = tokens.indexOf(oldToken);
      if (idx === -1) return false;
      tokens[idx] = newToken;
      this._el.className = tokens.join(' ');
      return true;
    }, 'replace'),
    toString: makeNative(function() { return this._el.className; }, 'toString'),
    values: makeNative(function() {
      return this._el.className.split(/\s+/).filter(Boolean).values();
    }, 'values'),
    entries: makeNative(function() {
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      return tokens.entries();
    }, 'entries'),
    keys: makeNative(function() {
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      return tokens.keys();
    }, 'keys'),
    forEach: makeNative(function(callback, thisArg) {
      var tokens = this._el.className.split(/\s+/).filter(Boolean);
      tokens.forEach(function(t, i) { callback.call(thisArg, t, i, this); }, this);
    }, 'forEach')
  };
  // length getter 修复
  Object.defineProperty(DOMTokenList.prototype, 'length', {
    get: makeNative(function() { return this._el.className ? this._el.className.split(/\s+/).filter(Boolean).length : 0; }, 'get length'),
    configurable: true, enumerable: true
  });

  function createDOMTokenList(el, attrName) {
    var d = new DOMTokenList(el, attrName);
    return d;
  }

  // ── NodeList / HTMLCollection ──
  function NodeList(items) {
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i++) this[i] = items[i];
    }
    this.length = items ? items.length : 0;
  }
  makeNative(NodeList, 'NodeList');
  NodeList.prototype = {
    item: makeNative(function item(index) { return this[index] || null; }, 'item'),
    entries: makeNative(function entries() {
      var arr = []; for (var i = 0; i < this.length; i++) arr.push([i, this[i]]); return arr.entries();
    }, 'entries'),
    keys: makeNative(function keys() {
      var arr = []; for (var i = 0; i < this.length; i++) arr.push(i); return arr.keys();
    }, 'keys'),
    values: makeNative(function values() {
      var arr = []; for (var i = 0; i < this.length; i++) arr.push(this[i]); return arr.values();
    }, 'values'),
    forEach: makeNative(function forEach(callback, thisArg) {
      for (var i = 0; i < this.length; i++) callback.call(thisArg, this[i], i, this);
    }, 'forEach'),
    toString: makeNative(function toString() { return '[object NodeList]'; }, 'toString')
  };
  Object.defineProperty(NodeList.prototype, 'constructor', {
    value: NodeList, writable: true, configurable: true, enumerable: false
  });
  NodeList.prototype[Symbol.iterator] = makeNative(function() {
    var self = this, idx = 0;
    return { next: function() {
      if (idx >= self.length) return { done: true, value: undefined };
      return { done: false, value: self[idx++] };
    }};
  }, '[Symbol.iterator]');

  function HTMLCollection(items) {
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i++) this[i] = items[i];
    }
    this.length = items ? items.length : 0;
  }
  makeNative(HTMLCollection, 'HTMLCollection');
  HTMLCollection.prototype = {
    item: makeNative(function item(index) { return this[index] || null; }, 'item'),
    namedItem: makeNative(function namedItem(name) {
      for (var i = 0; i < this.length; i++) {
        if (this[i].id === name || this[i].name === name) return this[i];
      }
      return null;
    }, 'namedItem'),
    toString: makeNative(function toString() { return '[object HTMLCollection]'; }, 'toString')
  };
  Object.defineProperty(HTMLCollection.prototype, 'constructor', {
    value: HTMLCollection, writable: true, configurable: true, enumerable: false
  });
  HTMLCollection.prototype[Symbol.iterator] = makeNative(function() {
    var self = this, idx = 0;
    return { next: function() {
      if (idx >= self.length) return { done: true, value: undefined };
      return { done: false, value: self[idx++] };
    }};
  }, '[Symbol.iterator]');

  // ── DOM 树遍历辅助 ──
  function walk(root, filter) {
    var result = [];
    function visit(node) {
      if (!node || node.nodeType !== 1) return;
      if (filter(node)) result.push(node);
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) visit(node.children[i]);
      }
    }
    visit(root);
    return result;
  }

  function collectDescendants(root) {
    var result = [];
    function visit(node) {
      if (!node || node.nodeType !== 1) return;
      if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
          result.push(node.children[i]);
          visit(node.children[i]);
        }
      }
    }
    visit(root);
    return result;
  }

  function matchesSelector(el, selector) {
    // 极简化实现：支持 #id、.class、tagname 以及它们的组合
    var parts = selector.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return false;
    var current = el;
    for (var i = parts.length - 1; i >= 0; i--) {
      if (!current || current.nodeType !== 1) return false;
      if (!matchSimple(current, parts[i])) return false;
      if (i > 0) {
        current = current.parentElement;
      }
    }
    return true;
  }

  function matchSimple(el, part) {
    var m = part.match(/^([a-zA-Z0-9_-]+)?(#[a-zA-Z0-9_-]+)?((?:\.[a-zA-Z0-9_-]+)*)$/);
    if (!m) return false;
    var tag = m[1];
    var id = m[2] ? m[2].slice(1) : null;
    var classes = m[3] ? m[3].split('.').filter(Boolean) : [];
    if (tag && el.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    if (id && el.id !== id) return false;
    for (var i = 0; i < classes.length; i++) {
      if (!el.classList.contains(classes[i])) return false;
    }
    return true;
  }

  function makeEl(tagName) {
    const Ctor = tagMap[tagName.toLowerCase()] || HTMLElement;
    const el = {};
    el.__proto__ = Ctor.prototype;
    el.tagName = tagName.toUpperCase();
    el.nodeType = 1;
    el.nodeName = tagName.toUpperCase();
    el.localName = tagName.toLowerCase();
    el.id = '';
    el.className = '';
    el.classList = createDOMTokenList(el, 'className');
    el.style = {};
    el.attributes = {};
    el.children = [];
    el.childNodes = [];
    el.parentNode = null;
    el.parentElement = null;
    el.innerHTML = '';
    Object.defineProperty(el, 'textContent', {
      get: makeNative(function() {
        var result = '';
        for (var i = 0; i < this.childNodes.length; i++) {
          var node = this.childNodes[i];
          if (node.nodeType === 3) {
            result += node.data || '';
          } else if (node.nodeType === 1) {
            result += node.textContent || '';
          }
        }
        return result;
      }, 'get textContent'),
      set: makeNative(function(value) {
        while (this.firstChild) {
          this.removeChild(this.firstChild);
        }
        if (value !== null && value !== undefined) {
          this.appendChild(document.createTextNode(String(value)));
        }
      }, 'set textContent'),
      configurable: true,
      enumerable: true
    });
    el.ownerDocument = null;
    el.isConnected = false;
    el.namespaceURI = tagName.toLowerCase() === 'html' ? 'http://www.w3.org/1999/xhtml' : null;
    el.prefix = null;
    el.offsetWidth = 0;
    el.offsetHeight = 0;
    el.offsetLeft = 0;
    el.offsetTop = 0;
    el.clientWidth = 0;
    el.clientHeight = 0;
    el.clientLeft = 0;
    el.clientTop = 0;
    el.scrollWidth = 0;
    el.scrollHeight = 0;
    el.scrollLeft = 0;
    el.scrollTop = 0;
    el.getBoundingClientRect = makeNative(function() {
      return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0, x: 0, y: 0 };
    }, 'getBoundingClientRect');
    el.getAttribute = makeNative(function(name) { return el.attributes[name] || null; }, 'getAttribute');
    el.setAttribute = makeNative(function(name, value) { el.attributes[name] = String(value); }, 'setAttribute');
    el.removeAttribute = makeNative(function(name) { delete el.attributes[name]; }, 'removeAttribute');
    el.hasAttribute = makeNative(function(name) { return name in el.attributes; }, 'hasAttribute');
    el._listeners = {};
    el.addEventListener = makeNative(function(type, cb, opts) {
      if (!el._listeners[type]) el._listeners[type] = [];
      if (!el._listeners[type].includes(cb)) el._listeners[type].push(cb);
    }, 'addEventListener');
    el.removeEventListener = makeNative(function(type, cb, opts) {
      if (!el._listeners[type]) return;
      el._listeners[type] = el._listeners[type].filter(c => c !== cb);
    }, 'removeEventListener');
    el.dispatchEvent = makeNative(function(event) {
      event.target = el;
      event.currentTarget = el;
      // 调用该类型的所有监听器
      var list = el._listeners[event.type];
      if (list) {
        var listCopy = list.slice();
        for (var i = 0; i < listCopy.length; i++) {
          if (event._immediatePropagationStopped) break;
          listCopy[i].call(el, event);
        }
      }
      // 调用 on* 处理程序
      var handlerKey = 'on' + event.type;
      if (typeof el[handlerKey] === 'function') {
        el[handlerKey].call(el, event);
      }
      return !event.defaultPrevented;
    }, 'dispatchEvent');
    el.appendChild = makeNative(function(child) {
      if (child && child.parentNode) child.parentNode.removeChild(child);
      child.parentNode = el;
      child.parentElement = el;
      el.childNodes.push(child);
      el.children.push(child);
      child.ownerDocument = el.ownerDocument;
      child.isConnected = el.isConnected || el.ownerDocument != null;
      return child;
    }, 'appendChild');
    el.removeChild = makeNative(function(child) {
      const idx = el.childNodes.indexOf(child);
      if (idx >= 0) el.childNodes.splice(idx, 1);
      const idx2 = el.children.indexOf(child);
      if (idx2 >= 0) el.children.splice(idx2, 1);
      return child;
    }, 'removeChild');
    el.insertBefore = makeNative(function(newNode, refNode) {
      newNode.parentNode = el;
      newNode.parentElement = el;
      return newNode;
    }, 'insertBefore');
    el.replaceChild = makeNative(function(newChild, oldChild) {
      const idx = el.childNodes.indexOf(oldChild);
      if (idx >= 0) el.childNodes[idx] = newChild;
      newChild.parentNode = el;
      return oldChild;
    }, 'replaceChild');
    el.cloneNode = makeNative(function(deep) {
      var copy = makeEl(tagName);
      copy.id = el.id;
      copy.className = el.className;
      copy.ownerDocument = el.ownerDocument;
      if (deep && el.children) {
        for (var i = 0; i < el.children.length; i++) {
          copy.appendChild(el.children[i].cloneNode(true));
        }
      }
      return copy;
    }, 'cloneNode');
    el.querySelector = makeNative(function(sel) {
      var all = collectDescendants(el);
      for (var i = 0; i < all.length; i++) {
        if (matchesSelector(all[i], sel)) return all[i];
      }
      return null;
    }, 'querySelector');
    el.querySelectorAll = makeNative(function(sel) {
      var all = collectDescendants(el);
      var matched = [];
      for (var i = 0; i < all.length; i++) {
        if (matchesSelector(all[i], sel)) matched.push(all[i]);
      }
      return new NodeList(matched);
    }, 'querySelectorAll');
    el.matches = makeNative(function(sel) { return matchSimple(el, sel); }, 'matches');
    el.closest = makeNative(function(sel) {
      var node = el;
      while (node) {
        if (matchSimple(node, sel)) return node;
        node = node.parentElement;
      }
      return null;
    }, 'closest');
    el.contains = makeNative(function(other) {
      if (other === el) return true;
      var all = collectDescendants(el);
      return all.indexOf(other) !== -1;
    }, 'contains');
    el.getRootNode = makeNative(function() {
      var node = el;
      while (node.parentNode) node = node.parentNode;
      return node;
    }, 'getRootNode');
    el.isSameNode = makeNative(function(other) { return el === other; }, 'isSameNode');
    el.scrollIntoView = makeNative(function() {}, 'scrollIntoView');
    el.focus = makeNative(function() {}, 'focus');
    el.blur = makeNative(function() {}, 'blur');
    el.click = makeNative(function() {}, 'click');
    return el;
  }

  // ── document.all 特殊对象 ──
  // document.all 是唯一的：typeof document.all === 'undefined'，但作为对象存在
  // 这是 JS 引擎的 [[IsHTMLDDA]] 内部槽位行为，无法完美模拟 typeof。
  // 我们通过 Symbol.toPrimitive 和 valueOf 来近似 == undefined 行为。
  // Proxy target 使用函数以实现可调用行为（document.all('id')）
  var _allElements = []; // 内部元素列表，在 document 创建后填充

  function _documentAllCall() {}
  var documentAll = new Proxy(_documentAllCall, {
    get: function(target, prop) {
      // 数字索引
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        return _allElements[parseInt(prop, 10)];
      }
      if (typeof prop === 'number') {
        return _allElements[prop];
      }
      // Symbol
      if (typeof prop === 'symbol') {
        if (prop === Symbol.iterator) {
          return makeNative(function() {
            var idx = 0;
            return { next: function() {
              if (idx >= _allElements.length) return { done: true, value: undefined };
              return { done: false, value: _allElements[idx++] };
            }};
          }, '[Symbol.iterator]');
        }
        if (prop === Symbol.toPrimitive) {
          return makeNative(function(hint) { return undefined; }, '[Symbol.toPrimitive]');
        }
        if (prop === Symbol.toStringTag) {
          return 'HTMLAllCollection';
        }
        return undefined;
      }
      // 标准属性
      if (prop === 'length') return _allElements.length;
      if (prop === 'item') {
        return makeNative(function(index) {
          return _allElements[index] || null;
        }, 'item');
      }
      if (prop === 'namedItem') {
        return makeNative(function(name) {
          for (var i = 0; i < _allElements.length; i++) {
            if (_allElements[i].id === name || _allElements[i].name === name) {
              return _allElements[i];
            }
          }
          return null;
        }, 'namedItem');
      }
      if (prop === 'tags') {
        return makeNative(function(tagName) {
          var result = [];
          var upper = tagName ? tagName.toUpperCase() : '';
          for (var i = 0; i < _allElements.length; i++) {
            if (_allElements[i].tagName === upper) result.push(_allElements[i]);
          }
          return result;
        }, 'tags');
      }
      if (prop === 'toString') return makeNative(function() { return '[object HTMLAllCollection]'; }, 'toString');
      if (prop === 'toLocaleString') return makeNative(function() { return '[object HTMLAllCollection]'; }, 'toLocaleString');
      if (prop === 'valueOf') return makeNative(function() { return undefined; }, 'valueOf');
      
      // 按 id 或 name 查找元素（namedItem 的快捷方式）
      for (var i = 0; i < _allElements.length; i++) {
        if (_allElements[i].id === prop) return _allElements[i];
        if (_allElements[i].name === prop) return _allElements[i];
      }
      
      return undefined;
    },
    set: function(target, prop, value) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        _allElements[parseInt(prop, 10)] = value;
      }
      return true;
    },
    has: function(target, prop) {
      if (typeof prop === 'number') return prop < _allElements.length;
      if (typeof prop === 'string' && /^\d+$/.test(prop)) return parseInt(prop, 10) < _allElements.length;
      if (prop === 'length' || prop === 'item' || prop === 'namedItem' || prop === 'tags' ||
          prop === 'toString' || prop === 'toLocaleString' || prop === 'valueOf' ||
          prop === Symbol.iterator || prop === Symbol.toPrimitive || prop === Symbol.toStringTag) return true;
      for (var i = 0; i < _allElements.length; i++) {
        if (_allElements[i].id === prop || _allElements[i].name === prop) return true;
      }
      return false;
    },
    ownKeys: function(target) {
      var keys = ['length', 'prototype', 'arguments', 'caller', 'name'];
      for (var i = 0; i < _allElements.length; i++) {
        keys.push(String(i));
        if (_allElements[i].id) keys.push(_allElements[i].id);
      }
      return keys;
    },
    getOwnPropertyDescriptor: function(target, prop) {
      if (typeof prop === 'string' && /^\d+$/.test(prop)) {
        var idx = parseInt(prop, 10);
        if (idx < _allElements.length) {
          return { value: _allElements[idx], writable: true, configurable: true, enumerable: true };
        }
      }
      if (prop === 'length') {
        return { value: _allElements.length, writable: false, configurable: true, enumerable: true };
      }
      if (prop === Symbol.toStringTag) {
        return { value: 'HTMLAllCollection', writable: false, configurable: true, enumerable: false };
      }
      if (prop === Symbol.iterator || prop === Symbol.toPrimitive) {
        return { value: this.get(target, prop), writable: false, configurable: true, enumerable: false };
      }
      // 函数自有属性委托给目标
      return Reflect.getOwnPropertyDescriptor(target, prop);
    },
    // 可调用：document.all('id') 或 document.all('name')
    apply: function(target, thisArg, args) {
      if (args.length === 1) {
        var name = String(args[0]);
        for (var i = 0; i < _allElements.length; i++) {
          if (_allElements[i].id === name || _allElements[i].name === name) return _allElements[i];
        }
        return null;
      }
      return undefined;
    },
    construct: function(target, args) {
      throw new TypeError('HTMLAllCollection is not a constructor');
    },
    preventExtensions: function(target) { return true; },
    isExtensible: function(target) { return true; }
  });

  // ── 构建 document 对象 ──
  const docUrl = cfg.URL || sandbox.location?.href || 'about:blank';
  const baseUrl = cfg.baseURI || docUrl;

  const document = {
    // DOM 树
    documentElement: makeEl('html'),
    head: makeEl('head'),
    body: makeEl('body'),
    title: '',
    // 类型
    doctype: {
      name: 'html',
      publicId: '',
      systemId: '',
      nodeType: 10,
      nodeName: 'html'
    },
    implementation: {
      createHTMLDocument: makeNative(function(title) {
        var doc = {};
        doc.title = title || '';
        doc.body = makeEl('body');
        doc.documentElement = makeEl('html');
        doc.documentElement.appendChild(doc.body);
        return doc;
      }, 'createHTMLDocument'),
      createDocument: makeNative(function(ns, qname, doctype) {
        return document;
      }, 'createDocument'),
      createDocumentType: makeNative(function(qname, publicId, systemId) {
        return { name: qname, publicId: publicId || '', systemId: systemId || '', nodeType: 10, nodeName: qname };
      }, 'createDocumentType'),
      hasFeature: makeNative(function() { return true; }, 'hasFeature')
    },
    documentURI: docUrl,
    URL: docUrl,
    baseURI: baseUrl,
    domain: cfg.domain || '',
    referrer: cfg.referrer || '',
    // 状态
    readyState: cfg.readyState || 'complete',
    hidden: false,
    visibilityState: 'visible',
    // 编码
    characterSet: 'UTF-8',
    charset: 'UTF-8',
    inputEncoding: 'UTF-8',
    contentType: 'text/html',
    compatMode: 'CSS1Compat',
    scrollingElement: null,
    activeElement: null,
    // 设计模式
    designMode: 'off',
    // 默认视图
    defaultView: sandbox.window,
    // 命令
    queryCommandSupported: makeNative(function() { return false; }, 'queryCommandSupported'),
    queryCommandEnabled: makeNative(function() { return false; }, 'queryCommandEnabled'),
    queryCommandState: makeNative(function() { return false; }, 'queryCommandState'),
    queryCommandValue: makeNative(function() { return ''; }, 'queryCommandValue'),
    execCommand: makeNative(function() { return false; }, 'execCommand'),

    // ── Cookie ──
    _cookie: cfg.cookie || '',

    // ── 方法 ──
    createElement: makeNative(function createElement(tagName, options) {
      var el = makeEl(tagName);
      el.ownerDocument = document;
      if (options && options.is) el.setAttribute('is', options.is);
      return el;
    }, 'createElement'),

    createElementNS: makeNative(function createElementNS(ns, tagName) {
      var el = makeEl(tagName);
      el.ownerDocument = document;
      el.namespaceURI = ns;
      return el;
    }, 'createElementNS'),

    createTextNode: makeNative(function createTextNode(data) {
      return { nodeType: 3, nodeName: '#text', data: data, textContent: data, wholeText: data };
    }, 'createTextNode'),

    createComment: makeNative(function createComment(data) {
      return { nodeType: 8, nodeName: '#comment', data: data };
    }, 'createComment'),

    createDocumentFragment: makeNative(function createDocumentFragment() {
      return { nodeType: 11, nodeName: '#document-fragment', childNodes: [], appendChild: function(c) { this.childNodes.push(c); return c; } };
    }, 'createDocumentFragment'),

    createAttribute: makeNative(function createAttribute(name) {
      return { name, value: '', specified: true };
    }, 'createAttribute'),

    createEvent: makeNative(function createEvent(type) {
      return { type: type, bubbles: false, cancelable: false };
    }, 'createEvent'),

    getElementById: makeNative(function getElementById(id) {
      if (!id) return null;
      var all = [document.documentElement, document.head, document.body]
        .concat(collectDescendants(document.documentElement));
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) return all[i];
      }
      return null;
    }, 'getElementById'),

    getElementsByClassName: makeNative(function getElementsByClassName(name) {
      if (!name) return new HTMLCollection([]);
      var names = name.split(/\s+/).filter(Boolean);
      var all = [document.documentElement, document.head, document.body]
        .concat(collectDescendants(document.documentElement));
      var matched = [];
      for (var i = 0; i < all.length; i++) {
        var ok = true;
        for (var j = 0; j < names.length; j++) {
          if (!all[i].classList.contains(names[j])) { ok = false; break; }
        }
        if (ok) matched.push(all[i]);
      }
      return new HTMLCollection(matched);
    }, 'getElementsByClassName'),

    getElementsByTagName: makeNative(function getElementsByTagName(name) {
      var lower = name.toLowerCase();
      var all = [document.documentElement, document.head, document.body]
        .concat(collectDescendants(document.documentElement));
      var matched = [];
      for (var i = 0; i < all.length; i++) {
        if (lower === '*' || all[i].tagName.toLowerCase() === lower) matched.push(all[i]);
      }
      return new HTMLCollection(matched);
    }, 'getElementsByTagName'),

    getElementsByName: makeNative(function getElementsByName(name) {
      if (!name) return new NodeList([]);
      var all = [document.documentElement, document.head, document.body]
        .concat(collectDescendants(document.documentElement));
      var matched = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].name === name) matched.push(all[i]);
      }
      return new NodeList(matched);
    }, 'getElementsByName'),

    querySelector: makeNative(function querySelector(selector) {
      var all = [document.documentElement, document.head, document.body]
        .concat(collectDescendants(document.documentElement));
      for (var i = 0; i < all.length; i++) {
        if (matchesSelector(all[i], selector)) return all[i];
      }
      return null;
    }, 'querySelector'),

    querySelectorAll: makeNative(function querySelectorAll(selector) {
      var all = [document.documentElement, document.head, document.body]
        .concat(collectDescendants(document.documentElement));
      var matched = [];
      for (var i = 0; i < all.length; i++) {
        if (matchesSelector(all[i], selector)) matched.push(all[i]);
      }
      return new NodeList(matched);
    }, 'querySelectorAll'),

    hasFocus: makeNative(function hasFocus() { return true; }, 'hasFocus'),

    addEventListener: makeNative(function(type, cb, opts) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb, opts) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent'),

    write: makeNative(function write() {}, 'write'),
    writeln: makeNative(function writeln() {}, 'writeln'),
    open: makeNative(function open() { return document; }, 'open'),
    close: makeNative(function close() {}, 'close'),

    // 非标准但常用的
    documentMode: undefined,
    all: documentAll,
    forms: [],
    images: [],
    links: [],
    scripts: [],
    styleSheets: [],
    anchors: [],
    applets: [],
    embeds: [],
    plugins: [],
    adoptNode: makeNative(function(node) { return node; }, 'adoptNode'),
    importNode: makeNative(function(node, deep) { return node; }, 'importNode'),
    normalizeDocument: makeNative(function() {}, 'normalizeDocument'),
    renameNode: makeNative(function(node, ns, name) { return node; }, 'renameNode'),
    contains: makeNative(function(node) { return false; }, 'contains'),
    compareDocumentPosition: makeNative(function(node) { return 0; }, 'compareDocumentPosition')
  };

  // ── cookie 属性描述符 ──
  // 浏览器中 cookie 是 HTMLDocument.prototype 上的访问器属性，不可枚举
  Object.defineProperty(document, 'cookie', {
    get: makeNative(function() { return document._cookie; }, 'get cookie'),
    set: makeNative(function(v) { document._cookie = String(v); }, 'set cookie'),
    configurable: false,
    enumerable: false
  });

  // 替换 document 的事件方法为真实实现
  document._listeners = {};
  document.addEventListener = makeNative(function(type, cb, opts) {
    if (!document._listeners[type]) document._listeners[type] = [];
    if (!document._listeners[type].includes(cb)) document._listeners[type].push(cb);
  }, 'addEventListener');
  document.removeEventListener = makeNative(function(type, cb, opts) {
    if (!document._listeners[type]) return;
    document._listeners[type] = document._listeners[type].filter(c => c !== cb);
  }, 'removeEventListener');
  document.dispatchEvent = makeNative(function(event) {
    event.target = document;
    event.currentTarget = document;
    var list = document._listeners[event.type];
    if (list) {
      var listCopy = list.slice();
      for (var i = 0; i < listCopy.length; i++) {
        if (event._immediatePropagationStopped) break;
        try { listCopy[i].call(document, event); } catch(e) {}
      }
    }
    var handlerKey = 'on' + event.type;
    if (typeof document[handlerKey] === 'function') {
      document[handlerKey].call(document, event);
    }
    return !event.defaultPrevented;
  }, 'dispatchEvent');

  // 修复 document.head / body / documentElement 的 ownerDocument 并构建 DOM 树
  document.documentElement.ownerDocument = document;
  document.documentElement.isConnected = true;
  document.head.ownerDocument = document;
  document.head.isConnected = true;
  document.body.ownerDocument = document;
  document.body.isConnected = true;

  // 构建 <html><head></head><body></body></html>
  document.documentElement.appendChild(document.head);
  document.documentElement.appendChild(document.body);

  // 视口尺寸与 window 一致
  var vpWidth = sandbox.innerWidth || 1920;
  var vpHeight = sandbox.innerHeight || 1080;
  document.documentElement.clientWidth = vpWidth;
  document.documentElement.clientHeight = vpHeight;
  document.documentElement.scrollWidth = vpWidth;
  document.documentElement.scrollHeight = vpHeight;
  document.body.clientWidth = vpWidth;
  document.body.clientHeight = vpHeight;

  document.scrollingElement = document.documentElement;
  document.activeElement = document.body;

  // ── 填充 document.all 的内部元素列表 ──
  // 将 document 已有的顶层元素添加到 _allElements 中
  _allElements.push(document.documentElement, document.head, document.body);
  // 为每个元素添加 name 属性（按 id 兜底）
  [document.documentElement, document.head, document.body].forEach(function(el) {
    if (!el.name) el.name = el.id || '';
  });
  // 设置 document.all 的原型指向
  function HTMLAllCollection() {}
  makeNative(HTMLAllCollection, 'HTMLAllCollection');
  Object.setPrototypeOf(document.all, HTMLAllCollection.prototype);

  // ── 安装 ──
  sandbox.Document = function Document() {};
  makeNative(sandbox.Document, 'Document');
  sandbox.HTMLDocument = function HTMLDocument() {};
  makeNative(sandbox.HTMLDocument, 'HTMLDocument');
  sandbox.XMLDocument = function XMLDocument() {};
  makeNative(sandbox.XMLDocument, 'XMLDocument');

  sandbox.Node = Node;
  sandbox.Element = Element;
  sandbox.HTMLElement = HTMLElement;
  sandbox.HTMLHtmlElement = HTMLHtmlElement;
  sandbox.HTMLHeadElement = HTMLHeadElement;
  sandbox.HTMLBodyElement = HTMLBodyElement;
  sandbox.HTMLScriptElement = HTMLScriptElement;
  sandbox.HTMLStyleElement = HTMLStyleElement;
  sandbox.HTMLDivElement = HTMLDivElement;
  sandbox.HTMLAnchorElement = HTMLAnchorElement;
  sandbox.HTMLCanvasElement = HTMLCanvasElement;
  sandbox.HTMLImageElement = HTMLImageElement;
  sandbox.HTMLAudioElement = HTMLAudioElement;
  sandbox.Image = Image;
  sandbox.Comment = Comment;
  sandbox.DOMTokenList = DOMTokenList;
  sandbox.NodeList = NodeList;
  sandbox.HTMLCollection = HTMLCollection;
  sandbox.HTMLAllCollection = HTMLAllCollection;

  // 确保 DOM 构造函数的 prototype.constructor 不可枚举
  [Node, Element, HTMLElement, HTMLHtmlElement, HTMLHeadElement,
    HTMLBodyElement, HTMLScriptElement, HTMLStyleElement, HTMLDivElement,
    HTMLAnchorElement, HTMLCanvasElement, HTMLImageElement, HTMLAudioElement, Comment, HTMLAllCollection].forEach(function(ctor) {
    Object.defineProperty(ctor.prototype, 'constructor', {
      value: ctor,
      writable: true,
      configurable: true,
      enumerable: false
    });
  });

  sandbox.document = document;
  Object.setPrototypeOf(document, sandbox.Document.prototype);
}

module.exports = { install };
