'use strict';

/**
 * 浏览器 Native 函数保护工具
 *
 * 核心能力：
 * 1. Function.prototype.toString 返回 "[native code]"（浏览器原生函数的样子）
 * 2. Object.defineProperty 属性描述符精确匹配（writable/configurable/enumerable）
 * 3. prototype.constructor 修复（确保不可枚举）
 * 4. Symbol.toStringTag 支持
 * 5. 函数调用方式检测保护（new vs 普通调用）
 */

const NATIVE_CODE = '{ [native code] }';

/**
 * 让一个函数看起来像浏览器原生函数
 * 返回代理函数，其 toString 输出 "function X() { [native code] }"
 * 
 * 注意：此方法覆盖函数自身的 toString 方法。
 * 对于 Function.prototype.toString.call(fn) 的间接调用方式，
 * 请使用 protectFunctionToString() 来全局保护。
 */
function makeNative(fn, name) {
  name = name || fn.name || 'anonymous';
  // 使用递归式 toString：tsTsFn.toString === tsTsFn，深度调用永远返回 native
  var nativeStr = `function ${name}() ${NATIVE_CODE}`;
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
  Object.defineProperty(fn, 'toString', {
    value: tsFn,
    writable: false,
    configurable: true,
    enumerable: false
  });
  return fn;
}

/**
 * 在沙箱上下文中安装全局 Function.prototype.toString 保护
 * 这样即使使用 Function.prototype.toString.call(fn) 的间接调用方式，
 * 任何被 makeNative 标记的函数也能正确返回 [native code]
 */
function protectGlobalFunctionToString(sandbox) {
  const vm = require('vm');
  vm.runInContext(`
    (function() {
      var nativeToString = Function.prototype.toString;
      var nativeCodeStr = '{ [native code] }';
      var toStringSymbol = Symbol('toString-original');

      // 保存原始 toString 方便内部调用
      var origToString = Function.prototype.toString;

      // 维护一个被 makeNative 标记的函数集合
      var nativeSet = new WeakSet();

      Function.prototype.toString = function() {
        // 特殊处理：Function.prototype.toString 自身
        if (this === Function.prototype.toString) {
          return 'function toString() ' + nativeCodeStr;
        }
        // 如果函数自身有 toString 被重写（被 makeNative 标记），优先使用
        if (this !== undefined && this !== null) {
          var ownToString = Object.getOwnPropertyDescriptor(this, 'toString');
          if (ownToString && typeof ownToString.value === 'function' && ownToString.value !== this) {
            return ownToString.value();
          }
        }
        // 原生的 Function.prototype.toString 返回
        return nativeToString.call(this);
      };

      Object.defineProperty(Function.prototype, 'toString', {
        value: Function.prototype.toString,
        writable: true,
        configurable: true,
        enumerable: false
      });

      // 让 toString 本身看起来也是 native
      // 使用递归式 toString：tsFn.toString === tsFn，深度调用永远返回 native
      var tsFn = function toString() { return 'function toString() ' + nativeCodeStr; };
      Object.defineProperty(tsFn, 'toString', {
        value: tsFn,
        writable: false,
        configurable: true,
        enumerable: false
      });
      Object.defineProperty(Function.prototype.toString, 'toString', {
        value: tsFn,
        writable: false,
        configurable: true,
        enumerable: false
      });
    })();
  `, sandbox);
}

/**
 * 清理 Error 堆栈格式，使其更接近浏览器
 */
function cleanErrorStack(err) {
  if (!err || !err.stack) return err;
  // 浏览器中的 Error stack 格式：
  // Error: message
  //     at functionName (file:line:col)
  //     at new Constructor (file:line:col)
  // Node.js 的格式类似，但会包含 "node_modules" 等路径信息。
  // 这里的清理目标是：如果发现堆栈中包含 Node 特有的调用帧，
  // 尝试用简化帧替换。
  if (err.stack.includes('node:')) {
    err.stack = err.stack.replace(/^\s*at\s+(.+?)\s*\(?node:/gm, '    at $1 (native:');
  }
  return err;
}

/**
 * 在沙箱上下文中安装 Error 堆栈保护
 *
 * @param {object} sandbox - 沙箱上下文（vm 创建的 context）
 * @param {object} [options] - 配置项
 * @param {string} [options.baseURL] - 浏览器脚本基准 URL（来自 location 配置），
 *                                     用于将 Node 文件路径伪装为浏览器脚本 URL。
 *                                     如 'https://example.com/' 或 'about:blank'。
 */
function protectErrorStack(sandbox, options = {}) {
  const vm = require('vm');
  // 基准 URL 默认为 'about:blank'，由调用方根据 location 配置传入
  // 对 http(s) URL 规范化为带尾斜杠的 origin 形式（如 'https://example.com/'）
  let baseURL = options.baseURL || 'about:blank';
  let isBlankPage = false;
  if (/^https?:\/\//i.test(baseURL)) {
    try {
      const u = new URL(baseURL);
      baseURL = u.origin + '/';
    } catch (e) {}
  } else if (baseURL === 'about:blank' || baseURL === '') {
    // about:blank 页面没有 origin，浏览器中 inline 脚本显示为 <anonymous>
    isBlankPage = true;
  }
  // 注意：Node.js 中 Error.prepareStackTrace 是 V8 isolate 级别的钩子，
  // 设置在 sandbox 上的版本会泄漏到主上下文，污染主上下文错误堆栈。
  // 因此必须区分：沙箱错误用浏览器格式，主上下文错误用 Node 默认格式。
  vm.runInContext(`
    (function() {
      var __baseURL = ${JSON.stringify(baseURL)};
      var __blankPage = ${JSON.stringify(isBlankPage)};
      // 沙箱内文件名集合（用于识别沙箱帧）：
      // - 'eval' / 'vm.js' 系列：vm.runInContext 默认文件名
      // - 显式传入的 filename（由 run() 通过 vm 选项设置）
      // 主上下文帧的文件名通常是绝对路径（Windows 盘符或 POSIX 根）
      function isMainContextFile(file) {
        if (!file) return false;
        // Windows 绝对路径：C:\\... 或 C:/...
        if (/^[A-Za-z]:[\\\\/]/.test(file)) return true;
        // POSIX 绝对路径
        if (file.charAt(0) === '/' && file.indexOf('/lib/') === -1) return true;
        // node:internal 帧由调用方过滤
        return false;
      }

      Error.prepareStackTrace = function(err, frames) {
        // 判断是否为沙箱内抛出的错误：
        // 找到第一个非 Node 内部、非 lib/ 的帧，若其文件名不是主上下文绝对路径，
        // 则认为是沙箱错误，用浏览器格式；否则回退到 Node 默认格式。
        var isSandboxError = false;
        for (var i = 0; i < frames.length; i++) {
          var f = frames[i];
          var file = f.getFileName() || '';
          if (!file) continue;
          if (file.indexOf('node:') === 0 || file.indexOf('internal/') !== -1) continue;
          if (file.indexOf('\\\\lib\\\\') !== -1 || file.indexOf('/lib/') !== -1) continue;
          // 第一个用户帧：判断来源
          if (isMainContextFile(file)) {
            isSandboxError = false;
          } else {
            isSandboxError = true;
          }
          break;
        }

        if (!isSandboxError) {
          // 主上下文错误：使用 Node 默认格式（V8 内置的 CallSite 格式）
          // 通过重建默认格式的字符串来实现
          var defaultLines = ['Error: ' + (err.message || '')];
          for (var j = 0; j < frames.length; j++) {
            var ff = frames[j];
            var fn = ff.getFunctionName() || ff.getMethodName() || '<anonymous>';
            var fl = ff.getFileName() || '<anonymous>';
            var ln = ff.getLineNumber() || 0;
            var cl = ff.getColumnNumber() || 0;
            var loc = fl + ':' + ln + ':' + cl;
            if (fn) {
              defaultLines.push('    at ' + fn + ' (' + loc + ')');
            } else {
              defaultLines.push('    at ' + loc);
            }
          }
          return defaultLines.join('\\n');
        }

        // 沙箱错误：浏览器风格格式
        var lines = ['Error: ' + (err.message || '')];
        for (var k = 0; k < frames.length; k++) {
          var f2 = frames[k];
          var fn2 = f2.getFunctionName() || f2.getMethodName() || '<anonymous>';
          var file2 = f2.getFileName() || 'eval';
          var line2 = f2.getLineNumber() || 0;
          var col2 = f2.getColumnNumber() || 0;
          // 隐藏 Node.js 内部帧与 lib/ 帧
          if (file2 && (file2.indexOf('node:') === 0 || file2.indexOf('internal/') !== -1)) continue;
          if (file2 && file2.indexOf('\\\\lib\\\\') !== -1) continue;
          if (file2 && file2.indexOf('/lib/') !== -1) continue;
          // 主上下文帧（如 index.js 的 run()）也隐藏，让堆栈看起来更像浏览器
          if (isMainContextFile(file2)) continue;
          // 转换为浏览器 URL 风格
          if (__blankPage) {
            lines.push('    at ' + fn2 + ' (<anonymous>:' + line2 + ':' + col2 + ')');
            continue;
          }
          if (file2 === 'eval' || file2.indexOf('vm.js') !== -1) {
            file2 = __baseURL;
          } else if (file2 && file2.indexOf('.js') !== -1) {
            var baseName = file2.split(/[\\\\/]/).pop();
            file2 = __baseURL + baseName;
          }
          lines.push('    at ' + fn2 + ' (' + file2 + ':' + line2 + ':' + col2 + ')');
        }
        return lines.join('\\n');
      };
      // 浏览器中 Error.stackTraceLimit 通常为 10
      Error.stackTraceLimit = 10;
    })();
  `, sandbox);
}

/**
 * 安装 Symbol.toStringTag 保护
 * 浏览器中某些对象应该返回特定的 Symbol.toStringTag
 */
function installToStringTag(sandbox, obj, tag) {
  Object.defineProperty(obj, Symbol.toStringTag, {
    value: tag,
    writable: false,
    configurable: true,
    enumerable: false
  });
}

/**
 * 用 Object.defineProperty 创建精确的属性描述符
 */
function defineProp(obj, key, value, opts = {}) {
  const desc = {
    configurable: opts.configurable !== undefined ? opts.configurable : true,
    enumerable: opts.enumerable !== undefined ? opts.enumerable : true,
    writable: opts.writable !== undefined ? opts.writable : true,
    value
  };
  if (opts.get || opts.set) {
    delete desc.writable;
    delete desc.value;
    if (opts.get) desc.get = opts.get;
    if (opts.set) desc.set = opts.set;
  }
  Object.defineProperty(obj, key, desc);
}

/**
 * 修复原型链：确保 Constructor.prototype.constructor === Constructor
 */
function fixProtoChain(ctor, parentCtor) {
  ctor.prototype.constructor = ctor;
  if (parentCtor) {
    Object.setPrototypeOf(ctor.prototype, parentCtor.prototype);
  }
  // 让构造函数本身看起来是 native
  makeNative(ctor, ctor.name);
  return ctor;
}

/**
 * 创建不可枚举、不可写、不可配的属性（如 Event 常量）
 */
function defineConstant(obj, key, value) {
  Object.defineProperty(obj, key, {
    value,
    writable: false,
    configurable: false,
    enumerable: false
  });
}

/**
 * 创建 getter-only 属性（带 native toString 保护）
 */
function defineGetter(obj, key, getter, enumerable = true) {
  Object.defineProperty(obj, key, {
    get: makeNative(getter, `get ${key}`),
    set: undefined,
    configurable: true,
    enumerable
  });
}

/**
 * 创建 getter/setter 属性
 */
function defineAccessor(obj, key, getter, setter, enumerable = true) {
  Object.defineProperty(obj, key, {
    get: makeNative(getter, `get ${key}`),
    set: setter ? makeNative(setter, `set ${key}`) : undefined,
    configurable: true,
    enumerable
  });
}

/**
 * 确保 instanceof 正确工作
 * realBrowserEnv.GlobalObject instanceof realBrowserEnv.Object -> true
 */
function setupInstanceOf(sandbox) {
  // 修正所有内置构造函数的 Symbol.hasInstance
  // 这通常在模块加载时由 fixProtoChain 自动处理
}

module.exports = {
  makeNative,
  defineProp,
  defineConstant,
  defineGetter,
  defineAccessor,
  fixProtoChain,
  protectGlobalFunctionToString,
  protectErrorStack,
  cleanErrorStack,
  installToStringTag
};
