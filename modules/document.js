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

  function HTMLVideoElement() {}
  makeNative(HTMLVideoElement, 'HTMLVideoElement');
  Object.setPrototypeOf(HTMLVideoElement.prototype, HTMLElement.prototype);

  function HTMLIFrameElement() {}
  makeNative(HTMLIFrameElement, 'HTMLIFrameElement');
  Object.setPrototypeOf(HTMLIFrameElement.prototype, HTMLElement.prototype);

  function HTMLInputElement() {}
  makeNative(HTMLInputElement, 'HTMLInputElement');
  Object.setPrototypeOf(HTMLInputElement.prototype, HTMLElement.prototype);

  function HTMLFormElement() {}
  makeNative(HTMLFormElement, 'HTMLFormElement');
  Object.setPrototypeOf(HTMLFormElement.prototype, HTMLElement.prototype);

  function HTMLTextAreaElement() {}
  makeNative(HTMLTextAreaElement, 'HTMLTextAreaElement');
  Object.setPrototypeOf(HTMLTextAreaElement.prototype, HTMLElement.prototype);

  function HTMLSelectElement() {}
  makeNative(HTMLSelectElement, 'HTMLSelectElement');
  Object.setPrototypeOf(HTMLSelectElement.prototype, HTMLElement.prototype);

  function HTMLOptionElement() {}
  makeNative(HTMLOptionElement, 'HTMLOptionElement');
  Object.setPrototypeOf(HTMLOptionElement.prototype, HTMLElement.prototype);

  function HTMLButtonElement() {}
  makeNative(HTMLButtonElement, 'HTMLButtonElement');
  Object.setPrototypeOf(HTMLButtonElement.prototype, HTMLElement.prototype);

  function HTMLTableElement() {}
  makeNative(HTMLTableElement, 'HTMLTableElement');
  Object.setPrototypeOf(HTMLTableElement.prototype, HTMLElement.prototype);

  function HTMLTableRowElement() {}
  makeNative(HTMLTableRowElement, 'HTMLTableRowElement');
  Object.setPrototypeOf(HTMLTableRowElement.prototype, HTMLElement.prototype);

  function HTMLTableCellElement() {}
  makeNative(HTMLTableCellElement, 'HTMLTableCellElement');
  Object.setPrototypeOf(HTMLTableCellElement.prototype, HTMLElement.prototype);

  function HTMLAnchorElement() {}
  makeNative(HTMLAnchorElement, 'HTMLAnchorElement');
  Object.setPrototypeOf(HTMLAnchorElement.prototype, HTMLElement.prototype);

  function HTMLSpanElement() {}
  makeNative(HTMLSpanElement, 'HTMLSpanElement');
  Object.setPrototypeOf(HTMLSpanElement.prototype, HTMLElement.prototype);

  function HTMLLinkElement() {}
  makeNative(HTMLLinkElement, 'HTMLLinkElement');
  Object.setPrototypeOf(HTMLLinkElement.prototype, HTMLElement.prototype);

  function HTMLMetaElement() {}
  makeNative(HTMLMetaElement, 'HTMLMetaElement');
  Object.setPrototypeOf(HTMLMetaElement.prototype, HTMLElement.prototype);

  function HTMLHeadElement() {}
  makeNative(HTMLHeadElement, 'HTMLHeadElement');
  Object.setPrototypeOf(HTMLHeadElement.prototype, HTMLElement.prototype);

  function HTMLBodyElement() {}
  makeNative(HTMLBodyElement, 'HTMLBodyElement');
  Object.setPrototypeOf(HTMLBodyElement.prototype, HTMLElement.prototype);

  function HTMLHtmlElement() {}
  makeNative(HTMLHtmlElement, 'HTMLHtmlElement');
  Object.setPrototypeOf(HTMLHtmlElement.prototype, HTMLElement.prototype);

  function HTMLScriptElement() {}
  makeNative(HTMLScriptElement, 'HTMLScriptElement');
  Object.setPrototypeOf(HTMLScriptElement.prototype, HTMLElement.prototype);

  function HTMLStyleElement() {}
  makeNative(HTMLStyleElement, 'HTMLStyleElement');
  Object.setPrototypeOf(HTMLStyleElement.prototype, HTMLElement.prototype);

  function HTMLDivElement() {}
  makeNative(HTMLDivElement, 'HTMLDivElement');
  Object.setPrototypeOf(HTMLDivElement.prototype, HTMLElement.prototype);

  function HTMLCanvasElement() {}
  makeNative(HTMLCanvasElement, 'HTMLCanvasElement');
  Object.setPrototypeOf(HTMLCanvasElement.prototype, HTMLElement.prototype);

  function HTMLImageElement() {}
  makeNative(HTMLImageElement, 'HTMLImageElement');
  Object.setPrototypeOf(HTMLImageElement.prototype, HTMLElement.prototype);

  function HTMLParagraphElement() {}
  makeNative(HTMLParagraphElement, 'HTMLParagraphElement');
  Object.setPrototypeOf(HTMLParagraphElement.prototype, HTMLElement.prototype);

  function HTMLHeadingElement() {}
  makeNative(HTMLHeadingElement, 'HTMLHeadingElement');
  Object.setPrototypeOf(HTMLHeadingElement.prototype, HTMLElement.prototype);

  function HTMLUnorderedListElement() {}
  makeNative(HTMLUnorderedListElement, 'HTMLUnorderedListElement');
  Object.setPrototypeOf(HTMLUnorderedListElement.prototype, HTMLElement.prototype);

  function HTMLOListElement() {}
  makeNative(HTMLOListElement, 'HTMLOListElement');
  Object.setPrototypeOf(HTMLOListElement.prototype, HTMLElement.prototype);

  function HTMLLIElement() {}
  makeNative(HTMLLIElement, 'HTMLLIElement');
  Object.setPrototypeOf(HTMLLIElement.prototype, HTMLElement.prototype);

  function HTMLDListElement() {}
  makeNative(HTMLDListElement, 'HTMLDListElement');
  Object.setPrototypeOf(HTMLDListElement.prototype, HTMLElement.prototype);

  function HTMLQuoteElement() {}
  makeNative(HTMLQuoteElement, 'HTMLQuoteElement');
  Object.setPrototypeOf(HTMLQuoteElement.prototype, HTMLElement.prototype);

  function HTMLPreElement() {}
  makeNative(HTMLPreElement, 'HTMLPreElement');
  Object.setPrototypeOf(HTMLPreElement.prototype, HTMLElement.prototype);

  function HTMLHRElement() {}
  makeNative(HTMLHRElement, 'HTMLHRElement');
  Object.setPrototypeOf(HTMLHRElement.prototype, HTMLElement.prototype);

  function HTMLBRElement() {}
  makeNative(HTMLBRElement, 'HTMLBRElement');
  Object.setPrototypeOf(HTMLBRElement.prototype, HTMLElement.prototype);

  function HTMLBaseElement() {}
  makeNative(HTMLBaseElement, 'HTMLBaseElement');
  Object.setPrototypeOf(HTMLBaseElement.prototype, HTMLElement.prototype);

  function HTMLParamElement() {}
  makeNative(HTMLParamElement, 'HTMLParamElement');
  Object.setPrototypeOf(HTMLParamElement.prototype, HTMLElement.prototype);

  function HTMLAppletElement() {}
  makeNative(HTMLAppletElement, 'HTMLAppletElement');
  Object.setPrototypeOf(HTMLAppletElement.prototype, HTMLElement.prototype);

  function HTMLFrameElement() {}
  makeNative(HTMLFrameElement, 'HTMLFrameElement');
  Object.setPrototypeOf(HTMLFrameElement.prototype, HTMLElement.prototype);

  function HTMLFrameSetElement() {}
  makeNative(HTMLFrameSetElement, 'HTMLFrameSetElement');
  Object.setPrototypeOf(HTMLFrameSetElement.prototype, HTMLElement.prototype);

  function HTMLMarqueeElement() {}
  makeNative(HTMLMarqueeElement, 'HTMLMarqueeElement');
  Object.setPrototypeOf(HTMLMarqueeElement.prototype, HTMLElement.prototype);

  function HTMLUnknownElement() {}
  makeNative(HTMLUnknownElement, 'HTMLUnknownElement');
  Object.setPrototypeOf(HTMLUnknownElement.prototype, HTMLElement.prototype);

  function HTMLDetailsElement() {}
  makeNative(HTMLDetailsElement, 'HTMLDetailsElement');
  Object.setPrototypeOf(HTMLDetailsElement.prototype, HTMLElement.prototype);

  function HTMLDialogElement() {}
  makeNative(HTMLDialogElement, 'HTMLDialogElement');
  Object.setPrototypeOf(HTMLDialogElement.prototype, HTMLElement.prototype);

  function HTMLSlotElement() {}
  makeNative(HTMLSlotElement, 'HTMLSlotElement');
  Object.setPrototypeOf(HTMLSlotElement.prototype, HTMLElement.prototype);

  function HTMLTemplateElement() {}
  makeNative(HTMLTemplateElement, 'HTMLTemplateElement');
  Object.setPrototypeOf(HTMLTemplateElement.prototype, HTMLElement.prototype);

  function HTMLShadowRoot() {}
  makeNative(HTMLShadowRoot, 'HTMLShadowRoot');
  Object.setPrototypeOf(HTMLShadowRoot.prototype, HTMLElement.prototype);

  function HTMLPictureElement() {}
  makeNative(HTMLPictureElement, 'HTMLPictureElement');
  Object.setPrototypeOf(HTMLPictureElement.prototype, HTMLElement.prototype);

  function HTMLSourceElement() {}
  makeNative(HTMLSourceElement, 'HTMLSourceElement');
  Object.setPrototypeOf(HTMLSourceElement.prototype, HTMLElement.prototype);

  function HTMLTrackElement() {}
  makeNative(HTMLTrackElement, 'HTMLTrackElement');
  Object.setPrototypeOf(HTMLTrackElement.prototype, HTMLElement.prototype);

  function HTMLMediaElement() {}
  makeNative(HTMLMediaElement, 'HTMLMediaElement');
  Object.setPrototypeOf(HTMLMediaElement.prototype, HTMLElement.prototype);

  function HTMLFormControlsCollection() {}
  makeNative(HTMLFormControlsCollection, 'HTMLFormControlsCollection');
  Object.setPrototypeOf(HTMLFormControlsCollection.prototype, HTMLCollection.prototype);

  function HTMLFieldSetElement() {}
  makeNative(HTMLFieldSetElement, 'HTMLFieldSetElement');
  Object.setPrototypeOf(HTMLFieldSetElement.prototype, HTMLElement.prototype);

  function HTMLLegendElement() {}
  makeNative(HTMLLegendElement, 'HTMLLegendElement');
  Object.setPrototypeOf(HTMLLegendElement.prototype, HTMLElement.prototype);

  function HTMLLabelElement() {}
  makeNative(HTMLLabelElement, 'HTMLLabelElement');
  Object.setPrototypeOf(HTMLLabelElement.prototype, HTMLElement.prototype);

  function HTMLMeterElement() {}
  makeNative(HTMLMeterElement, 'HTMLMeterElement');
  Object.setPrototypeOf(HTMLMeterElement.prototype, HTMLElement.prototype);

  function HTMLProgressElement() {}
  makeNative(HTMLProgressElement, 'HTMLProgressElement');
  Object.setPrototypeOf(HTMLProgressElement.prototype, HTMLElement.prototype);

  function HTMLDataElement() {}
  makeNative(HTMLDataElement, 'HTMLDataElement');
  Object.setPrototypeOf(HTMLDataElement.prototype, HTMLElement.prototype);

  function HTMLTimeElement() {}
  makeNative(HTMLTimeElement, 'HTMLTimeElement');
  Object.setPrototypeOf(HTMLTimeElement.prototype, HTMLElement.prototype);

  function HTMLRubyElement() {}
  makeNative(HTMLRubyElement, 'HTMLRubyElement');
  Object.setPrototypeOf(HTMLRubyElement.prototype, HTMLElement.prototype);

  function HTMLRTElement() {}
  makeNative(HTMLRTElement, 'HTMLRTElement');
  Object.setPrototypeOf(HTMLRTElement.prototype, HTMLElement.prototype);

  function HTMLRPElement() {}
  makeNative(HTMLRPElement, 'HTMLRPElement');
  Object.setPrototypeOf(HTMLRPElement.prototype, HTMLElement.prototype);

  function HTMLBDOElement() {}
  makeNative(HTMLBDOElement, 'HTMLBDOElement');
  Object.setPrototypeOf(HTMLBDOElement.prototype, HTMLElement.prototype);

  function HTMLCiteElement() {}
  makeNative(HTMLCiteElement, 'HTMLCiteElement');
  Object.setPrototypeOf(HTMLCiteElement.prototype, HTMLElement.prototype);

  function HTMLDFNElement() {}
  makeNative(HTMLDFNElement, 'HTMLDFNElement');
  Object.setPrototypeOf(HTMLDFNElement.prototype, HTMLElement.prototype);

  function HTMLVarElement() {}
  makeNative(HTMLVarElement, 'HTMLVarElement');
  Object.setPrototypeOf(HTMLVarElement.prototype, HTMLElement.prototype);

  function HTMLKbdElement() {}
  makeNative(HTMLKbdElement, 'HTMLKbdElement');
  Object.setPrototypeOf(HTMLKbdElement.prototype, HTMLElement.prototype);

  function HTMLSampElement() {}
  makeNative(HTMLSampElement, 'HTMLSampElement');
  Object.setPrototypeOf(HTMLSampElement.prototype, HTMLElement.prototype);

  function HTMLCodeElement() {}
  makeNative(HTMLCodeElement, 'HTMLCodeElement');
  Object.setPrototypeOf(HTMLCodeElement.prototype, HTMLElement.prototype);

  function HTMLElementElement() {}
  makeNative(HTMLElementElement, 'HTMLElementElement');
  Object.setPrototypeOf(HTMLElementElement.prototype, HTMLElement.prototype);

  function HTMLArticleElement() {}
  makeNative(HTMLArticleElement, 'HTMLArticleElement');
  Object.setPrototypeOf(HTMLArticleElement.prototype, HTMLElement.prototype);

  function HTMLAsideElement() {}
  makeNative(HTMLAsideElement, 'HTMLAsideElement');
  Object.setPrototypeOf(HTMLAsideElement.prototype, HTMLElement.prototype);

  function HTMLFooterElement() {}
  makeNative(HTMLFooterElement, 'HTMLFooterElement');
  Object.setPrototypeOf(HTMLFooterElement.prototype, HTMLElement.prototype);

  function HTMLHeaderElement() {}
  makeNative(HTMLHeaderElement, 'HTMLHeaderElement');
  Object.setPrototypeOf(HTMLHeaderElement.prototype, HTMLElement.prototype);

  function HTMLHGroupElement() {}
  makeNative(HTMLHGroupElement, 'HTMLHGroupElement');
  Object.setPrototypeOf(HTMLHGroupElement.prototype, HTMLElement.prototype);

  function HTMLMainElement() {}
  makeNative(HTMLMainElement, 'HTMLMainElement');
  Object.setPrototypeOf(HTMLMainElement.prototype, HTMLElement.prototype);

  function HTMLNavElement() {}
  makeNative(HTMLNavElement, 'HTMLNavElement');
  Object.setPrototypeOf(HTMLNavElement.prototype, HTMLElement.prototype);

  function HTMLSectionElement() {}
  makeNative(HTMLSectionElement, 'HTMLSectionElement');
  Object.setPrototypeOf(HTMLSectionElement.prototype, HTMLElement.prototype);

  function HTMLSummaryElement() {}
  makeNative(HTMLSummaryElement, 'HTMLSummaryElement');
  Object.setPrototypeOf(HTMLSummaryElement.prototype, HTMLElement.prototype);

  function HTMLMenuElement() {}
  makeNative(HTMLMenuElement, 'HTMLMenuElement');
  Object.setPrototypeOf(HTMLMenuElement.prototype, HTMLElement.prototype);

  function HTMLMenuItemElement() {}
  makeNative(HTMLMenuItemElement, 'HTMLMenuItemElement');
  Object.setPrototypeOf(HTMLMenuItemElement.prototype, HTMLElement.prototype);

  function HTMLDirectoryElement() {}
  makeNative(HTMLDirectoryElement, 'HTMLDirectoryElement');
  Object.setPrototypeOf(HTMLDirectoryElement.prototype, HTMLElement.prototype);

  function HTMLSearchElement() {}
  makeNative(HTMLSearchElement, 'HTMLSearchElement');
  Object.setPrototypeOf(HTMLSearchElement.prototype, HTMLElement.prototype);

  function HTMLSlotable() {}
  makeNative(HTMLSlotable, 'HTMLSlotable');

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

  const tagMap = {
    div: HTMLDivElement,
    a: HTMLAnchorElement,
    script: HTMLScriptElement,
    style: HTMLStyleElement,
    canvas: HTMLCanvasElement,
    audio: HTMLAudioElement,
    video: HTMLVideoElement,
    iframe: HTMLIFrameElement,
    html: HTMLHtmlElement,
    head: HTMLHeadElement,
    body: HTMLBodyElement,
    input: HTMLInputElement,
    form: HTMLFormElement,
    textarea: HTMLTextAreaElement,
    select: HTMLSelectElement,
    option: HTMLOptionElement,
    button: HTMLButtonElement,
    table: HTMLTableElement,
    tr: HTMLTableRowElement,
    td: HTMLTableCellElement,
    th: HTMLTableCellElement,
    span: HTMLSpanElement,
    link: HTMLLinkElement,
    meta: HTMLMetaElement,
    p: HTMLParagraphElement,
    h1: HTMLHeadingElement,
    h2: HTMLHeadingElement,
    h3: HTMLHeadingElement,
    h4: HTMLHeadingElement,
    h5: HTMLHeadingElement,
    h6: HTMLHeadingElement,
    ul: HTMLUnorderedListElement,
    ol: HTMLOListElement,
    li: HTMLLIElement,
    dl: HTMLDListElement,
    dt: HTMLElement,
    dd: HTMLElement,
    blockquote: HTMLQuoteElement,
    pre: HTMLPreElement,
    hr: HTMLHRElement,
    br: HTMLBRElement,
    base: HTMLBaseElement,
    param: HTMLParamElement,
    applet: HTMLAppletElement,
    frame: HTMLFrameElement,
    frameset: HTMLFrameSetElement,
    marquee: HTMLMarqueeElement,
    details: HTMLDetailsElement,
    dialog: HTMLDialogElement,
    slot: HTMLSlotElement,
    template: HTMLTemplateElement,
    picture: HTMLPictureElement,
    source: HTMLSourceElement,
    track: HTMLTrackElement,
    fieldset: HTMLFieldSetElement,
    legend: HTMLLegendElement,
    label: HTMLLabelElement,
    meter: HTMLMeterElement,
    progress: HTMLProgressElement,
    data: HTMLDataElement,
    time: HTMLTimeElement,
    ruby: HTMLRubyElement,
    rt: HTMLRTElement,
    rp: HTMLRPElement,
    bdo: HTMLBDOElement,
    cite: HTMLCiteElement,
    dfn: HTMLDFNElement,
    var: HTMLVarElement,
    kbd: HTMLKbdElement,
    samp: HTMLSampElement,
    code: HTMLCodeElement,
    article: HTMLArticleElement,
    aside: HTMLAsideElement,
    footer: HTMLFooterElement,
    header: HTMLHeaderElement,
    hgroup: HTMLHGroupElement,
    main: HTMLMainElement,
    nav: HTMLNavElement,
    section: HTMLSectionElement,
    summary: HTMLSummaryElement,
    menu: HTMLMenuElement,
    menuitem: HTMLMenuItemElement,
    dir: HTMLDirectoryElement,
    search: HTMLSearchElement,
    b: HTMLElement,
    strong: HTMLElement,
    i: HTMLElement,
    em: HTMLElement,
    u: HTMLElement,
    s: HTMLElement,
    strike: HTMLElement,
    big: HTMLElement,
    small: HTMLElement,
    sup: HTMLElement,
    sub: HTMLElement,
    q: HTMLElement,
    abbr: HTMLElement,
    address: HTMLElement,
    center: HTMLElement,
    nobr: HTMLElement,
    wbr: HTMLElement,
    acronym: HTMLElement,
    tt: HTMLElement,
    xmp: HTMLElement,
    plaintext: HTMLElement,
    listing: HTMLElement,
    blink: HTMLElement
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
    if (tagName.toLowerCase() === 'iframe') {
      var iframeDoc = makeEl('html');
      iframeDoc.nodeType = 9;
      iframeDoc.nodeName = '#document';
      iframeDoc.documentElement = makeEl('html');
      iframeDoc.head = makeEl('head');
      iframeDoc.body = makeEl('body');
      iframeDoc.documentElement.appendChild(iframeDoc.head);
      iframeDoc.documentElement.appendChild(iframeDoc.body);
      iframeDoc.createElement = makeNative(function(tag) { return makeEl(tag); }, 'createElement');
      iframeDoc.createTextNode = makeNative(function(data) { return { nodeType: 3, nodeName: '#text', data: String(data), textContent: String(data), parentNode: null }; }, 'createTextNode');
      iframeDoc.createComment = makeNative(function(data) { return { nodeType: 8, nodeName: '#comment', data: String(data), parentNode: null }; }, 'createComment');
      iframeDoc.createDocumentFragment = makeNative(function() { return makeEl('fragment'); }, 'createDocumentFragment');
      iframeDoc.createEvent = makeNative(function(type) { return { type: type, initEvent: function() {}, preventDefault: function() {}, stopPropagation: function() {} }; }, 'createEvent');
      iframeDoc.addEventListener = makeNative(function(type, cb) {
        if (!iframeDoc._listeners) iframeDoc._listeners = {};
        if (!iframeDoc._listeners[type]) iframeDoc._listeners[type] = [];
        iframeDoc._listeners[type].push(cb);
      }, 'addEventListener');
      iframeDoc.removeEventListener = makeNative(function() {}, 'removeEventListener');
      iframeDoc.dispatchEvent = makeNative(function() {}, 'dispatchEvent');
      iframeDoc.write = makeNative(function() {}, 'write');
      iframeDoc.writeln = makeNative(function() {}, 'writeln');
      iframeDoc.open = makeNative(function() {}, 'open');
      iframeDoc.close = makeNative(function() {}, 'close');
      iframeDoc.getElementById = makeNative(function(id) {
        function search(node) {
          if (!node) return null;
          if (node.id === id) return node;
          if (node.childNodes) {
            for (var i = 0; i < node.childNodes.length; i++) {
              var found = search(node.childNodes[i]);
              if (found) return found;
            }
          }
          return null;
        }
        return search(iframeDoc.body) || search(iframeDoc.head);
      }, 'getElementById');
      iframeDoc.getElementsByClassName = makeNative(function(cls) { return []; }, 'getElementsByClassName');
      iframeDoc.getElementsByTagName = makeNative(function(tag) { return []; }, 'getElementsByTagName');
      iframeDoc.getElementsByName = makeNative(function(name) { return []; }, 'getElementsByName');
      iframeDoc.cookie = '';
      iframeDoc.readyState = 'complete';
      iframeDoc.URL = 'about:blank';
      iframeDoc.baseURI = 'about:blank';
      iframeDoc.location = { href: 'about:blank', origin: 'null', protocol: 'about:', host: '', hostname: '', port: '', pathname: 'blank', search: '', hash: '', reload: function() {}, replace: function() {}, assign: function() {} };
      iframeDoc.referrer = '';
      iframeDoc.title = '';
      iframeDoc.domain = '';
      iframeDoc.implementation = { hasFeature: function() { return true; }, createHTMLDocument: function() { return iframeDoc; } };
      iframeDoc.defaultView = el.contentWindow;

      el.contentWindow = {
        postMessage: makeNative(function(msg, origin) {}, 'postMessage'),
        document: iframeDoc,
        location: iframeDoc.location,
        addEventListener: makeNative(function() {}, 'addEventListener'),
        removeEventListener: makeNative(function() {}, 'removeEventListener'),
        dispatchEvent: makeNative(function() {}, 'dispatchEvent')
      };
      el.contentDocument = iframeDoc;
      el.contentWindow.document = iframeDoc;
    }
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
    el.remove = makeNative(function() {
      if (el.parentNode && el.parentNode.removeChild) {
        el.parentNode.removeChild(el);
      }
    }, 'remove');
    el.attachShadow = makeNative(function(opts) {
      var shadow = makeEl('shadow-root');
      shadow.nodeType = 11;
      shadow.nodeName = '#shadow-root';
      shadow.host = el;
      shadow.mode = (opts && opts.mode) || 'open';
      el._shadowRoot = shadow;
      return shadow;
    }, 'attachShadow');
    Object.defineProperty(el, 'shadowRoot', {
      get: makeNative(function() { return el._shadowRoot || null; }, 'get shadowRoot'),
      configurable: true
    });
    el.assign = makeNative(function() {}, 'assign');
    el.after = makeNative(function() {}, 'after');
    el.before = makeNative(function() {}, 'before');
    el.append = makeNative(function() {}, 'append');
    el.prepend = makeNative(function() {}, 'prepend');
    el.replaceWith = makeNative(function() {}, 'replaceWith');
    el.replaceChildren = makeNative(function() {}, 'replaceChildren');
    el.toggleAttribute = makeNative(function(name, force) {
      var has = el.hasAttribute(name);
      if (force === undefined) {
        if (has) { el.removeAttribute(name); return false; }
        el.setAttribute(name, ''); return true;
      }
      if (force) { if (!has) el.setAttribute(name, ''); return true; }
      if (has) el.removeAttribute(name); return false;
    }, 'toggleAttribute');
    el.hasAttributes = makeNative(function() { return Object.keys(el.attributes).length > 0; }, 'hasAttributes');
    el.getAttributeNames = makeNative(function() { return Object.keys(el.attributes); }, 'getAttributeNames');
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
    location: sandbox.location || null,
    // 状态
    readyState: cfg.readyState || 'complete',
    hidden: false,
    visibilityState: 'visible',
    onvisibilitychange: null,
    onreadystatechange: null,
    // Pointer lock
    pointerLockElement: null,
    exitPointerLock: makeNative(function exitPointerLock() {}, 'exitPointerLock'),
    // Fullscreen
    fullscreenElement: null,
    fullscreenEnabled: true,
    exitFullscreen: makeNative(function exitFullscreen() { return Promise.resolve(); }, 'exitFullscreen'),
    // Picture in picture
    pictureInPictureElement: null,
    pictureInPictureEnabled: false,
    exitPictureInPicture: makeNative(function exitPictureInPicture() { return Promise.resolve(); }, 'exitPictureInPicture'),
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
      var lower = String(name).toLowerCase();
      var all = [document.documentElement, document.head, document.body]
        .concat(collectDescendants(document.documentElement));
      var matched = [];
      for (var i = 0; i < all.length; i++) {
        if (!all[i]) continue;
        var tn = all[i].tagName;
        if (lower === '*' || (tn && String(tn).toLowerCase() === lower)) matched.push(all[i]);
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

  document._cookies = {};

  function updateCookieString() {
    const pairs = [];
    for (const [name, value] of Object.entries(document._cookies)) {
      pairs.push(name + '=' + value);
    }
    document._cookie = pairs.join('; ');
  }

  Object.defineProperty(document, 'cookie', {
    get: makeNative(function() { return document._cookie; }, 'get cookie'),
    set: makeNative(function(v) {
      const cookieStr = String(v);
      const parts = cookieStr.split(';');
      const nameValue = parts[0].trim();
      const eqIndex = nameValue.indexOf('=');
      if (eqIndex !== -1) {
        const name = nameValue.substring(0, eqIndex).trim();
        const value = nameValue.substring(eqIndex + 1).trim();
        if (name) {
          document._cookies[name] = value;
          updateCookieString();
        }
      }
    }, 'set cookie'),
    configurable: true,
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
  sandbox.HTMLVideoElement = HTMLVideoElement;
  sandbox.HTMLIFrameElement = HTMLIFrameElement;
  sandbox.HTMLInputElement = HTMLInputElement;
  sandbox.HTMLFormElement = HTMLFormElement;
  sandbox.HTMLTextAreaElement = HTMLTextAreaElement;
  sandbox.HTMLSelectElement = HTMLSelectElement;
  sandbox.HTMLOptionElement = HTMLOptionElement;
  sandbox.HTMLButtonElement = HTMLButtonElement;
  sandbox.HTMLTableElement = HTMLTableElement;
  sandbox.HTMLTableRowElement = HTMLTableRowElement;
  sandbox.HTMLTableCellElement = HTMLTableCellElement;
  sandbox.HTMLSpanElement = HTMLSpanElement;
  sandbox.HTMLLinkElement = HTMLLinkElement;
  sandbox.HTMLMetaElement = HTMLMetaElement;
  sandbox.HTMLParagraphElement = HTMLParagraphElement;
  sandbox.HTMLHeadingElement = HTMLHeadingElement;
  sandbox.HTMLUnorderedListElement = HTMLUnorderedListElement;
  sandbox.HTMLOListElement = HTMLOListElement;
  sandbox.HTMLLIElement = HTMLLIElement;
  sandbox.HTMLDListElement = HTMLDListElement;
  sandbox.HTMLQuoteElement = HTMLQuoteElement;
  sandbox.HTMLPreElement = HTMLPreElement;
  sandbox.HTMLHRElement = HTMLHRElement;
  sandbox.HTMLBRElement = HTMLBRElement;
  sandbox.HTMLBaseElement = HTMLBaseElement;
  sandbox.HTMLParamElement = HTMLParamElement;
  sandbox.HTMLAppletElement = HTMLAppletElement;
  sandbox.HTMLFrameElement = HTMLFrameElement;
  sandbox.HTMLFrameSetElement = HTMLFrameSetElement;
  sandbox.HTMLMarqueeElement = HTMLMarqueeElement;
  sandbox.HTMLUnknownElement = HTMLUnknownElement;
  sandbox.HTMLDetailsElement = HTMLDetailsElement;
  sandbox.HTMLDialogElement = HTMLDialogElement;
  sandbox.HTMLSlotElement = HTMLSlotElement;
  sandbox.HTMLTemplateElement = HTMLTemplateElement;
  sandbox.HTMLShadowRoot = HTMLShadowRoot;
  sandbox.HTMLPictureElement = HTMLPictureElement;
  sandbox.HTMLSourceElement = HTMLSourceElement;
  sandbox.HTMLTrackElement = HTMLTrackElement;
  sandbox.HTMLMediaElement = HTMLMediaElement;
  sandbox.HTMLFormControlsCollection = HTMLFormControlsCollection;
  sandbox.HTMLFieldSetElement = HTMLFieldSetElement;
  sandbox.HTMLLegendElement = HTMLLegendElement;
  sandbox.HTMLLabelElement = HTMLLabelElement;
  sandbox.HTMLMeterElement = HTMLMeterElement;
  sandbox.HTMLProgressElement = HTMLProgressElement;
  sandbox.HTMLDataElement = HTMLDataElement;
  sandbox.HTMLTimeElement = HTMLTimeElement;
  sandbox.HTMLRubyElement = HTMLRubyElement;
  sandbox.HTMLRTElement = HTMLRTElement;
  sandbox.HTMLRPElement = HTMLRPElement;
  sandbox.HTMLBDOElement = HTMLBDOElement;
  sandbox.HTMLCiteElement = HTMLCiteElement;
  sandbox.HTMLDFNElement = HTMLDFNElement;
  sandbox.HTMLVarElement = HTMLVarElement;
  sandbox.HTMLKbdElement = HTMLKbdElement;
  sandbox.HTMLSampElement = HTMLSampElement;
  sandbox.HTMLCodeElement = HTMLCodeElement;
  sandbox.HTMLElementElement = HTMLElementElement;
  sandbox.HTMLArticleElement = HTMLArticleElement;
  sandbox.HTMLAsideElement = HTMLAsideElement;
  sandbox.HTMLFooterElement = HTMLFooterElement;
  sandbox.HTMLHeaderElement = HTMLHeaderElement;
  sandbox.HTMLHGroupElement = HTMLHGroupElement;
  sandbox.HTMLMainElement = HTMLMainElement;
  sandbox.HTMLNavElement = HTMLNavElement;
  sandbox.HTMLSectionElement = HTMLSectionElement;
  sandbox.HTMLSummaryElement = HTMLSummaryElement;
  sandbox.HTMLMenuElement = HTMLMenuElement;
  sandbox.HTMLMenuItemElement = HTMLMenuItemElement;
  sandbox.HTMLDirectoryElement = HTMLDirectoryElement;
  sandbox.HTMLSearchElement = HTMLSearchElement;
  sandbox.HTMLSlotable = HTMLSlotable;
  sandbox.Image = Image;
  sandbox.Comment = Comment;
  sandbox.DOMTokenList = DOMTokenList;
  sandbox.NodeList = NodeList;
  sandbox.HTMLCollection = HTMLCollection;
  sandbox.HTMLAllCollection = HTMLAllCollection;

  var allCtors = [
    Node, Element, HTMLElement, HTMLHtmlElement, HTMLHeadElement,
    HTMLBodyElement, HTMLScriptElement, HTMLStyleElement, HTMLDivElement,
    HTMLAnchorElement, HTMLCanvasElement, HTMLImageElement, HTMLAudioElement,
    HTMLVideoElement, HTMLIFrameElement, HTMLInputElement, HTMLFormElement,
    HTMLTextAreaElement, HTMLSelectElement, HTMLOptionElement, HTMLButtonElement,
    HTMLTableElement, HTMLTableRowElement, HTMLTableCellElement, HTMLSpanElement,
    HTMLLinkElement, HTMLMetaElement, HTMLParagraphElement, HTMLHeadingElement,
    HTMLUnorderedListElement, HTMLOListElement, HTMLLIElement, HTMLDListElement,
    HTMLQuoteElement, HTMLPreElement, HTMLHRElement, HTMLBRElement,
    HTMLBaseElement, HTMLParamElement, HTMLAppletElement, HTMLFrameElement,
    HTMLFrameSetElement, HTMLMarqueeElement, HTMLUnknownElement,
    HTMLDetailsElement, HTMLDialogElement, HTMLSlotElement, HTMLTemplateElement,
    HTMLShadowRoot, HTMLPictureElement, HTMLSourceElement, HTMLTrackElement,
    HTMLMediaElement, HTMLFormControlsCollection, HTMLFieldSetElement,
    HTMLLegendElement, HTMLLabelElement, HTMLMeterElement, HTMLProgressElement,
    HTMLDataElement, HTMLTimeElement, HTMLRubyElement, HTMLRTElement,
    HTMLRPElement, HTMLBDOElement, HTMLCiteElement, HTMLDFNElement,
    HTMLVarElement, HTMLKbdElement, HTMLSampElement, HTMLCodeElement,
    HTMLElementElement, HTMLArticleElement, HTMLAsideElement, HTMLFooterElement,
    HTMLHeaderElement, HTMLHGroupElement, HTMLMainElement, HTMLNavElement,
    HTMLSectionElement, HTMLSummaryElement, HTMLMenuElement, HTMLMenuItemElement,
    HTMLDirectoryElement, HTMLSearchElement, HTMLSlotable, Comment, HTMLAllCollection
  ];
  allCtors.forEach(function(ctor) {
    Object.defineProperty(ctor.prototype, 'constructor', {
      value: ctor,
      writable: true,
      configurable: true,
      enumerable: false
    });
  });

  sandbox.document = document;
  Object.setPrototypeOf(document, sandbox.Document.prototype);

  Object.defineProperty(document, Symbol.toStringTag, {
    value: 'HTMLDocument',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // FontFaceSet (document.fonts) — Chrome 35+
  const fonts = {
    status: 'loaded',
    onloading: null,
    onloadingdone: null,
    onloadingerror: null,
    check: makeNative(function check(font, text) { return true; }, 'check'),
    load: makeNative(function load(font, text) { return Promise.resolve([]); }, 'load'),
    add: makeNative(function add(fontFace) {}, 'add'),
    delete: makeNative(function delete_(fontFace) {}, 'delete'),
    clear: makeNative(function clear() {}, 'clear'),
    forEach: makeNative(function forEach(callback) {}, 'forEach'),
    addEventListener: makeNative(function(type, cb, opts) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb, opts) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
  };
  fonts.ready = Promise.resolve(fonts);
  Object.defineProperty(fonts, Symbol.toStringTag, { value: 'FontFaceSet', writable: false, configurable: true, enumerable: false });
  Object.defineProperty(document, 'fonts', {
    value: fonts,
    writable: false,
    configurable: true,
    enumerable: true
  });
}

module.exports = { install };
