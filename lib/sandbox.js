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
      // 将 Window.prototype 的 __proto__ 指向 Object.prototype
      // 这样 Window.prototype 在原型链中位于 Object.prototype 之前
      Object.setPrototypeOf(Window.prototype, Object.getPrototypeOf(this));
      // 将全局对象的 __proto__ 指向 Window.prototype
      // 原型链: this → Window.prototype → Object.prototype → null
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
