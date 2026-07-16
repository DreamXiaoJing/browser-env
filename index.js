'use strict';

const { createSandbox } = require('./lib/sandbox');
const { loadModules, loadDefaultModules } = require('./lib/module-loader');
const { createProxyObserver, startObserving, stopObserving, flushLog, getSummary, wrapSandboxForTracing } = require('./lib/proxy-observer');
const { protectGlobalFunctionToString, protectErrorStack } = require('./lib/guard');
const { fixDocumentAll } = require('./lib/document-all-fix');
const { initTLSClient, destroyTLSClient, isInitialized: isTLSInitialized, tlsRequest } = require('./lib/tls-client');

/**
 * BrowserEnv — Node.js 浏览器补环境框架
 *
 * 在 Node.js vm 沙箱中创建一个完整的浏览器环境。
 * 所有模块都按依赖顺序加载，确保原型链正确、native toString 保护到位。
 *
 * @example
 *   const { BrowserEnv } = require('browser-env');
 *   const env = new BrowserEnv({
 *     navigator: { platform: 'Win32' },
 *     document: { URL: 'https://example.com' }
 *   });
 *   const ctx = env.create();
 *   ctx.run('console.log(navigator.userAgent)');
 */

class BrowserEnv {
  /**
   * @param {object} config - 环境配置
   * @param {object} config.navigator - navigator 配置（UA, platform, language 等）
   * @param {object} config.location - location 配置
   * @param {object} config.document - document 配置（URL, cookie 等）
   * @param {object} config.screen - screen 配置
   * @param {object} config.performance - performance 配置
   * @param {object} config.crypto - crypto 配置
   * @param {object} config.storage - storage 配置
   * @param {object} config.canvas - canvas/WebGL 配置
   * @param {object} config.audio - AudioContext 配置
   * @param {array} config.modules - 自定义模块列表（默认所有模块）
   * @param {boolean} config.proxyObserver - 是否启用 Proxy 观察（默认 false）
   */
  constructor(config = {}) {
    this.config = config;
    this.sandbox = null;
    this.modules = config.modules || null;
    this._proxyEnabled = config.proxyObserver === true;
  }

  /**
   * 创建并初始化浏览器环境
   * @returns {object} vm 上下文
   */
  create() {
    // 1. 创建 VM 沙箱
    this.sandbox = createSandbox();

    // 2. 安装浏览器模块
    if (this.modules) {
      const { loaded, errors } = loadModules(this.sandbox, this.modules, this.config);
      if (errors.length > 0) {
        console.warn('[browser-env] Module load errors:', errors);
      }
    } else {
      const { loaded, errors } = loadDefaultModules(this.sandbox, this.config);
      if (errors.length > 0) {
        console.warn('[browser-env] Module load errors:', errors);
      }
    }

    // 3. 根据 UA 修正 window 视口属性
    const navCfg = this.config.navigator || {};
    const ua = navCfg.userAgent || '';
    const isiPhone = /iPhone/.test(ua);
    const isiPad = /iPad/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isMobile = isiPhone || isiPad || isAndroid;

    if (isMobile) {
      const ctx = this._sandboxContext || this.sandbox;
      const vm = require('vm');
      const width = isiPhone ? 390 : isiPad ? 1024 : 412;
      const height = isiPhone ? 844 : isiPad ? 1366 : 915;
      vm.runInContext(`
        this.innerWidth = ${width};
        this.innerHeight = ${height};
        this.outerWidth = ${width};
        this.outerHeight = ${height};
        this.devicePixelRatio = ${isiPhone || isiPad ? 3 : 2};
      `, ctx);
    }

    // 4. 安装抗检测全局保护
    protectGlobalFunctionToString(this.sandbox);
    protectErrorStack(this.sandbox);

    // 5. 可选启用追踪观察器
    if (this._proxyEnabled) {
      wrapSandboxForTracing(this.sandbox);
      startObserving();
    }

    // 6. 如果配置了 TLS，暴露 TLS 请求函数给沙箱
    if (this.config.tls) {
      this.sandbox.__tlsRequest = tlsRequest;
    }

    return this.sandbox;
  }

  /**
   * 初始化 TLS 客户端（模拟浏览器 TLS 指纹）
   * @param {object} tlsConfig - TLS 配置
   * @param {string} tlsConfig.clientIdentifier - 客户端标识符，如 'chrome_131'
   * @param {number} tlsConfig.timeout - 请求超时（毫秒）
   * @param {boolean} tlsConfig.insecureSkipVerify - 跳过证书验证
   * @param {boolean} tlsConfig.randomTlsExtensionOrder - 随机化 TLS 扩展顺序
   * @param {string} tlsConfig.proxy - 代理服务器
   * @returns {Promise<void>}
   */
  async initTLS(tlsConfig = {}) {
    if (!this.sandbox) {
      throw new Error('BrowserEnv not created yet. Call create() first.');
    }

    // 自动从沙箱 navigator 提取浏览器信息
    const nav = this.sandbox.navigator || {};
    const browserInfo = {
      userAgent: nav.userAgent,
      language: nav.language,
      languages: nav.languages,
      userAgentData: nav.userAgentData,
      isMobile: nav.userAgentData ? nav.userAgentData.mobile : false
    };

    const config = {
      ...this.config.tls,
      ...tlsConfig,
      userAgent: tlsConfig.userAgent || browserInfo.userAgent,
      browserInfo
    };
    await initTLSClient(config);

    // 暴露 TLS 请求函数给沙箱
    this.sandbox.__tlsRequest = tlsRequest;
  }

  /**
   * 销毁 TLS 客户端
   * @returns {Promise<void>}
   */
  async destroyTLS() {
    await destroyTLSClient();
    if (this.sandbox) {
      delete this.sandbox.__tlsRequest;
    }
  }

  /**
   * 在沙箱中执行 JS 代码
   * @param {string} code - JavaScript 代码或文件路径
   * @param {string} filename - 可选的来源文件名
   * @returns {*} 执行结果
   */
  run(code, filename) {
    if (!this.sandbox) {
      throw new Error('BrowserEnv not created yet. Call create() first.');
    }
    const vm = require('vm');
    const fs = require('fs');
    const path = require('path');
    const ctx = this._sandboxContext || this.sandbox;
    
    if (this._proxyEnabled) {
      this._injectTracing(ctx);
    }
    
    let sourceCode = code;
    let sourceFilename = filename || 'eval';
    
    if (typeof code === 'string') {
      const resolvedPath = path.resolve(code);
      if (fs.existsSync(resolvedPath)) {
        sourceCode = fs.readFileSync(resolvedPath, 'utf8');
        sourceFilename = resolvedPath;
      }
    }
    
    const processedCode = fixDocumentAll(sourceCode);
    return vm.runInContext(processedCode, ctx, { filename: sourceFilename });
  }

  /**
   * 加载指定 URL 的 HTML 内容到文档中
   * @param {string} url - 目标网页 URL
   * @returns {Promise} 加载完成后的 Promise
   */
  loadUrl(url) {
    if (!this.sandbox) {
      throw new Error('BrowserEnv not created yet. Call create() first.');
    }
    
    const ctx = this._sandboxContext || this.sandbox;
    
    if (typeof ctx.__loadUrl !== 'function') {
      throw new Error('url-loader module not loaded');
    }
    
    return ctx.__loadUrl(url);
  }

  /**
   * 直接解析 HTML 字符串并执行其中的脚本
   * @param {string} html - HTML 字符串
   * @returns {object} 解析结果
   */
  parseHtml(html) {
    if (!this.sandbox) {
      throw new Error('BrowserEnv not created yet. Call create() first.');
    }
    
    const ctx = this._sandboxContext || this.sandbox;
    
    if (typeof ctx.__parseHtml !== 'function') {
      throw new Error('url-loader module not loaded');
    }
    
    return ctx.__parseHtml(html);
  }

  /**
   * 在 vm context 中注入追踪代码
   */
  _injectTracing(ctx) {
    const vm = require('vm');
    
    vm.runInContext(`
      (function() {
        if (this.__tracingInjected) return;
        this.__tracingInjected = true;
        
        const _traceLog = [];
        const _tracingEnabled = true;
        const _tracedSet = new WeakSet();
        
        this.__addTrace = function(type, path, value) {
          if (_tracingEnabled) {
            const entry = {
              type: type,
              path: path,
              timestamp: Date.now()
            };
            
            let logLine = '[TRACE] ' + type + ' ' + path;
            
            if (value !== undefined) {
              entry.valueType = typeof value;
              if (value === null) {
                entry.value = 'null';
                logLine += ' | null';
              } else if (typeof value === 'string') {
                entry.value = value.length > 100 ? value.substring(0, 100) + '...' : value;
                logLine += ' | "' + entry.value + '"';
              } else if (typeof value === 'number' || typeof value === 'boolean') {
                entry.value = value;
                logLine += ' | ' + value;
              } else if (typeof value === 'object') {
                entry.value = Object.prototype.toString.call(value);
                const proto = Object.getPrototypeOf(value);
                if (proto) {
                  entry.prototype = proto.constructor ? proto.constructor.name : 'Object';
                }
                logLine += ' | ' + entry.value;
                if (entry.prototype) {
                  logLine += ' (' + entry.prototype + ')';
                }
              } else if (typeof value === 'function') {
                entry.value = 'function';
                entry.prototype = value.prototype ? 'has prototype' : 'no prototype';
                logLine += ' | function';
              } else {
                entry.value = String(value);
                logLine += ' | ' + entry.value;
              }
            }
            
            _traceLog.push(entry);
            
            try {
              console.log(logLine);
            } catch (e) {}
          }
        };
        
        this.__getTraceLog = function() {
          return _traceLog.slice();
        };
        
        this.__clearTraceLog = function() {
          _traceLog.length = 0;
        };
        
        function wrapForTrace(obj, path) {
          if (!obj || typeof obj !== 'object') return;
          if (_tracedSet.has(obj)) return;
          _tracedSet.add(obj);
          
          for (const key in obj) {
            if (key.startsWith('__')) continue;
            
            try {
              const desc = Object.getOwnPropertyDescriptor(obj, key);
              if (!desc || !desc.configurable) continue;
              
              if ('value' in desc) {
                const originalValue = desc.value;
                
                Object.defineProperty(obj, key, {
                  configurable: true,
                  enumerable: desc.enumerable,
                  get: function() {
                    try {
                      __addTrace('get', path + '.' + key, originalValue);
                    } catch (e) {}
                    return originalValue;
                  },
                  set: function(val) {
                    try {
                      __addTrace('set', path + '.' + key, val);
                    } catch (e) {}
                    originalValue = val;
                  }
                });
                
                if (typeof originalValue === 'object' && originalValue !== null) {
                  wrapForTrace(originalValue, path + '.' + key);
                }
              }
            } catch (e) {}
          }
        }
        
        const traceTargets = ['navigator', 'screen', 'performance', 'crypto', 'location', 'history'];
        
        for (const target of traceTargets) {
          if (this[target]) {
            wrapForTrace(this[target], target);
          }
        }
      })();
    `, ctx);
  }

  /**
   * 获取并清空环境访问日志（仅在 proxyObserver 启用时有效）
   */
  getEnvTrace() {
    let log = flushLog();
    
    if (this._proxyEnabled && this.sandbox && typeof this.sandbox.__getTraceLog === 'function') {
      const ctxLog = this.sandbox.__getTraceLog();
      if (ctxLog && Array.isArray(ctxLog)) {
        log = log.concat(ctxLog);
      }
    }
    
    return {
      log,
      summary: getSummary(log)
    };
  }

  /**
   * 停止 Proxy 观察
   */
  stopTracing() {
    stopObserving();
  }

  /**
   * 关闭环境（清理）
   */
  destroy() {
    if (this._proxyEnabled) {
      stopObserving();
    }
    // 异步销毁 TLS（不阻塞）
    if (isTLSInitialized()) {
      destroyTLSClient().catch(() => {});
    }
    this.sandbox = null;
  }
}

/**
 * 快速创建并初始化环境（一次性 API）
 * @param {object} config - 配置
 * @param {string} code - 可选代码
 * @returns {object} { context, result }
 */
function createEnv(config = {}, code) {
  const env = new BrowserEnv(config);
  const ctx = env.create();
  let result;
  if (code) {
    result = env.run(code);
  }
  const ret = { context: ctx, result, env };
  ret.run = env.run.bind(env);
  ret.destroy = env.destroy.bind(env);
  ret.getEnvTrace = env.getEnvTrace.bind(env);
  ret.stopTracing = env.stopTracing.bind(env);
  ret.loadUrl = env.loadUrl.bind(env);
  ret.parseHtml = env.parseHtml.bind(env);
  ret.initTLS = env.initTLS.bind(env);
  ret.destroyTLS = env.destroyTLS.bind(env);
  return new Proxy(ret, {
    get: function(target, prop) {
      if (prop in target) return target[prop];
      return ctx[prop];
    },
    has: function(target, prop) {
      return prop in target || prop in ctx;
    }
  });
}

module.exports = {
  BrowserEnv,
  createEnv,
  createSandbox,
  loadDefaultModules
};
