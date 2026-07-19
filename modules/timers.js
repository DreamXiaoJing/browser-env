'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * timers 模块
 *
 * 实现浏览器定时器函数，在 Node.js vm 中运行。
 * 使用 Node.js 的 setTimeout/setInterval 作为底层。
 *
 * 包括:
 * - setTimeout / clearTimeout
 * - setInterval / clearInterval
 * - setImmediate / clearImmediate (包装)
 * - requestAnimationFrame / cancelAnimationFrame
 * - requestIdleCallback / cancelIdleCallback
 * - __flushTimers - 刷新 pendings 定时器（用于 RS 异步执行）
 */

function install(sandbox, config = {}) {
  // ── 0 延迟定时器队列（用于 RS 的 setTimeout(fn, 0) 异步链）──
  var pendingZeroDelay = [];
  // 浏览器里 setTimeout/setInterval 返回数字 ID，Node.js 返回 Timeout 对象（含循环引用）
  // 这里维护一个数字 ID → 原生句柄 的映射，让沙箱里拿到的始终是数字
  var timerIdCounter = 1;
  var nativeTimerMap = new Map();

  function registerNativeTimer(nativeHandle) {
    var id = timerIdCounter++;
    nativeTimerMap.set(id, nativeHandle);
    return id;
  }

  // ── setTimeout ──
  sandbox.setTimeout = makeNative(function setTimeout(callback, delay, ...args) {
    // RS VMP 使用 setTimeout(fn, 0) 异步链, 需入队列供 flushTimers 同步执行
    // 浏览器最小延迟 4ms, 但 RS 的 0 延迟必须进 pending 队列

    // 调试：如果callback不是函数也不是字符串，打印调用栈
    if (sandbox.__debugTimers__ && typeof callback !== 'function' && typeof callback !== 'string') {
      console.error('[SETTIMEOUT ERROR] callback is not a function or string:', typeof callback, callback);
      console.error('[SETTIMEOUT ERROR] stack:', new Error().stack);
    }

    if (delay === 0 || delay === undefined || delay === null) {
      var id = timerIdCounter++;
      pendingZeroDelay.push({ id: id, fn: typeof callback === 'string' ? function() { sandbox.eval(callback); } : callback, args: args });
      return id;
    }
    // 非零延迟使用 Node.js setTimeout（带 4ms 最小限制）
    var minDelay = 4;
    var effectiveDelay = Math.max(minDelay, Number(delay));
    var nativeHandle = global.setTimeout(function() {
      if (typeof callback === 'string') {
        sandbox.eval(callback);
      } else if (typeof callback === 'function') {
        callback.apply(undefined, args);
      }
    }, effectiveDelay);
    return registerNativeTimer(nativeHandle);
  }, 'setTimeout');

  sandbox.clearTimeout = makeNative(function clearTimeout(id) {
    // 检查 pending 队列
    for (var i = 0; i < pendingZeroDelay.length; i++) {
      if (pendingZeroDelay[i].id === id) {
        pendingZeroDelay.splice(i, 1);
        return;
      }
    }
    var handle = nativeTimerMap.get(id);
    if (handle !== undefined) {
      nativeTimerMap.delete(id);
      global.clearTimeout(handle);
    }
  }, 'clearTimeout');

  // ── setInterval ──
  sandbox.setInterval = makeNative(function setInterval(callback, interval, ...args) {
    var effectiveInterval = Math.max(4, interval || 4);
    var nativeHandle = global.setInterval(function() {
      if (typeof callback === 'string') {
        sandbox.eval(callback);
      } else if (typeof callback === 'function') {
        callback.apply(undefined, args);
      }
    }, effectiveInterval);
    return registerNativeTimer(nativeHandle);
  }, 'setInterval');

  sandbox.clearInterval = makeNative(function clearInterval(id) {
    var handle = nativeTimerMap.get(id);
    if (handle !== undefined) {
      nativeTimerMap.delete(id);
      global.clearInterval(handle);
    }
  }, 'clearInterval');

  // ── setImmediate / clearImmediate ──
  if (typeof global.setImmediate !== 'undefined') {
    sandbox.setImmediate = makeNative(function setImmediate(callback, ...args) {
      var nativeHandle = global.setImmediate(function() {
        if (typeof callback === 'function') callback.apply(undefined, args);
      });
      return registerNativeTimer(nativeHandle);
    }, 'setImmediate');

    sandbox.clearImmediate = makeNative(function clearImmediate(id) {
      var handle = nativeTimerMap.get(id);
      if (handle !== undefined) {
        nativeTimerMap.delete(id);
        global.clearImmediate(handle);
      }
    }, 'clearImmediate');
  }

  // ── requestAnimationFrame ──
  sandbox.requestAnimationFrame = makeNative(function requestAnimationFrame(callback) {
    var nativeHandle = global.setTimeout(function() {
      var sandboxPerf = sandbox.performance;
      var time = sandboxPerf ? sandboxPerf.now() : Date.now();
      callback(time);
    }, 16);
    return registerNativeTimer(nativeHandle);
  }, 'requestAnimationFrame');

  sandbox.cancelAnimationFrame = makeNative(function cancelAnimationFrame(id) {
    var handle = nativeTimerMap.get(id);
    if (handle !== undefined) {
      nativeTimerMap.delete(id);
      global.clearTimeout(handle);
    }
  }, 'cancelAnimationFrame');

  // ── requestIdleCallback ──
  sandbox.requestIdleCallback = makeNative(function requestIdleCallback(callback, options) {
    var timeout = (options && options.timeout) || 50;
    var nativeHandle = global.setTimeout(function() {
      callback({
        didTimeout: false,
        timeRemaining: makeNative(function() { return 50; }, 'timeRemaining')
      });
    }, 1);
    return registerNativeTimer(nativeHandle);
  }, 'requestIdleCallback');

  sandbox.cancelIdleCallback = makeNative(function cancelIdleCallback(id) {
    var handle = nativeTimerMap.get(id);
    if (handle !== undefined) {
      nativeTimerMap.delete(id);
      global.clearTimeout(handle);
    }
  }, 'cancelIdleCallback');

  // ── queueMicrotask ──
  sandbox.queueMicrotask = makeNative(function queueMicrotask(callback) {
    Promise.resolve().then(callback);
  }, 'queueMicrotask');

  // ── __flushTimers：刷新 pending 0-delay 定时器（RS JS 异步执行用）──
  // 瑞数使用 setTimeout(fn, 0) 链来异步执行代码片段。
  // 此函数同步执行所有 0-delay 队列中的回调。
  sandbox.__flushTimers = makeNative(function(maxRounds) {
    maxRounds = maxRounds || 10;
    var executed = 0;
    for (var round = 0; round < maxRounds; round++) {
      var batch = pendingZeroDelay.splice(0, pendingZeroDelay.length);
      if (batch.length === 0) break;
      for (var i = 0; i < batch.length; i++) {
        try {
          batch[i].fn.apply(undefined, batch[i].args);
          executed++;
        } catch (e) {
          // 记录错误到sandbox中
          if (sandbox.__timerErrors__) {
            sandbox.__timerErrors__.push({
              message: e.message,
              stack: e.stack,
              id: batch[i].id
            });
          }
          // 如果开启了调试模式，则打印错误
          if (sandbox.__debugTimers__) {
            console.error('[TIMER FLUSH ERROR]', e.message);
            console.error('[TIMER FLUSH ERROR] stack:', (e.stack || '').split('\n').slice(0, 5).join('\n'));
          }
        }
      }
    }
    return executed;
  }, '__flushTimers');

  // ── __pendingTimerCount：查看队列大小 ──
  sandbox.__pendingTimerCount = makeNative(function() {
    return pendingZeroDelay.length;
  }, '__pendingTimerCount');

  // ── __getTimerCount：获取所有定时器数量 ──
  sandbox.__getTimerCount = makeNative(function() {
    return pendingZeroDelay.length;
  }, '__getTimerCount');

  // ── 检查：window 上也要有 ──
  if (sandbox.window) {
    sandbox.window.setTimeout = sandbox.setTimeout;
    sandbox.window.clearTimeout = sandbox.clearTimeout;
    sandbox.window.setInterval = sandbox.setInterval;
    sandbox.window.clearInterval = sandbox.clearInterval;
    sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;
    sandbox.window.cancelAnimationFrame = sandbox.cancelAnimationFrame;
    sandbox.window.requestIdleCallback = sandbox.requestIdleCallback;
    sandbox.window.cancelIdleCallback = sandbox.cancelIdleCallback;
    sandbox.window.queueMicrotask = sandbox.queueMicrotask;
    sandbox.window.__flushTimers = sandbox.__flushTimers;
    sandbox.window.__pendingTimerCount = sandbox.__pendingTimerCount;
  }
}

module.exports = { install };
