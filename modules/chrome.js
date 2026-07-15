'use strict';

const { makeNative } = require('../lib/guard');

/**
 * chrome 模块
 *
 * 模拟 window.chrome 对象。
 * 浏览器自动化检测脚本几乎都会检查 chrome 对象的存在及其子属性。
 *
 * 包含:
 * - chrome.runtime (id, connect, sendMessage, getManifest)
 * - chrome.loadTimes()
 * - chrome.csi()
 * - chrome.app (isInstalled, InstallState, RunningState)
 * - chrome.webstore (deprecated)
 */

function install(sandbox, config = {}) {
  const cfg = config.chrome || {};

  // ── chrome.runtime ──
  const runtime = {
    id: cfg.runtimeId || 'aohghmighlieiainnegkcijnfilokake',

    // 连接
    connect: makeNative(function connect(extensionId, connectInfo) {
      return {
        name: (connectInfo && connectInfo.name) || '',
        sender: null,
        postMessage: makeNative(function(msg) {}, 'postMessage'),
        onMessage: { addListener: makeNative(function(cb) {}, 'addListener') },
        onDisconnect: { addListener: makeNative(function(cb) {}, 'addListener') },
        disconnect: makeNative(function() {}, 'disconnect')
      };
    }, 'connect'),

    sendMessage: makeNative(function sendMessage(extensionId, message, options, callback) {
      // 简化：返回 Promise
      if (typeof callback === 'function') {
        global.setTimeout(function() { callback(); }, 0);
      }
      return Promise.resolve();
    }, 'sendMessage'),

    // Manifest
    getManifest: makeNative(function getManifest() {
      return {
        name: cfg.manifestName || 'Chrome',
        version: cfg.manifestVersion || '131.0.6778.109',
        manifest_version: 2,
        description: '',
        permissions: []
      };
    }, 'getManifest'),

    // 事件
    onConnect: { addListener: makeNative(function(cb) {}, 'addListener') },
    onMessage: { addListener: makeNative(function(cb) {}, 'addListener') },
    onInstalled: { addListener: makeNative(function(cb) {}, 'addListener') },
    onStartup: { addListener: makeNative(function(cb) {}, 'addListener') },
    onSuspend: { addListener: makeNative(function(cb) {}, 'addListener') },

    // 方法
    getURL: makeNative(function getURL(path) {
      return 'chrome-extension://' + runtime.id + '/' + path;
    }, 'getURL'),

    getBackgroundPage: makeNative(function getBackgroundPage(callback) {
      if (callback) global.setTimeout(function() { callback(null); }, 0);
      return null;
    }, 'getBackgroundPage'),

    openOptionsPage: makeNative(function openOptionsPage(callback) {
      if (callback) global.setTimeout(callback, 0);
    }, 'openOptionsPage'),

    reload: makeNative(function reload() {}, 'reload'),

    requestUpdateCheck: makeNative(function requestUpdateCheck(callback) {
      if (callback) global.setTimeout(function() {
        callback({ status: 'no_update', version: '' });
      }, 0);
    }, 'requestUpdateCheck'),

    // 属性
    lastError: null,
    lastErrorPrettyPrint: null
  };

  // ── chrome.loadTimes（已废弃但被检测）──
  const loadTimes = makeNative(function loadTimes() {
    const t = sandbox.performance ? sandbox.performance.timing : null;
    const now = Date.now();
    const startTime = t ? t.navigationStart : now;
    return {
      requestTime: startTime / 1000,
      startLoadTime: startTime,
      commitLoadTime: t ? t.responseEnd || now : now,
      finishDocumentLoadTime: t ? t.domContentLoadedEventEnd || now : now,
      finishLoadTime: t ? t.loadEventEnd || now : now,
      firstPaintTime: t ? t.responseEnd || now : now,
      firstPaintAfterLoadTime: t ? t.loadEventEnd || now : now,
      navigationType: cfg.navigationType || 'Other',
      wasFetchedViaSpdy: false,
      wasNpnNegotiated: false,
      npnNegotiatedProtocol: 'http/1.1',
      wasAlternateProtocolAvailable: false,
      connectionInfo: 'http/1.1'
    };
  }, 'loadTimes');

  // ── chrome.csi ──
  const csi = makeNative(function csi() {
    const t = sandbox.performance ? sandbox.performance.timing : null;
    const now = Date.now();
    const start = t ? t.navigationStart : now;
    const onLoad = t ? t.loadEventEnd || now : now;
    return {
      startE: start,
      onloadT: onLoad,
      pageT: now - start,
      tran: 15
    };
  }, 'csi');

  // ── chrome.app ──
  const app = {
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
    },
    getDetails: makeNative(function getDetails() {
      return {
        id: runtime.id,
        name: 'Chrome',
        version: cfg.manifestVersion || '131.0.6778.109',
        icon_128: ''
      };
    }, 'getDetails'),
    getIsInstalled: makeNative(function getIsInstalled() {
      return false;
    }, 'getIsInstalled'),
    installState: makeNative(function installState() {
      return app.InstallState.NOT_INSTALLED;
    }, 'installState'),
    runningState: makeNative(function runningState() {
      return app.RunningState.CANNOT_RUN;
    }, 'runningState')
  };

  // ── chrome.webstore（已废弃但被检测）──
  const webstore = {
    install: makeNative(function install(url, success, failure) {
      if (failure) global.setTimeout(function() {
        failure('Chrome Web Store is no longer supported.');
      }, 0);
    }, 'install'),
    onInstallStageChanged: { addListener: makeNative(function(cb) {}, 'addListener') },
    onDownloadProgress: { addListener: makeNative(function(cb) {}, 'addListener') }
  };

  // ── chrome.devtools（已废弃但被检测）──
  const devtools = {
    inspectedWindow: {
      tabId: 0,
      eval: makeNative(function(expression, callback) {
        if (callback) callback(undefined, undefined);
      }, 'eval'),
      reload: makeNative(function(reloadOptions) {}, 'reload')
    },
    network: {
      onNavigated: { addListener: makeNative(function(cb) {}, 'addListener') },
      onRequestFinished: { addListener: makeNative(function(cb) {}, 'addListener') }
    },
    panels: {
      create: makeNative(function(title, iconPath, pagePath, callback) {
        if (callback) callback();
      }, 'create')
    }
  };

  // ── chrome.storage（可选）──
  const storage = {
    sync: {
      get: makeNative(function(keys, callback) {
        if (callback) global.setTimeout(function() { callback({}); }, 0);
      }, 'get'),
      set: makeNative(function(items, callback) {
        if (callback) global.setTimeout(callback, 0);
      }, 'set'),
      remove: makeNative(function(keys, callback) {
        if (callback) global.setTimeout(callback, 0);
      }, 'remove'),
      clear: makeNative(function(callback) {
        if (callback) global.setTimeout(callback, 0);
      }, 'clear')
    },
    local: {
      get: makeNative(function(keys, callback) {
        if (callback) global.setTimeout(function() { callback({}); }, 0);
      }, 'get'),
      set: makeNative(function(items, callback) {
        if (callback) global.setTimeout(callback, 0);
      }, 'set'),
      remove: makeNative(function(keys, callback) {
        if (callback) global.setTimeout(callback, 0);
      }, 'remove'),
      clear: makeNative(function(callback) {
        if (callback) global.setTimeout(callback, 0);
      }, 'clear')
    },
    managed: {
      get: makeNative(function(keys, callback) {
        if (callback) global.setTimeout(function() { callback({}); }, 0);
      }, 'get')
    },
    onChanged: { addListener: makeNative(function(cb) {}, 'addListener') }
  };

  // ── 组装 chrome 对象 ──
  const chrome = {
    runtime: runtime,
    loadTimes: loadTimes,
    csi: csi,
    app: app,
    webstore: webstore,
    devtools: devtools,
    storage: storage,

    // 其他常见属性
    bookmarks: undefined,
    browserAction: undefined,
    commands: undefined,
    contextMenus: undefined,
    cookies: undefined,
    downloads: undefined,
    extension: undefined,
    fontSettings: undefined,
    gcm: undefined,
    history: undefined,
    i18n: undefined,
    idle: undefined,
    input: undefined,
    management: undefined,
    notifications: undefined,
    omnibox: undefined,
    pageAction: undefined,
    pageCapture: undefined,
    power: undefined,
    printerProvider: undefined,
    privacy: undefined,
    proxy: undefined,
    sessions: undefined,
    sidebarAction: undefined,
    tabs: undefined,
    theme: undefined,
    topSites: undefined,
    tts: undefined,
    ttsEngine: undefined,
    types: undefined,
    wallpaper: undefined,
    webNavigation: undefined,
    windows: undefined,

    // Chrome 131 新增或保留
    action: undefined,
    sidePanel: undefined,
    offscreen: undefined,
    search: undefined,

    // 平台相关
    platform: {
      os: cfg.platformOS || 'win',
      arch: cfg.platformArch || 'x86-64',
      nacl_arch: cfg.platformNaclArch || 'x86-64'
    },

    // chrome 版本
    getVersion: makeNative(function getVersion() {
      return cfg.manifestVersion || '131.0.6778.109';
    }, 'getVersion')
  };

  // ── chrome.runtime.getManifest 返回的 manifest 对象 ──
  // 让 runtime.getManifest 是正确的引用
  chrome.runtime.getManifest = makeNative(function getManifest() {
    return {
      name: cfg.manifestName || 'Chrome',
      version: cfg.manifestVersion || '131.0.6778.109',
      manifest_version: 2,
      description: '',
      permissions: []
    };
  }, 'getManifest');

  // ── 安装到 sandbox ──
  sandbox.chrome = chrome;
}

module.exports = { install };
