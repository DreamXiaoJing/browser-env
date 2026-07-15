'use strict';

/**
 * Proxy 吐环境监测器
 *
 * 用 Proxy 包裹 window 对象，捕获所有属性访问、方法调用，
 * 生成"环境缺口"日志。这是补环境的第一步：
 * 跑目标 JS → 看缺什么 → 补什么。
 */

let _accessLog = [];
let _enabled = false;

/**
 * 创建包裹 sandbox 的 Proxy 观察器
 * 所有对 window 的属性访问都会被记录
 */
function createProxyObserver(sandbox) {
  if (sandbox.__proxyObserverInstalled) return sandbox;

  const handler = {
    get(target, prop, receiver) {
      if (typeof prop === 'symbol') {
        return Reflect.get(target, prop, receiver);
      }

      if (_enabled && prop !== '__proxyObserverInstalled') {
        _accessLog.push({
          type: 'get',
          path: prop,
          timestamp: Date.now()
        });
      }

      const value = Reflect.get(target, prop, receiver);

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        if (!value.__proxyWrapped) {
          try {
            const wrapped = wrapObject(value, prop, target);
            return wrapped;
          } catch (e) {
            return value;
          }
        }
      }

      if (typeof value === 'function') {
        return new Proxy(value, {
          apply(target2, thisArg, args) {
            if (_enabled) {
              _accessLog.push({
                type: 'call',
                path: prop,
                args: args.map(a => typeof a === 'object' ? typeof a : typeof a),
                timestamp: Date.now()
              });
            }
            return Reflect.apply(target2, thisArg, args);
          }
        });
      }

      return value;
    },

    set(target, prop, value, receiver) {
      if (_enabled && typeof prop !== 'symbol') {
        _accessLog.push({
          type: 'set',
          path: String(prop),
          value: typeof value,
          timestamp: Date.now()
        });
      }
      return Reflect.set(target, prop, value, receiver);
    },

    has(target, prop) {
      if (_enabled && typeof prop !== 'symbol') {
        _accessLog.push({
          type: 'has',
          path: String(prop),
          timestamp: Date.now()
        });
      }
      return Reflect.has(target, prop);
    }
  };

  sandbox.__proxyObserverInstalled = true;
  return new Proxy(sandbox, handler);
}

/**
 * 递归包裹对象，追踪深层属性访问
 */
function wrapObject(obj, path, root) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj;
  if (obj instanceof RegExp) return obj;
  if (Array.isArray(obj)) return obj;
  if (obj.__proxyWrapped) return obj;
  if (typeof obj === 'function') return obj;

  try {
    const handler = {
      get(target, prop, receiver) {
        if (prop === '__proxyWrapped') return true;
        if (typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }

        if (_enabled) {
          _accessLog.push({
            type: 'get',
            path: `${path}.${String(prop)}`,
            timestamp: Date.now()
          });
        }

        const value = Reflect.get(target, prop, receiver);
        if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof RegExp)) {
          if (!value.__proxyWrapped && !value.__proxyObserverInstalled) {
            try {
              return wrapObject(value, `${path}.${String(prop)}`, root);
            } catch (e) {
              return value;
            }
          }
        }
        if (typeof value === 'function') {
          return new Proxy(value, {
            apply(target2, thisArg, args) {
              if (_enabled) {
                _accessLog.push({
                  type: 'call',
                  path: `${path}.${String(prop)}`,
                  args: args.map(a => typeof a === 'object' ? typeof a : typeof a),
                  timestamp: Date.now()
                });
              }
              return Reflect.apply(target2, thisArg, args);
            }
          });
        }
        return value;
      }
    };
    const proxy = new Proxy(obj, handler);
    return proxy;
  } catch (e) {
    return obj;
  }
}

/**
 * 启动观察（开始记录环境访问）
 */
function startObserving() {
  _enabled = true;
  _accessLog = [];
}

/**
 * 停止观察
 */
function stopObserving() {
  _enabled = false;
}

/**
 * 获取并清空访问日志
 */
function flushLog() {
  const log = _accessLog.slice();
  _accessLog = [];
  return log;
}

/**
 * 获取日志摘要：按属性路径去重，统计访问频次
 */
function getSummary(log) {
  const counts = {};
  const byType = { get: {}, set: {}, call: {}, has: {} };

  for (const entry of log) {
    const key = entry.path;
    counts[key] = (counts[key] || 0) + 1;

    const typeBucket = byType[entry.type];
    if (typeBucket) {
      typeBucket[key] = (typeBucket[key] || 0) + 1;
    }
  }

  return {
    total: log.length,
    unique: Object.keys(counts).length,
    byType: Object.fromEntries(
      Object.entries(byType).map(([t, paths]) => [t, Object.keys(paths).length])
    ),
    topPaths: Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([path, count]) => ({ path, count }))
  };
}

function getObserverState() {
  return {
    enabled: _enabled,
    accessLog: _accessLog
  };
}

function wrapSandboxForTracing(sandbox) {
  return sandbox;
}

module.exports = {
  createProxyObserver,
  startObserving,
  stopObserving,
  flushLog,
  getSummary,
  getObserverState,
  wrapSandboxForTracing
};
