'use strict';

const vm = require('vm');

const BASE_GLOBALS = [
  'Object', 'Array', 'Function', 'String', 'Number', 'Boolean',
  'Symbol', 'Date', 'Map', 'Set', 'WeakMap', 'WeakSet',
  'Promise', 'Proxy', 'Reflect',
  'Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError',
  'EvalError', 'URIError',
  'ArrayBuffer', 'SharedArrayBuffer', 'Int8Array', 'Uint8Array',
  'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array',
  'BigInt64Array', 'BigUint64Array',
  'DataView', 'JSON', 'Math', 'Intl',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite',
  'encodeURI', 'encodeURIComponent', 'decodeURI', 'decodeURIComponent',
  'escape', 'unescape',
  'Infinity', 'NaN', 'undefined'
];

/**
 * 创建一个干净的浏览器沙箱上下文
 */
function createSandbox(config = {}) {
  const sandbox = {};

  // 1. 注入 Node.js 全局构造函数
  for (const name of BASE_GLOBALS) {
    const val = global[name];
    if (val !== undefined) {
      sandbox[name] = val;
    }
  }

  // 1.5. 注入浏览器标准 Web API（Node.js 全局可用，如 Blob、FormData、AbortController 等）
  const WEB_API_GLOBALS = [
    'URL', 'URLSearchParams',
    'TextEncoder', 'TextDecoder',
    'atob', 'btoa',
    'AbortController', 'AbortSignal',
    'Blob', 'FormData'
  ];
  for (const name of WEB_API_GLOBALS) {
    const val = global[name];
    if (val !== undefined) {
      sandbox[name] = val;
    }
  }

  // 2. 创建 vm 上下文
  const ctx = vm.createContext(sandbox);

  // 2.5. 确保 eval 作为全局对象属性可用（vm.createContext 不自动添加）
  //     RS6 VMP 通过 window.eval / window.execScript 访问 eval
  vm.runInContext(`
    (function() {
      // 将内置 eval 暴露为 this.eval，使 window.eval 可用
      if (typeof this.eval !== 'function') {
        this.eval = function(s) { return eval(s); };
      }
      // execScript: IE 专用，但 RS6 也会检测
      this.execScript = this.eval;
    })();
  `, ctx);

  // 3. 在沙箱内通过 runInContext 建立 window/self/globalThis 引用链
  //    必须在 createContext 之后，确保上下文运作正常
  vm.runInContext(`
    (function() {
      var g = this;
      // 不可枚举、不可写的 window/self/globalThis 等
      Object.defineProperty(g, 'window', { value: g, writable: false, configurable: false, enumerable: true });
      Object.defineProperty(g, 'self', { value: g, writable: false, configurable: false, enumerable: true });
      Object.defineProperty(g, 'globalThis', { value: g, writable: false, configurable: false, enumerable: true });
      Object.defineProperty(g, 'top', { value: g, writable: false, configurable: false, enumerable: true });
      Object.defineProperty(g, 'parent', { value: g, writable: false, configurable: false, enumerable: true });
      Object.defineProperty(g, 'frames', { value: g, writable: false, configurable: false, enumerable: true });

      // Window 视口属性（浏览器标准）
      g.innerWidth = 1920;
      g.innerHeight = 1080;
      g.outerWidth = 1920;
      g.outerHeight = 1080;
      g.screenX = 0;
      g.screenY = 0;
      g.screenLeft = 0;
      g.screenTop = 0;
      g.pageXOffset = 0;
      g.pageYOffset = 0;
      g.scrollX = 0;
      g.scrollY = 0;
      g.devicePixelRatio = 1;

      // Window 方法 stub
      g.open = function() { return null; };
      g.close = function() {};
      g.focus = function() {};
      g.blur = function() {};
      g.alert = function() {};
      g.confirm = function() { return true; };
      g.prompt = function() { return ''; };
      g.scrollTo = function() {};
      g.scroll = function() {};
      g.scrollBy = function() {};
      g.moveTo = function() {};
      g.moveBy = function() {};
      g.resizeTo = function() {};
      g.resizeBy = function() {};
      g.print = function() {};
      g.getSelection = function() {
        return { anchorNode: null, focusNode: null, rangeCount: 0, type: 'None', toString: function() { return ''; } };
      };
      g.postMessage = function() {};
      
      g.chrome = {
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
          }
        },
        runtime: {
          connect: function() { return { postMessage: function() {}, onMessage: { addListener: function() {}, removeListener: function() {} } }; },
          sendMessage: function() {},
          onMessage: { addListener: function() {}, removeListener: function() {} },
          onConnect: { addListener: function() {}, removeListener: function() {} },
          getManifest: function() { return {}; },
          getURL: function(path) { return path; },
          id: '',
          lastError: null,
          connectNative: function() {},
          sendNativeMessage: function() {},
          onInstalled: { addListener: function() {}, removeListener: function() {} },
          onStartup: { addListener: function() {}, removeListener: function() {} },
          onSuspend: { addListener: function() {}, removeListener: function() {} },
          onSuspendCanceled: { addListener: function() {}, removeListener: function() {} },
          onUpdateAvailable: { addListener: function() {}, removeListener: function() {} },
          reload: function() {},
          requestUpdateCheck: function() {},
          restart: function() {},
          setUninstallURL: function() {}
        },
        extension: {
          connect: function() {},
          sendMessage: function() {},
          getURL: function(path) { return path; },
          getExtensionTabs: function() {},
          isAllowedFileSchemeAccess: function(callback) { callback(false); },
          isAllowedIncognitoAccess: function(callback) { callback(false); },
          onConnect: { addListener: function() {}, removeListener: function() {} },
          onMessage: { addListener: function() {}, removeListener: function() {} },
          onRequest: { addListener: function() {}, removeListener: function() {} },
          onRequestExternal: { addListener: function() {}, removeListener: function() {} },
          sendRequest: function() {},
          lastError: null,
          inIncognitoContext: false,
          connectNative: function() {},
          sendNativeMessage: function() {}
        },
        tabs: {
          query: function(info, callback) { callback([]); },
          create: function(info, callback) {},
          update: function(tabId, info, callback) {},
          move: function(tabId, info, callback) {},
          reload: function(tabId, info, callback) {},
          remove: function(tabId, callback) {},
          duplicate: function(tabId, callback) {},
          highlight: function(info, callback) {},
          detectLanguage: function(tabId, callback) { callback(''); },
          captureVisibleTab: function(windowId, info, callback) { callback(''); },
          executeScript: function(tabId, details, callback) {},
          insertCSS: function(tabId, details, callback) {},
          setZoom: function(tabId, zoomFactor, callback) {},
          getZoom: function(tabId, callback) { callback(1); },
          setZoomSettings: function(tabId, settings, callback) {},
          getZoomSettings: function(tabId, callback) { callback({}); },
          get: function(tabId, callback) { callback(null); },
          getAllInWindow: function(windowId, callback) { callback([]); },
          getCurrent: function(callback) { callback(null); },
          sendMessage: function(tabId, message, options, callback) {},
          connect: function(tabId, connectInfo) { return {}; },
          onCreated: { addListener: function() {}, removeListener: function() {} },
          onUpdated: { addListener: function() {}, removeListener: function() {} },
          onMoved: { addListener: function() {}, removeListener: function() {} },
          onActivated: { addListener: function() {}, removeListener: function() {} },
          onHighlighted: { addListener: function() {}, removeListener: function() {} },
          onDetached: { addListener: function() {}, removeListener: function() {} },
          onAttached: { addListener: function() {}, removeListener: function() {} },
          onRemoved: { addListener: function() {}, removeListener: function() {} },
          onReplaced: { addListener: function() {}, removeListener: function() {} },
          onSelectionChanged: { addListener: function() {}, removeListener: function() {} }
        },
        webRequest: {
          onBeforeRequest: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          onBeforeSendHeaders: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          onSendHeaders: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          onHeadersReceived: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          onResponseStarted: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          onBeforeRedirect: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          onCompleted: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          onErrorOccurred: { addListener: function() {}, removeListener: function() {}, hasListener: function() { return false; } },
          handlerBehaviorChanged: function(callback) {}
        },
        browserAction: {
          setTitle: function(details) {},
          getTitle: function(details, callback) { callback(''); },
          setIcon: function(details, callback) {},
          setPopup: function(details) {},
          getPopup: function(details, callback) { callback(''); },
          setBadgeText: function(details) {},
          getBadgeText: function(details, callback) { callback(''); },
          setBadgeBackgroundColor: function(details) {},
          getBadgeBackgroundColor: function(details, callback) { callback([]); },
          enable: function(tabId) {},
          disable: function(tabId) {},
          onClicked: { addListener: function() {}, removeListener: function() {} }
        },
        cookies: {
          get: function(details, callback) { callback(null); },
          getAll: function(details, callback) { callback([]); },
          set: function(details, callback) {},
          remove: function(details, callback) {},
          onChanged: { addListener: function() {}, removeListener: function() {} }
        },
        history: {
          search: function(query, callback) { callback([]); },
          getVisits: function(details, callback) { callback([]); },
          addUrl: function(details, callback) {},
          deleteUrl: function(details, callback) {},
          deleteRange: function(range, callback) {},
          deleteAll: function(callback) {},
          onVisited: { addListener: function() {}, removeListener: function() {} },
          onVisitRemoved: { addListener: function() {}, removeListener: function() {} }
        },
        bookmarks: {
          get: function(id, callback) { callback([]); },
          getChildren: function(id, callback) { callback([]); },
          getRecent: function(numberOfItems, callback) { callback([]); },
          getTree: function(callback) { callback([]); },
          search: function(query, callback) { callback([]); },
          create: function(bookmark, callback) {},
          move: function(id, destination, callback) {},
          update: function(id, changes, callback) {},
          remove: function(id, callback) {},
          removeTree: function(id, callback) {},
          onCreated: { addListener: function() {}, removeListener: function() {} },
          onRemoved: { addListener: function() {}, removeListener: function() {} },
          onChanged: { addListener: function() {}, removeListener: function() {} },
          onMoved: { addListener: function() {}, removeListener: function() {} },
          onImportBegan: { addListener: function() {}, removeListener: function() {} },
          onImportEnded: { addListener: function() {}, removeListener: function() {} }
        },
        storage: {
          local: {
            get: function(keys, callback) { callback({}); },
            set: function(items, callback) {},
            remove: function(keys, callback) {},
            clear: function(callback) {},
            getBytesInUse: function(keys, callback) { callback(0); },
            onChange: { addListener: function() {}, removeListener: function() {} }
          },
          sync: {
            get: function(keys, callback) { callback({}); },
            set: function(items, callback) {},
            remove: function(keys, callback) {},
            clear: function(callback) {},
            getBytesInUse: function(keys, callback) { callback(0); },
            onChange: { addListener: function() {}, removeListener: function() {} }
          },
          managed: {
            get: function(keys, callback) { callback({}); },
            set: function(items, callback) {},
            remove: function(keys, callback) {},
            clear: function(callback) {},
            getBytesInUse: function(keys, callback) { callback(0); },
            onChange: { addListener: function() {}, removeListener: function() {} }
          },
          session: {
            get: function(keys, callback) { callback({}); },
            set: function(items, callback) {},
            remove: function(keys, callback) {},
            clear: function(callback) {},
            getBytesInUse: function(keys, callback) { callback(0); },
            onChange: { addListener: function() {}, removeListener: function() {} }
          }
        },
        i18n: {
          getMessage: function(messageName, substitutions) { return ''; },
          getAcceptLanguages: function(callback) { callback(['en-US', 'en']); },
          detectLanguage: function(text, callback) { callback({ language: '', confidence: 0 }); },
          getUILanguage: function() { return 'en'; },
          getInstalledLanguages: function(callback) { callback([]); }
        },
        notifications: {
          create: function(id, options, callback) {},
          update: function(id, options, callback) {},
          clear: function(id, callback) { callback(false); },
          getAll: function(callback) { callback([]); },
          getPermissionLevel: function(callback) { callback('granted'); },
          onClosed: { addListener: function() {}, removeListener: function() {} },
          onClicked: { addListener: function() {}, removeListener: function() {} },
          onButtonClicked: { addListener: function() {}, removeListener: function() {} },
          onPermissionLevelChanged: { addListener: function() {}, removeListener: function() {} },
          onShowSettings: { addListener: function() {}, removeListener: function() {} }
        },
        alarms: {
          create: function(name, alarmInfo) {},
          get: function(name, callback) { callback(null); },
          getAll: function(callback) { callback([]); },
          clear: function(name, callback) { callback(false); },
          clearAll: function(callback) { callback(false); },
          onAlarm: { addListener: function() {}, removeListener: function() {} }
        },
        pageAction: {
          setTitle: function(details) {},
          getTitle: function(details, callback) { callback(''); },
          setIcon: function(details, callback) {},
          setPopup: function(details) {},
          getPopup: function(details, callback) { callback(''); },
          show: function(tabId) {},
          hide: function(tabId) {},
          onClicked: { addListener: function() {}, removeListener: function() {} }
        },
        commands: {
          getAll: function(callback) { callback([]); },
          onCommand: { addListener: function() {}, removeListener: function() {} }
        },
        devtools: {},
        downloads: {
          download: function(options, callback) {},
          search: function(query, callback) { callback([]); },
          pause: function(id) {},
          resume: function(id) {},
          cancel: function(id) {},
          getFileIcon: function(id, options, callback) { callback(''); },
          open: function(id) {},
          show: function(id) {},
          showDefaultFolder: function() {},
          drag: function(id) {},
          erase: function(downloadIds, callback) {},
          removeFile: function(id) {},
          onCreated: { addListener: function() {}, removeListener: function() {} },
          onChanged: { addListener: function() {}, removeListener: function() {} },
          onErased: { addListener: function() {}, removeListener: function() {} }
        },
        find: {
          find: function(details, callback) { callback(0); },
          highlightResults: function(details) {},
          stop: function() {},
          onFindResult: { addListener: function() {}, removeListener: function() {} }
        },
        identity: {
          getAuthToken: function(details, callback) {},
          removeCachedAuthToken: function(details, callback) {},
          launchWebAuthFlow: function(details, callback) {},
          clearAllCachedAuthTokens: function(callback) {}
        },
        idle: {
          queryState: function(detectionIntervalInSeconds, callback) { callback('active'); },
          setDetectionInterval: function(intervalInSeconds) {},
          onStateChanged: { addListener: function() {}, removeListener: function() {} }
        },
        management: {
          getAll: function(callback) { callback([]); },
          get: function(id, callback) { callback(null); },
          getSelf: function(callback) { callback(null); },
          uninstall: function(id, options, callback) {},
          uninstallSelf: function(options, callback) {},
          enable: function(id, callback) {},
          disable: function(id, callback) {},
          launchApp: function(id) {},
          createAppShortcut: function(id, callback) {},
          setEnabled: function(id, enabled, callback) {},
          onInstalled: { addListener: function() {}, removeListener: function() {} },
          onUninstalled: { addListener: function() {}, removeListener: function() {} },
          onEnabled: { addListener: function() {}, removeListener: function() {} },
          onDisabled: { addListener: function() {}, removeListener: function() {} },
          onUpdated: { addListener: function() {}, removeListener: function() {} }
        },
        net: {},
        power: {
          requestKeepAwake: function() {},
          releaseKeepAwake: function() {},
          shutdownSystem: function() {},
          rebootSystem: function() {}
        },
        printerProvider: {},
        privacy: {},
        proxy: {
          settings: {
            get: function(callback) { callback({}); },
            set: function(config, callback) {},
            clear: function(callback) {},
            onChange: { addListener: function() {}, removeListener: function() {} }
          },
          onProxyError: { addListener: function() {}, removeListener: function() {} }
        },
        scripting: {
          executeScript: function(details, callback) {},
          insertCSS: function(details, callback) {},
          removeCSS: function(details, callback) {}
        },
        search: {
          query: function(query, params, callback) {}
        },
        sessions: {
          getRecentlyClosed: function(filter, callback) { callback([]); },
          restore: function(sessionId, callback) {},
          onChanged: { addListener: function() {}, removeListener: function() {} }
        },
        sidebarAction: {},
        sitemap: {},
        sockets: {},
        speechRecognition: {},
        storageArea: {},
        system: {},
        tabs: {},
        topSites: {
          get: function(callback) { callback([]); }
        },
        tts: {
          speak: function(utterance, options, callback) {},
          stop: function() {},
          pause: function() {},
          resume: function() {},
          isSpeaking: function(callback) { callback(false); },
          getVoices: function(callback) { callback([]); },
          onVoicesChanged: { addListener: function() {}, removeListener: function() {} }
        },
        types: {},
        webNavigation: {},
        windows: {
          get: function(windowId, getInfo, callback) { callback(null); },
          getAll: function(getInfo, callback) { callback([]); },
          getCurrent: function(getInfo, callback) { callback(null); },
          getLastFocused: function(getInfo, callback) { callback(null); },
          create: function(createData, callback) {},
          update: function(windowId, updateInfo, callback) {},
          remove: function(windowId, callback) {},
          focus: function(windowId, callback) {},
          drawAttention: function(windowId, callback) {},
          onCreated: { addListener: function() {}, removeListener: function() {} },
          onRemoved: { addListener: function() {}, removeListener: function() {} },
          onFocusChanged: { addListener: function() {}, removeListener: function() {} },
          onBoundsChanged: { addListener: function() {}, removeListener: function() {} },
          onTabMoved: { addListener: function() {}, removeListener: function() {} },
          onTabAttached: { addListener: function() {}, removeListener: function() {} },
          onTabDetached: { addListener: function() {}, removeListener: function() {} }
        }
      };
      Object.defineProperty(g, 'chrome', {
        value: g.chrome,
        writable: true,
        configurable: true,
        enumerable: true
      });
      
      g._listeners = {};
      g.addEventListener = function(type, cb, opts) {
        if (!g._listeners[type]) g._listeners[type] = [];
        if (!g._listeners[type].includes(cb)) g._listeners[type].push(cb);
      };
      g.removeEventListener = function(type, cb, opts) {
        if (!g._listeners[type]) return;
        g._listeners[type] = g._listeners[type].filter(function(c) { return c !== cb; });
      };
      g.dispatchEvent = function(event) {
        event.target = g;
        event.currentTarget = g;
        var list = g._listeners[event.type];
        if (list) {
          var listCopy = list.slice();
          for (var i = 0; i < listCopy.length; i++) {
            if (event._immediatePropagationStopped) break;
            try { listCopy[i].call(g, event); } catch(e) {}
          }
        }
        var handlerKey = 'on' + event.type;
        if (typeof g[handlerKey] === 'function') {
          g[handlerKey].call(g, event);
        }
        return !event.defaultPrevented;
      };
    })();
  `, ctx);

  // 4. 清理 Node.js 特有的全局泄漏
  vm.runInContext(`
    (function() {
      // 移除 setImmediate/clearImmediate（非标准浏览器 API，仅由 timers 模块有条件添加）
      // 注意：timers 模块会根据需要将其放回
      delete this.setImmediate;
      delete this.clearImmediate;
    })();
  `, ctx);

  // 5. 保护 Error.prepareStackTrace（Node.js 特有）
  vm.runInContext(`
    (function() {
      // 某些检测脚本通过 Error.prepareStackTrace 检测 Node.js 环境
      if (Error.hasOwnProperty('prepareStackTrace')) {
        delete Error.prepareStackTrace;
      }
      if (Error.hasOwnProperty('stackTraceLimit') === false) {
        // 浏览器中也有 Error.stackTraceLimit，但值通常为 10
        Error.stackTraceLimit = 10;
      }
    })();
  `, ctx);

  // 6. 确保沙箱中所有基础构造函数的 prototype.constructor 不可枚举
  vm.runInContext(`
    (function() {
      var constructors = [
        Object, Array, Function, String, Number, Boolean,
        Symbol, Date, RegExp, Map, Set, WeakMap, WeakSet,
        Promise, Error, TypeError, RangeError, SyntaxError,
        ReferenceError, EvalError, URIError
      ];
      for (var i = 0; i < constructors.length; i++) {
        var ctor = constructors[i];
        if (ctor && ctor.prototype) {
          var desc = Object.getOwnPropertyDescriptor(ctor.prototype, 'constructor');
          if (desc && desc.enumerable !== false) {
            Object.defineProperty(ctor.prototype, 'constructor', {
              value: ctor,
              writable: true,
              configurable: true,
              enumerable: false
            });
          }
        }
      }
    })();
  `, ctx);

  // 7. 创建 Window 构造函数绕过 instanceof 检测
  //    瑞数6使用 new Function("try{return (window instanceof Window);}catch(e){}") 检测
  vm.runInContext(`
    (function() {
      // 创建 Window 构造函数
      function Window() {}
      // 让 Window.toString() 返回 [native code]（关键反检测）
      // 使用递归式 toString：让 tsTsFn.toString === tsTsFn，深度调用永远返回 native
      var nativeStr = 'function Window() { [native code] }';
      var tsFnNativeStr = 'function toString() { [native code] }';
      var tsTsFn = function toString() { return tsFnNativeStr; };
      Object.defineProperty(tsTsFn, 'toString', {
        value: tsTsFn,
        writable: false,
        configurable: true,
        enumerable: false
      });
      var tsFn = function toString() { return nativeStr; };
      Object.defineProperty(tsFn, 'toString', {
        value: tsTsFn,
        writable: false,
        configurable: true,
        enumerable: false
      });
      Object.defineProperty(Window, 'toString', {
        value: tsFn,
        writable: false,
        configurable: true,
        enumerable: false
      });
      // 将 Window.prototype 的 __proto__ 指向 Object.prototype
      Object.setPrototypeOf(Window.prototype, Object.getPrototypeOf(this));
      // 将全局对象的 __proto__ 指向 Window.prototype
      Object.setPrototypeOf(this, Window.prototype);
      // 导出 Window 构造函数
      this.Window = Window;

      // 确保 Window.prototype.constructor 不可枚举
      Object.defineProperty(Window.prototype, 'constructor', {
        value: Window,
        writable: true,
        configurable: true,
        enumerable: false
      });
    })();
  `, ctx);

  // 8. 确保沙箱中不泄露 Node.js 特有的全局属性（瑞数会用 new Function 探测）
  vm.runInContext(`
    (function() {
      // 这些属性在浏览器中不存在，但 Node.js 可能有
      var nodeSpecific = [
        'process', 'Buffer', 'require', 'module', 'exports',
        '__dirname', '__filename', 'global', 'GLOBAL', 'root',
        'setImmediate', 'clearImmediate'
      ];
      for (var i = 0; i < nodeSpecific.length; i++) {
        var name = nodeSpecific[i];
        if (name in this) {
          // 用 undefined 覆盖而不是 delete，确保 typeof 返回 'undefined'
          this[name] = undefined;
          delete this[name];
        }
      }
    })();
  `, ctx);

  // 9. 屏蔽自动化工具检测特征
  //    瑞数检测 30+ 种自动化工具和Hook框架的全局特征
  vm.runInContext(`
    (function() {
      // 将被检测的特征字符串定义为 undefined 的属性
      // 这样 'xxx' in window 为 false，typeof window.xxx 为 'undefined'
      // 这些都不需要定义，因为干净的 vm 上下文本来就没有它们
      
      // 但某些检测会尝试通过 Object.getOwnPropertyNames(window) 遍历
      // 所以确保下面这些名称不在 window 上:
      var cleanNames = [
        'callPhantom', '_phantom',
        '__webdriver_evaluate', '__selenium_evaluate', '__fxdriver_evaluate',
        '__driver_unwrapped', '__webdriver_unwrapped', '__selenium_unwrapped',
        '__fxdriver_unwrapped', '__webdriver_script_func', '__webdriver_script_fn',
        '_Selenium_IDE_Recorder', '_selenium', 'callSelenium',
        'webdriver',
        '$hook$', '$hdx$', '$sdx$', '$uie$',
        '$$lsr', '$$lsp', '$$lsrb', '$$logger',
        '$$ACXUTILS', '_ACX_EVAL_PASS', '_ACX_HOOKS',
        '$readyCodeAlreadyExecutedInThisFrame',
        'netsparker', '__ns', '__nsAppendText', 'eoWebBrowser',
        'hp_identifier', 'shenjian'
      ];
      for (var i = 0; i < cleanNames.length; i++) {
        if (cleanNames[i] in this) {
          delete this[cleanNames[i]];
        }
      }
      
      // 确保 webdriver 在 navigator 上为 false（已在 navigator 模块中设置）
    })();
  `, ctx);

  // 10. 创建沙箱本地 console（浏览器兼容，非 Node.js 泄露）
  var consoleMethods = ['log','warn','error','info','debug','trace','dir',
    'time','timeEnd','table','group','groupEnd','groupCollapsed','clear',
    'count','assert','dirxml','profile','profileEnd'];
  var consoleObj = { memory: null };
  for (var ci = 0; ci < consoleMethods.length; ci++) {
    var cm = consoleMethods[ci];
    if (typeof console[cm] === 'function') {
      consoleObj[cm] = console[cm].bind(console);
    }
  }
  ctx.console = consoleObj;

  return ctx;
}

module.exports = { createSandbox };
