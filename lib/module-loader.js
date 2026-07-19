'use strict';

const fs = require('fs');
const path = require('path');
const { protectGlobalFunctionToString, protectErrorStack } = require('./guard');

const MODULES_DIR = path.join(__dirname, '..', 'modules');

/**
 * 内置模块加载顺序（依赖关系）
 * 数字越小越先加载
 */
const LOAD_ORDER = {
  // 核心 BOM
  'navigator':    10,
  'location':     20,
  'history':      30,
  'screen':       40,
  // 事件
  'events':       50,
  // window（document依赖）
  'window':       55,
  // DOM
  'document':     60,
  // 存储
  'storage':      70,
  // 加密/性能
  'crypto':       80,
  'performance':  90,
  // 定时器
  'timers':       100,
  // 网络
  'fetch':        110,
  'xmlhttprequest': 115,
  'websocket':    120,
  // URL 加载器
  'url-loader':   125,
  // 全局构造函数（canvas等模块依赖）
  'globals':      127,
  // 指纹
  'canvas':       130,
  'audio':        140,
  'webrtc':       150,
  // 多线程
  'worker':       160,
  // chrome 对象（抗检测核心）
  'chrome':       170,
  // DOM 扩展 API
  'dom-extra':    180
};

const DEFAULT_LOAD = Object.keys(LOAD_ORDER);

/**
 * 加载指定的模块列表
 *
 * @param {object} sandbox  - 沙箱上下文（vm 创建的 context）
 * @param {string[]} modules - 模块名列表（如 ['navigator', 'document']）
 * @param {object} config   - 全局配置（用于传递 UA、platform 等）
 */
function loadModules(sandbox, modules, config = {}) {
  const loaded = [];
  const errors = [];

  // 去重
  const uniqueModules = [...new Set(modules)];

  for (const name of uniqueModules) {
    try {
      const modulePath = path.join(MODULES_DIR, `${name}.js`);
      if (!fs.existsSync(modulePath)) {
        errors.push(`Module not found: ${name} (${modulePath})`);
        continue;
      }

      const mod = require(modulePath);
      if (typeof mod.install !== 'function') {
        errors.push(`Module ${name} has no install() export`);
        continue;
      }

      mod.install(sandbox, config);
      loaded.push(name);
    } catch (err) {
      errors.push(`Module ${name}: ${err.message}`);
    }
  }

  return { loaded, errors };
}

/**
 * 加载默认模块集（按依赖顺序）
 */
function loadDefaultModules(sandbox, config = {}) {
  return loadModules(sandbox, DEFAULT_LOAD, config);
}

/**
 * 按依赖顺序排序的模块列表
 */
function sortModules(modules) {
  return [...modules].sort((a, b) => {
    const oa = LOAD_ORDER[a] || 999;
    const ob = LOAD_ORDER[b] || 999;
    return oa - ob;
  });
}

module.exports = {
  loadModules,
  loadDefaultModules,
  sortModules,
  LOAD_ORDER,
  DEFAULT_LOAD
};
