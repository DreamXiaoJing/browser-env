'use strict';

const { makeNative, defineProp } = require('../lib/guard');

function install(sandbox, config = {}) {
  const cfg = config.window || {};

  const requestAnimationFrameCallbacks = [];
  let rafId = 1;

  function cancelAnimationFrame(id) {
    const index = requestAnimationFrameCallbacks.findIndex(cb => cb.id === id);
    if (index !== -1) {
      requestAnimationFrameCallbacks.splice(index, 1);
    }
  }

  function requestAnimationFrame(callback) {
    const id = rafId++;
    requestAnimationFrameCallbacks.push({ id, callback });
    setTimeout(() => {
      const index = requestAnimationFrameCallbacks.findIndex(cb => cb.id === id);
      if (index !== -1) {
        requestAnimationFrameCallbacks.splice(index, 1);
        try {
          callback(sandbox.performance && sandbox.performance.now ? sandbox.performance.now() : Date.now());
        } catch(e) {
        }
      }
    }, 16);
    return id;
  }

  function matchMedia(query) {
    const mediaQueryList = {
      media: String(query),
      matches: cfg.matchMediaMatches || false,
      onchange: null,
      addListener: makeNative(function(listener) {
        this.onchange = listener;
      }, 'addListener'),
      removeListener: makeNative(function(listener) {
        if (this.onchange === listener) {
          this.onchange = null;
        }
      }, 'removeListener'),
      addEventListener: makeNative(function(type, listener) {
        if (type === 'change') {
          this.onchange = listener;
        }
      }, 'addEventListener'),
      removeEventListener: makeNative(function(type, listener) {
        if (type === 'change' && this.onchange === listener) {
          this.onchange = null;
        }
      }, 'removeEventListener'),
      dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
    };
    Object.setPrototypeOf(mediaQueryList, sandbox.MediaQueryList.prototype);
    return mediaQueryList;
  }

  function createEvent(type) {
    const event = {
      type: type,
      bubbles: false,
      cancelable: false,
      composed: false,
      currentTarget: null,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: true,
      target: null,
      timeStamp: sandbox.performance && sandbox.performance.now ? sandbox.performance.now() : Date.now(),
      cancelBubble: false,
      returnValue: true,
      cancel: makeNative(function() {
        this.cancelBubble = true;
        this.preventDefault();
      }, 'cancel'),
      preventDefault: makeNative(function() {
        this.defaultPrevented = true;
        this.returnValue = false;
      }, 'preventDefault'),
      stopPropagation: makeNative(function() {
        this.cancelBubble = true;
      }, 'stopPropagation'),
      stopImmediatePropagation: makeNative(function() {
        this.cancelBubble = true;
      }, 'stopImmediatePropagation'),
      composedPath: makeNative(function() { return []; }, 'composedPath'),
      initEvent: makeNative(function(type, bubbles, cancelable) {
        this.type = type;
        this.bubbles = bubbles;
        this.cancelable = cancelable;
      }, 'initEvent')
    };
    Object.setPrototypeOf(event, sandbox.Event.prototype);
    return event;
  }

  function CustomEvent(type, options) {
    const event = createEvent(type);
    if (options && options.detail !== undefined) {
      event.detail = options.detail;
    }
    Object.setPrototypeOf(event, sandbox.CustomEvent.prototype);
    return event;
  }

  function MessageEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.data = options.data || null;
      event.origin = options.origin || '';
      event.source = options.source || null;
      event.ports = options.ports || [];
    }
    Object.setPrototypeOf(event, sandbox.MessageEvent.prototype);
    return event;
  }

  function MouseEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.clientX = options.clientX || 0;
      event.clientY = options.clientY || 0;
      event.screenX = options.screenX || 0;
      event.screenY = options.screenY || 0;
      event.button = options.button || 0;
      event.buttons = options.buttons || 0;
      event.ctrlKey = options.ctrlKey || false;
      event.shiftKey = options.shiftKey || false;
      event.altKey = options.altKey || false;
      event.metaKey = options.metaKey || false;
      event.target = options.target || null;
      event.currentTarget = options.currentTarget || null;
    }
    Object.setPrototypeOf(event, sandbox.MouseEvent.prototype);
    return event;
  }

  function FocusEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.relatedTarget = options.relatedTarget || null;
    }
    Object.setPrototypeOf(event, sandbox.FocusEvent.prototype);
    return event;
  }

  function KeyboardEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.key = options.key || '';
      event.code = options.code || '';
      event.location = options.location || 0;
      event.repeat = options.repeat || false;
      event.ctrlKey = options.ctrlKey || false;
      event.shiftKey = options.shiftKey || false;
      event.altKey = options.altKey || false;
      event.metaKey = options.metaKey || false;
      event.keyCode = options.keyCode || 0;
      event.charCode = options.charCode || 0;
      event.which = options.which || 0;
    }
    Object.setPrototypeOf(event, sandbox.KeyboardEvent.prototype);
    return event;
  }

  function UIEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.view = options.view || null;
      event.detail = options.detail || 0;
    }
    Object.setPrototypeOf(event, sandbox.UIEvent.prototype);
    return event;
  }

  function StorageEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.key = options.key || null;
      event.oldValue = options.oldValue || null;
      event.newValue = options.newValue || null;
      event.url = options.url || '';
      event.storageArea = options.storageArea || null;
    }
    Object.setPrototypeOf(event, sandbox.StorageEvent.prototype);
    return event;
  }

  function HashChangeEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.oldURL = options.oldURL || '';
      event.newURL = options.newURL || '';
    }
    Object.setPrototypeOf(event, sandbox.HashChangeEvent.prototype);
    return event;
  }

  function PopStateEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.state = options.state || null;
    }
    Object.setPrototypeOf(event, sandbox.PopStateEvent.prototype);
    return event;
  }

  function BeforeUnloadEvent(type, options) {
    const event = createEvent(type);
    event.returnValue = '';
    Object.setPrototypeOf(event, sandbox.BeforeUnloadEvent.prototype);
    return event;
  }

  function ProgressEvent(type, options) {
    const event = createEvent(type);
    if (options) {
      event.lengthComputable = options.lengthComputable || false;
      event.loaded = options.loaded || 0;
      event.total = options.total || 0;
    }
    Object.setPrototypeOf(event, sandbox.ProgressEvent.prototype);
    return event;
  }

  function EventTarget() {
    this._listeners = {};
  }
  makeNative(EventTarget, 'EventTarget');

  EventTarget.prototype.addEventListener = makeNative(function(type, listener, options) {
    if (!this._listeners[type]) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(listener);
  }, 'addEventListener');

  EventTarget.prototype.removeEventListener = makeNative(function(type, listener, options) {
    if (!this._listeners[type]) return;
    const index = this._listeners[type].indexOf(listener);
    if (index !== -1) {
      this._listeners[type].splice(index, 1);
    }
  }, 'removeEventListener');

  EventTarget.prototype.dispatchEvent = makeNative(function(event) {
    if (!this._listeners[event.type]) return true;
    for (const listener of this._listeners[event.type]) {
      try {
        listener.call(this, event);
      } catch(e) {
      }
    }
    return !event.defaultPrevented;
  }, 'dispatchEvent');

  function Event(type, options) {
    return createEvent(type);
  }
  makeNative(Event, 'Event');

  function MediaQueryList() {}
  makeNative(MediaQueryList, 'MediaQueryList');

  const visualViewport = {
    offsetLeft: 0,
    offsetTop: 0,
    pageLeft: 0,
    pageTop: 0,
    width: cfg.innerWidth || 1920,
    height: cfg.innerHeight || 1080,
    scale: 1,
    addEventListener: makeNative(function(type, cb, opts) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb, opts) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
  };

  const screen = {
    width: cfg.screenWidth || 1920,
    height: cfg.screenHeight || 1080,
    availWidth: cfg.availWidth || 1920,
    availHeight: cfg.availHeight || 1040,
    availLeft: 0,
    availTop: 0,
    colorDepth: 24,
    pixelDepth: 24,
    isExtended: false,
    orientation: {
      angle: 0,
      type: 'landscape-primary',
      onchange: null
    }
  };

  const history = {
    length: 1,
    scrollRestoration: 'auto',
    state: null,
    back: makeNative(function() {}, 'back'),
    forward: makeNative(function() {}, 'forward'),
    go: makeNative(function(delta) {}, 'go'),
    pushState: makeNative(function(state, title, url) {
      this.state = state;
    }, 'pushState'),
    replaceState: makeNative(function(state, title, url) {
      this.state = state;
    }, 'replaceState')
  };

  const localStorage = {
    _data: {},
    getItem: makeNative(function(key) {
      return this._data[key] || null;
    }, 'getItem'),
    setItem: makeNative(function(key, value) {
      this._data[key] = String(value);
    }, 'setItem'),
    removeItem: makeNative(function(key) {
      delete this._data[key];
    }, 'removeItem'),
    clear: makeNative(function() {
      this._data = {};
    }, 'clear'),
    key: makeNative(function(index) {
      return Object.keys(this._data)[index] || null;
    }, 'key'),
    get length() {
      return Object.keys(this._data).length;
    }
  };

  const sessionStorage = {
    _data: {},
    getItem: makeNative(function(key) {
      return this._data[key] || null;
    }, 'getItem'),
    setItem: makeNative(function(key, value) {
      this._data[key] = String(value);
    }, 'setItem'),
    removeItem: makeNative(function(key) {
      delete this._data[key];
    }, 'removeItem'),
    clear: makeNative(function() {
      this._data = {};
    }, 'clear'),
    key: makeNative(function(index) {
      return Object.keys(this._data)[index] || null;
    }, 'key'),
    get length() {
      return Object.keys(this._data).length;
    }
  };

  sandbox.EventTarget = EventTarget;
  sandbox.Event = Event;
  sandbox.CustomEvent = CustomEvent;
  sandbox.MessageEvent = MessageEvent;
  sandbox.MouseEvent = MouseEvent;
  sandbox.FocusEvent = FocusEvent;
  sandbox.KeyboardEvent = KeyboardEvent;
  sandbox.UIEvent = UIEvent;
  sandbox.StorageEvent = StorageEvent;
  sandbox.HashChangeEvent = HashChangeEvent;
  sandbox.PopStateEvent = PopStateEvent;
  sandbox.BeforeUnloadEvent = BeforeUnloadEvent;
  sandbox.ProgressEvent = ProgressEvent;
  sandbox.MediaQueryList = MediaQueryList;

  sandbox.matchMedia = matchMedia;
  sandbox.requestAnimationFrame = requestAnimationFrame;
  sandbox.cancelAnimationFrame = cancelAnimationFrame;

  sandbox.visualViewport = visualViewport;
  sandbox.screen = screen;
  sandbox.history = history;
  sandbox.localStorage = localStorage;
  sandbox.sessionStorage = sessionStorage;

  Object.defineProperty(sandbox, 'devicePixelRatio', {
    value: cfg.devicePixelRatio || 1,
    writable: false,
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'innerWidth', {
    value: cfg.innerWidth || 1920,
    writable: false,
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'innerHeight', {
    value: cfg.innerHeight || 1080,
    writable: false,
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'outerWidth', {
    value: cfg.outerWidth || 1920,
    writable: false,
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'outerHeight', {
    value: cfg.outerHeight || 1080,
    writable: false,
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'scrollX', {
    get: makeNative(function() { return 0; }, 'get scrollX'),
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'scrollY', {
    get: makeNative(function() { return 0; }, 'get scrollY'),
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'pageXOffset', {
    get: makeNative(function() { return 0; }, 'get pageXOffset'),
    enumerable: true,
    configurable: true
  });

  Object.defineProperty(sandbox, 'pageYOffset', {
    get: makeNative(function() { return 0; }, 'get pageYOffset'),
    enumerable: true,
    configurable: true
  });

  sandbox.scroll = makeNative(function(x, y) {}, 'scroll');
  sandbox.scrollTo = makeNative(function(x, y) {}, 'scrollTo');
  sandbox.scrollBy = makeNative(function(x, y) {}, 'scrollBy');

  sandbox.moveTo = makeNative(function(x, y) {}, 'moveTo');
  sandbox.moveBy = makeNative(function(dx, dy) {}, 'moveBy');
  sandbox.resizeTo = makeNative(function(width, height) {}, 'resizeTo');
  sandbox.resizeBy = makeNative(function(dw, dh) {}, 'resizeBy');

  sandbox.open = makeNative(function(url, target, features) {
    return sandbox;
  }, 'open');

  sandbox.close = makeNative(function() {}, 'close');

  sandbox.alert = makeNative(function(message) {}, 'alert');
  sandbox.confirm = makeNative(function(message) { return true; }, 'confirm');
  sandbox.prompt = makeNative(function(message, defaultValue) {
    return String(defaultValue || '');
  }, 'prompt');

  sandbox.focus = makeNative(function() {}, 'focus');
  sandbox.blur = makeNative(function() {}, 'blur');

  sandbox.print = makeNative(function() {}, 'print');
  sandbox.stop = makeNative(function() {}, 'stop');

  sandbox.postMessage = makeNative(function(message, targetOrigin, transfer) {}, 'postMessage');

  sandbox.addEventListener = makeNative(function(type, listener, options) {}, 'addEventListener');
  sandbox.removeEventListener = makeNative(function(type, listener, options) {}, 'removeEventListener');
  sandbox.dispatchEvent = makeNative(function(event) { return true; }, 'dispatchEvent');

  // window.onerror / window.onunhandledrejection：浏览器全局错误处理属性
  // 设为 no-op 函数而非 null，是为了让动态加载 JS 中的 Promise polyfill
  // （如 core-js）在检测到 window.onunhandledrejection 存在时调用它，
  // 而不是 fallback 到 console.error 输出 "Unhandled promise rejection"。
  // 沙箱已在 lib/sandbox.js 中通过 process.on('unhandledRejection') 吞掉
  // Node.js 层面的拒绝，这里补齐浏览器层面，避免 polyfill 自行打印。
  sandbox.onerror = null;
  sandbox.onrejectionhandled = null;
  sandbox.onunhandledrejection = makeNative(function(event) {}, 'onunhandledrejection');

  sandbox.getComputedStyle = makeNative(function(element, pseudoElement) {
    return {};
  }, 'getComputedStyle');

  sandbox.getSelection = makeNative(function() {
    return {
      anchorNode: null,
      anchorOffset: 0,
      focusNode: null,
      focusOffset: 0,
      isCollapsed: true,
      rangeCount: 0,
      type: 'None',
      addRange: makeNative(function(range) {}, 'addRange'),
      collapse: makeNative(function(node, offset) {}, 'collapse'),
      collapseToEnd: makeNative(function() {}, 'collapseToEnd'),
      collapseToStart: makeNative(function() {}, 'collapseToStart'),
      containsNode: makeNative(function(node, allowPartialContainment) { return false; }, 'containsNode'),
      deleteFromDocument: makeNative(function() {}, 'deleteFromDocument'),
      extend: makeNative(function(node, offset) {}, 'extend'),
      getRangeAt: makeNative(function(index) { return null; }, 'getRangeAt'),
      removeAllRanges: makeNative(function() {}, 'removeAllRanges'),
      removeRange: makeNative(function(range) {}, 'removeRange'),
      selectAllChildren: makeNative(function(node) {}, 'selectAllChildren'),
      setBaseAndExtent: makeNative(function(anchorNode, anchorOffset, focusNode, focusOffset) {}, 'setBaseAndExtent'),
      setPosition: makeNative(function(node, offset) {}, 'setPosition'),
      toString: makeNative(function() { return ''; }, 'toString')
    };
  }, 'getSelection');

  sandbox.scrollIntoView = makeNative(function(options) {}, 'scrollIntoView');

  sandbox.setImmediate = makeNative(function(callback) {
    setTimeout(callback, 0);
  }, 'setImmediate');

  sandbox.clearImmediate = makeNative(function(id) {
    clearTimeout(id);
  }, 'clearImmediate');

  sandbox.queueMicrotask = makeNative(function(callback) {
    Promise.resolve().then(callback);
  }, 'queueMicrotask');

  // Notification API
  function Notification(title, options) {
    this.title = title;
    this.body = (options && options.body) || '';
  }
  makeNative(Notification, 'Notification');
  Notification.permission = 'default';
  Notification.requestPermission = makeNative(function requestPermission(callback) {
    if (typeof callback === 'function') callback('default');
    return Promise.resolve('default');
  }, 'requestPermission');
  Notification.prototype.close = makeNative(function close() {}, 'close');
  Notification.prototype.addEventListener = makeNative(function addEventListener() {}, 'addEventListener');
  Notification.prototype.removeEventListener = makeNative(function removeEventListener() {}, 'removeEventListener');
  Notification.prototype.dispatchEvent = makeNative(function dispatchEvent() { return true; }, 'dispatchEvent');
  sandbox.Notification = Notification;

  // SpeechSynthesis API
  sandbox.speechSynthesis = {
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null,
    onstart: null,
    onend: null,
    onerror: null,
    onpause: null,
    onresume: null,
    onmark: null,
    onboundary: null,
    speak: makeNative(function speak(utterance) {}, 'speak'),
    cancel: makeNative(function cancel() {}, 'cancel'),
    pause: makeNative(function pause() {}, 'pause'),
    resume: makeNative(function resume() {}, 'resume'),
    getVoices: makeNative(function getVoices() { return []; }, 'getVoices'),
    addEventListener: makeNative(function addEventListener() {}, 'addEventListener'),
    removeEventListener: makeNative(function removeEventListener() {}, 'removeEventListener'),
    dispatchEvent: makeNative(function dispatchEvent() { return true; }, 'dispatchEvent')
  };

  sandbox.__cancelAnimationFrame = cancelAnimationFrame;

  Object.defineProperty(sandbox, Symbol.toStringTag, {
    value: 'Window',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(screen, Symbol.toStringTag, {
    value: 'Screen',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(history, Symbol.toStringTag, {
    value: 'History',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(localStorage, Symbol.toStringTag, {
    value: 'Storage',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(sessionStorage, Symbol.toStringTag, {
    value: 'Storage',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(visualViewport, Symbol.toStringTag, {
    value: 'VisualViewport',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // ── 补充 Chrome 浏览器存在的全局 API（避免环境检测）──

  // PaymentRequest（Chrome 60+，typeof 应为 'function'）
  sandbox.PaymentRequest = makeNative(function PaymentRequest(methodData, details, options) {
    if (!(this instanceof PaymentRequest)) throw new TypeError("Failed to construct 'PaymentRequest': Please use the 'new' operator");
  }, 'PaymentRequest');

  // EventSource（Server-Sent Events，Chrome 9+）
  sandbox.EventSource = makeNative(function EventSource(url, config) {
    if (!(this instanceof EventSource)) throw new TypeError("Failed to construct 'EventSource': Please use the 'new' operator");
    this.url = url;
    this.readyState = 0;
    this.withCredentials = !!(config && config.withCredentials);
  }, 'EventSource');
  sandbox.EventSource.prototype.CONNECTING = 0;
  sandbox.EventSource.prototype.OPEN = 1;
  sandbox.EventSource.prototype.CLOSED = 2;
  Object.defineProperty(sandbox.EventSource.prototype, 'onopen', { value: null, writable: true, configurable: true, enumerable: true });
  Object.defineProperty(sandbox.EventSource.prototype, 'onmessage', { value: null, writable: true, configurable: true, enumerable: true });
  Object.defineProperty(sandbox.EventSource.prototype, 'onerror', { value: null, writable: true, configurable: true, enumerable: true });

  // SpeechSynthesis（window.speechSynthesis，Chrome 33+）
  const speechSynthesis = {
    pending: false,
    speaking: false,
    paused: false,
    onvoiceschanged: null,
    addEventListener: makeNative(function() {}, 'addEventListener'),
    removeEventListener: makeNative(function() {}, 'removeEventListener'),
    dispatchEvent: makeNative(function() { return true; }, 'dispatchEvent'),
    speak: makeNative(function(utterance) {}, 'speak'),
    cancel: makeNative(function() {}, 'cancel'),
    pause: makeNative(function() {}, 'pause'),
    resume: makeNative(function() {}, 'resume'),
    getVoices: makeNative(function() { return []; }, 'getVoices')
  };
  Object.defineProperty(speechSynthesis, Symbol.toStringTag, { value: 'SpeechSynthesis', writable: false, configurable: true, enumerable: false });
  sandbox.speechSynthesis = speechSynthesis;
  sandbox.SpeechSynthesis = makeNative(function SpeechSynthesis() {}, 'SpeechSynthesis');
}

module.exports = { install };