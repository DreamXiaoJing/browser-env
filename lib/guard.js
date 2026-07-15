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
  Object.defineProperty(fn, 'toString', {
    value: () => `function ${name}() ${NATIVE_CODE}`,
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
      
      Function.prototype.toString = function() {
        // 如果函数自身有 toString 被重写（被 makeNative 标记），优先使用
        if (this !== undefined && this !== null && this !== Function.prototype.toString) {
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
      Object.defineProperty(Function.prototype.toString, 'toString', {
        value: function() { return 'function toString() ' + nativeCodeStr; },
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
 */
function protectErrorStack(sandbox) {
  const vm = require('vm');
  vm.runInContext(`
    (function() {
      // 移除 Node.js 特有的 Error API
      if (Error.hasOwnProperty('prepareStackTrace')) {
        delete Error.prepareStackTrace;
      }
      // 使 stack 属性的 getter 更浏览器化
      // 注意：实际的堆栈格式修改很复杂，保留原始行为
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
