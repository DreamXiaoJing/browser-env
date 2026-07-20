'use strict';

const { makeNative, defineProp, defineGetter } = require('../lib/guard');

/**
 * navigator 模块
 *
 * 浏览器识别和功能集的核心对象。
 * 包含：userAgent, platform, language, plugins, mimeTypes,
 *       hardwareConcurrency, deviceMemory, webdriver, connection,
 *       userAgentData 等完整字段。
 */

function install(sandbox, config = {}) {
  const cfg = config.navigator || {};

  // ── 根据 UA 推断设备类型 ──
  const ua = cfg.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const isMobile = /iPhone|iPad|iPod|Android|Mobile/.test(ua);
  const isiPhone = /iPhone/.test(ua);
  const isiPad = /iPad/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isWeChat = /MicroMessenger/.test(ua);

  // ── Navigator 构造函数 ──
  function Navigator() { /* 浏览器原生构造函数，不可 new */ }
  makeNative(Navigator, 'Navigator');

  // ── 基础属性 ──
  const navigator = {
    userAgent: ua,
    appCodeName: 'Mozilla',
    appName: 'Netscape',
    appVersion: cfg.appVersion || (isiPhone ? '5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' :
                                     isiPad ? '5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' :
                                     isAndroid ? '5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36' :
                                     '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'),
    platform: cfg.platform || (isiPhone ? 'iPhone' : isiPad ? 'iPad' : isAndroid ? 'Linux armv8l' : 'Win32'),
    vendor: 'Google Inc.',
    product: 'Gecko',
    productSub: '20030107',
    vendorSub: '',
    language: cfg.language || 'zh-CN',
    languages: cfg.languages || ['zh-CN', 'zh', 'en'],
    onLine: cfg.onLine !== undefined ? cfg.onLine : true,
    cookieEnabled: true,
    pdfViewerEnabled: true,
    webdriver: false,
    hardwareConcurrency: cfg.hardwareConcurrency || (isMobile ? 4 : 8),
    deviceMemory: cfg.deviceMemory || (isMobile ? 4 : 8),
    maxTouchPoints: cfg.maxTouchPoints || (isMobile ? 5 : 0),
    doNotTrack: null,

    // Java
    javaEnabled: makeNative(function javaEnabled() { return false; }, 'javaEnabled')
  };

  // ── Plugins ──
  // Plugin 和 MimeType 是浏览器原生对象
  function MimeType() {}
  makeNative(MimeType, 'MimeType');
  MimeType.prototype = {
    constructor: MimeType,
    type: '',
    description: '',
    suffixes: '',
    enabledPlugin: null
  };
  Object.defineProperty(MimeType.prototype, 'constructor', {
    value: MimeType, writable: true, configurable: true, enumerable: false
  });

  function Plugin() {}
  makeNative(Plugin, 'Plugin');
  Plugin.prototype = {
    constructor: Plugin,
    name: '',
    description: '',
    filename: '',
    length: 0,
    item: makeNative(function item(index) { return this[index] || null; }, 'item'),
    namedItem: makeNative(function namedItem(name) { return this[name] || null; }, 'namedItem')
  };
  Object.defineProperty(Plugin.prototype, 'constructor', {
    value: Plugin, writable: true, configurable: true, enumerable: false
  });

  // 模拟 PluginArray
  function PluginArray() { this.length = 0; }
  makeNative(PluginArray, 'PluginArray');
  PluginArray.prototype = {
    constructor: PluginArray,
    item: makeNative(function item(i) { return this[i] || null; }, 'item'),
    namedItem: makeNative(function namedItem(n) { return this[n] || null; }, 'namedItem'),
    refresh: makeNative(function refresh() {}, 'refresh')
  };
  Object.defineProperty(PluginArray.prototype, 'constructor', {
    value: PluginArray, writable: true, configurable: true, enumerable: false
  });
  // 浏览器中 PluginArray 是可迭代的
  PluginArray.prototype[Symbol.iterator] = makeNative(function() {
    var self = this;
    var idx = 0;
    return {
      next: function() {
        if (idx >= self.length) return { done: true, value: undefined };
        return { done: false, value: self[idx++] };
      }
    };
  }, '[Symbol.iterator]');

  function MimeTypeArray() { this.length = 0; }
  makeNative(MimeTypeArray, 'MimeTypeArray');
  MimeTypeArray.prototype = {
    constructor: MimeTypeArray,
    item: makeNative(function item(i) { return this[i] || null; }, 'item'),
    namedItem: makeNative(function namedItem(n) { return this[n] || null; }, 'namedItem')
  };
  Object.defineProperty(MimeTypeArray.prototype, 'constructor', {
    value: MimeTypeArray, writable: true, configurable: true, enumerable: false
  });
  // 浏览器中 MimeTypeArray 是可迭代的
  MimeTypeArray.prototype[Symbol.iterator] = makeNative(function() {
    var self = this;
    var idx = 0;
    return {
      next: function() {
        if (idx >= self.length) return { done: true, value: undefined };
        return { done: false, value: self[idx++] };
      }
    };
  }, '[Symbol.iterator]');

  const plugins = new PluginArray();
  const mimeTypes = new MimeTypeArray();

  // Chrome 131/150 典型插件（实测：5 个 PDF 相关插件，共享 internal-pdf-viewer）
  // 注意：真实浏览器中所有 PDF 插件都使用相同的 filename 'internal-pdf-viewer'
  // 每个 Plugin 包含 2 个 MimeType: application/pdf 和 text/pdf
  const PDF_MIME_TYPES = [
    { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
    { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' }
  ];
  const defaultPluginNames = cfg.pluginNames || [
    'PDF Viewer',
    'Chrome PDF Viewer',
    'Chromium PDF Viewer',
    'Microsoft Edge PDF Viewer',
    'WebKit built-in PDF'
  ];
  const defaultPlugins = cfg.plugins || defaultPluginNames.map(name => ({
    name,
    description: 'Portable Document Format',
    filename: 'internal-pdf-viewer',
    mimeTypes: PDF_MIME_TYPES
  }));

  // 真实浏览器行为（实测 Chrome 150）：
  // - mimeTypes 数组去重（5 个 PDF 插件共享 2 个 mimeType: application/pdf, text/pdf）
  // - 每个 Plugin 都包含完整的 2 个 mimeTypes（length=2）
  // - 所有 mimeTypes 的 enabledPlugin 指向第一个 Plugin ("PDF Viewer")
  // - 所有 Plugin 的 filename 都是 'internal-pdf-viewer'
  let firstPlugin = null;
  // 跟踪已添加的 mimeType 类型，避免在 mimeTypes 数组中重复
  const addedMimeTypeTypes = new Set();
  // 所有插件共享同一组 MimeType 实例（enabledPlugin 都指向第一个插件）
  const sharedMimeTypes = [];

  for (const mtData of PDF_MIME_TYPES) {
    const mt = new MimeType();
    mt.type = mtData.type;
    mt.suffixes = mtData.suffixes;
    mt.description = mtData.description;
    // enabledPlugin 稍后设置（指向第一个 plugin）
    sharedMimeTypes.push(mt);
    addedMimeTypeTypes.add(mtData.type);
    // 加入 mimeTypes 数组（仅一次）
    mimeTypes[mtData.type] = mt;
    mimeTypes[mimeTypes.length++] = mt;
  }

  for (const pData of defaultPlugins) {
    const plugin = new Plugin();
    plugin.name = pData.name;
    plugin.description = pData.description;
    plugin.filename = pData.filename;
    // 每个 Plugin 都包含所有共享的 mimeTypes
    plugin.length = sharedMimeTypes.length;
    for (let i = 0; i < sharedMimeTypes.length; i++) {
      plugin[i] = sharedMimeTypes[i];
      plugin[sharedMimeTypes[i].type] = sharedMimeTypes[i];
    }
    if (!firstPlugin) {
      firstPlugin = plugin;
      // 设置所有 mimeTypes 的 enabledPlugin 指向第一个 plugin
      for (const mt of sharedMimeTypes) {
        mt.enabledPlugin = plugin;
      }
    }
    plugins[plugin.name] = plugin;
    plugins[plugins.length++] = plugin;
  }

  navigator.plugins = plugins;
  navigator.mimeTypes = mimeTypes;

  // ── userAgentData（可选，Chrome 89+）──
  // 真实浏览器中 userAgentData 只暴露 brands/mobile/platform + 方法
  // architecture/bitness/model/platformVersion/wow64/uaFullVersion/fullVersionList
  // 只能通过 getHighEntropyValues() 异步获取
  if (cfg.userAgentData !== false) {
    const uaHints = cfg.userAgentData || {
      brands: [
        { brand: 'Google Chrome', version: '131' },
        { brand: 'Chromium', version: '131' },
        { brand: 'Not_A Brand', version: '24' }
      ],
      mobile: isMobile,
      platform: isiPhone || isiPad ? 'iOS' : isAndroid ? 'Android' : 'Windows'
    };

    // 高熵值数据（仅通过 getHighEntropyValues 返回）
    const highEntropyData = {
      architecture: isMobile ? 'arm64' : 'x86_64',
      bitness: '64',
      model: isiPhone ? 'iPhone' : isiPad ? 'iPad' : '',
      platformVersion: isiPhone || isiPad ? '16.6.0' : isAndroid ? '13.0.0' : '15.0.0',
      wow64: !isMobile,
      uaFullVersion: '131.0.6778.109',
      fullVersionList: uaHints.brands
    };

    // UAData 对象 - 仅 brands/mobile/platform 为直接属性（匹配真实浏览器）
    const uaData = {
      brands: uaHints.brands,
      mobile: uaHints.mobile,
      platform: uaHints.platform,
      getHighEntropyValues: makeNative(function getHighEntropyValues(hints) {
        const result = {
          brands: uaHints.brands,
          mobile: uaHints.mobile,
          platform: uaHints.platform
        };
        if (hints && hints.includes) {
          if (hints.includes('architecture')) result.architecture = highEntropyData.architecture;
          if (hints.includes('bitness')) result.bitness = highEntropyData.bitness;
          if (hints.includes('model')) result.model = highEntropyData.model;
          if (hints.includes('platformVersion')) result.platformVersion = highEntropyData.platformVersion;
          if (hints.includes('wow64')) result.wow64 = highEntropyData.wow64;
          if (hints.includes('uaFullVersion')) result.uaFullVersion = highEntropyData.uaFullVersion;
          if (hints.includes('fullVersionList')) result.fullVersionList = highEntropyData.fullVersionList;
        }
        return Promise.resolve(result);
      }, 'getHighEntropyValues'),
      toJSON: makeNative(function toJSON() {
        return { brands: this.brands, mobile: this.mobile, platform: this.platform };
      }, 'toJSON')
    };

    navigator.userAgentData = uaData;
    Object.defineProperty(uaData, Symbol.toStringTag, {
      value: 'NavigatorUAData',
      writable: false,
      configurable: true,
      enumerable: false
    });
  }

  // ── Connection（navigator.connection）──
  // 真实浏览器中 NetworkInformation 只有：effectiveType, rtt, downlink, saveData, onchange
  // 不包含 type 和 downlinkMax（已废弃/从未在 Chrome 中实现）
  if (cfg.connection !== false) {
    const connCfg = cfg.connection || {};
    const connection = {
      effectiveType: connCfg.effectiveType || '4g',
      rtt: connCfg.rtt || 50,
      downlink: connCfg.downlink || 10,
      saveData: connCfg.saveData || false,
      onchange: null,
      addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
      removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener')
    };
    // 添加 EventTarget 原型链
    const connectionProto = { constructor: function NetworkInformation() {} };
    makeNative(connectionProto.constructor, 'NetworkInformation');
    Object.setPrototypeOf(connection, connectionProto);
    Object.defineProperty(connection, Symbol.toStringTag, {
      value: 'NetworkInformation',
      writable: false,
      configurable: true,
      enumerable: false
    });
    navigator.connection = connection;
  }

  // ── 其他子对象 ├─
  // mediaCapabilities（Chrome 66+）
  // 真实浏览器方法：decodingInfo, encodingInfo（不是 query）
  navigator.mediaCapabilities = {
    decodingInfo: makeNative(function decodingInfo(queryConfig) {
      return Promise.resolve({
        supported: true,
        smooth: true,
        powerEfficient: true,
        configuration: queryConfig || {}
      });
    }, 'decodingInfo'),
    encodingInfo: makeNative(function encodingInfo(queryConfig) {
      return Promise.resolve({
        supported: true,
        smooth: true,
        powerEfficient: true,
        configuration: queryConfig || {}
      });
    }, 'encodingInfo')
  };
  Object.defineProperty(navigator.mediaCapabilities, Symbol.toStringTag, {
    value: 'MediaCapabilities',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // canShare / share（Chrome 89+，部分平台支持）
  navigator.canShare = makeNative(function canShare(data) {
    return false;
  }, 'canShare');
  navigator.share = makeNative(function share(data) {
    return Promise.reject(new DOMException('Share canceled'));
  }, 'share');

  // storage
  navigator.storage = {
    estimate: makeNative(function estimate() {
      return Promise.resolve({ quota: 1073741824, usage: 0 });
    }, 'estimate'),
    persist: makeNative(function persist() {
      return Promise.resolve(false);
    }, 'persist'),
    persisted: makeNative(function persisted() {
      return Promise.resolve(false);
    }, 'persisted'),
    webkitTemporaryStorage: {
      queryUsageAndQuota: makeNative(function queryUsageAndQuota(callback) {
        callback(null, 0, 1073741824);
      }, 'queryUsageAndQuota')
    },
    webkitPersistentStorage: {
      queryUsageAndQuota: makeNative(function queryUsageAndQuota(callback) {
        callback(null, 0, 1073741824);
      }, 'queryUsageAndQuota'),
      requestQuota: makeNative(function requestQuota(size, callback) {
        callback(null, 1073741824);
      }, 'requestQuota')
    }
  };

  navigator.webkitTemporaryStorage = {
    queryUsageAndQuota: makeNative(function queryUsageAndQuota(callback) {
      callback(null, 0, 1073741824);
    }, 'queryUsageAndQuota')
  };

  navigator.webkitPersistentStorage = {
    queryUsageAndQuota: makeNative(function queryUsageAndQuota(callback) {
      callback(null, 0, 1073741824);
    }, 'queryUsageAndQuota'),
    requestQuota: makeNative(function requestQuota(size, callback) {
      callback(null, 1073741824);
    }, 'requestQuota')
  };

  // serviceWorker
  navigator.serviceWorker = {
    controller: null,
    ready: Promise.resolve({ active: null }),
    register: makeNative(function register() {
      return Promise.reject(new Error('Failed to register a ServiceWorker for scope'));
    }, 'register'),
    getRegistration: makeNative(function getRegistration() {
      return Promise.resolve(undefined);
    }, 'getRegistration'),
    getRegistrations: makeNative(function getRegistrations() {
      return Promise.resolve([]);
    }, 'getRegistrations'),
    startMessages: makeNative(function startMessages() {}, 'startMessages')
  };

  // credentials
  navigator.credentials = {
    get: makeNative(function get(opts) {
      return Promise.resolve(null);
    }, 'get'),
    store: makeNative(function store(cred) {
      return Promise.resolve(cred);
    }, 'store'),
    create: makeNative(function create(opts) {
      return Promise.resolve(null);
    }, 'create'),
    preventSilentAccess: makeNative(function preventSilentAccess() {
      return Promise.resolve();
    }, 'preventSilentAccess')
  };

  // permissions
  navigator.permissions = {
    query: makeNative(function query(desc) {
      return Promise.resolve({ state: 'granted', onchange: null });
    }, 'query')
  };

  // mediaDevices（stub）
  navigator.mediaDevices = {
    enumerateDevices: makeNative(function enumerateDevices() {
      return Promise.resolve([]);
    }, 'enumerateDevices'),
    getUserMedia: makeNative(function getUserMedia(constraints) {
      return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
    }, 'getUserMedia'),
    getSupportedConstraints: makeNative(function getSupportedConstraints() {
      return {};
    }, 'getSupportedConstraints'),
    ondevicechange: null
  };

  // geolocation
  navigator.geolocation = {
    getCurrentPosition: makeNative(function getCurrentPosition(success, error, opts) {
      if (error) setTimeout(() => error({ code: 1, message: 'User denied Geolocation' }), 0);
    }, 'getCurrentPosition'),
    watchPosition: makeNative(function watchPosition(success, error, opts) {
      if (error) setTimeout(() => error({ code: 1, message: 'User denied Geolocation' }), 0);
      return 0;
    }, 'watchPosition'),
    clearWatch: makeNative(function clearWatch(id) {}, 'clearWatch')
  };

  // navigator.getUserMedia (deprecated legacy API, but still exists in Chrome)
  navigator.getUserMedia = makeNative(function getUserMedia(constraints, success, error) {
    if (error) setTimeout(() => error({ code: 1, message: 'Permission denied' }), 0);
  }, 'getUserMedia');
  navigator.webkitGetUserMedia = navigator.getUserMedia;

  // battery
  navigator.getBattery = makeNative(function getBattery() {
    return Promise.resolve({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
      onchargingchange: null,
      onchargingtimechange: null,
      ondischargingtimechange: null,
      onlevelchange: null
    });
  }, 'getBattery');

  // clipboard
  navigator.clipboard = {
    read: makeNative(function read() { return Promise.reject(new Error('Not allowed')); }, 'read'),
    readText: makeNative(function readText() { return Promise.reject(new Error('Not allowed')); }, 'readText'),
    write: makeNative(function write(data) { return Promise.resolve(); }, 'write'),
    writeText: makeNative(function writeText(text) { return Promise.resolve(); }, 'writeText')
  };

  // mediaSession (MediaSession API)
  navigator.mediaSession = {
    metadata: null,
    playbackState: 'none',
    setActionHandler: makeNative(function setActionHandler(action, handler) {}, 'setActionHandler'),
    setCameraActive: makeNative(function setCameraActive(active) {}, 'setCameraActive'),
    setMicrophoneActive: makeNative(function setMicrophoneActive(active) {}, 'setMicrophoneActive'),
    setPositionState: makeNative(function setPositionState(state) {}, 'setPositionState')
  };

  // sendBeacon
  navigator.sendBeacon = makeNative(function sendBeacon(url, data) {
    return true;
  }, 'sendBeacon');

  // registerProtocolHandler / unregisterProtocolHandler
  navigator.registerProtocolHandler = makeNative(function registerProtocolHandler(scheme, url, title) {
    throw new DOMException('', 'SecurityError');
  }, 'registerProtocolHandler');
  navigator.unregisterProtocolHandler = makeNative(function unregisterProtocolHandler(scheme, url) {
    throw new DOMException('', 'SecurityError');
  }, 'unregisterProtocolHandler');

  // WebXR (xr)
  navigator.xr = {
    isSessionSupported: makeNative(function(mode) {
      return Promise.resolve(false);
    }, 'isSessionSupported'),
    requestSession: makeNative(function(mode, options) {
      return Promise.reject(new DOMException('Access to the feature "xr" is not allowed.', 'SecurityError'));
    }, 'requestSession'),
    getAvailability: makeNative(function() {
      return Promise.resolve(false);
    }, 'getAvailability'),
    supportsSession: makeNative(function(mode) {
      return false;
    }, 'supportsSession')
  };

  // WebHID
  navigator.hid = {
    requestDevice: makeNative(function(options) {
      return Promise.reject(new DOMException('Access to the feature "hid" is not allowed.', 'SecurityError'));
    }, 'requestDevice'),
    getDevices: makeNative(function() {
      return Promise.resolve([]);
    }, 'getDevices'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener')
  };

  // Web Bluetooth
  navigator.bluetooth = {
    requestDevice: makeNative(function(options) {
      return Promise.reject(new DOMException('Access to the feature "bluetooth" is not allowed.', 'SecurityError'));
    }, 'requestDevice'),
    getAvailability: makeNative(function() {
      return Promise.resolve(false);
    }, 'getAvailability'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener')
  };

  // Web USB
  navigator.usb = {
    requestDevice: makeNative(function(options) {
      return Promise.reject(new DOMException('Access to the feature "usb" is not allowed.', 'SecurityError'));
    }, 'requestDevice'),
    getDevices: makeNative(function() {
      return Promise.resolve([]);
    }, 'getDevices'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener')
  };

  // Web Serial
  navigator.serial = {
    requestPort: makeNative(function(options) {
      return Promise.reject(new DOMException('Access to the feature "serial" is not allowed.', 'SecurityError'));
    }, 'requestPort'),
    getPorts: makeNative(function() {
      return Promise.resolve([]);
    }, 'getPorts'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener')
  };

  // Web Share
  navigator.share = makeNative(function(data) {
    return Promise.reject(new DOMException('Access to the feature "share" is not allowed.', 'SecurityError'));
  }, 'share');

  // Web Wake Lock
  navigator.wakeLock = {
    request: makeNative(function(type) {
      return Promise.reject(new DOMException('Access to the feature "wakeLock" is not allowed.', 'SecurityError'));
    }, 'request')
  };

  // Web Locks
  navigator.locks = {
    request: makeNative(function(name, callback) {
      return Promise.resolve(callback({ release: function() {} }));
    }, 'request'),
    query: makeNative(function() {
      return Promise.resolve([]);
    }, 'query')
  };

  // Web Gamepad
  navigator.getGamepads = makeNative(function() {
    return [];
  }, 'getGamepads');

  // Web Credentials Management
  navigator.credentials = navigator.credentials || {};

  // Web Payment Request
  navigator.canMakePayment = makeNative(function() {
    return Promise.resolve(false);
  }, 'canMakePayment');

  // Virtual Keyboard
  navigator.virtualKeyboard = {
    show: makeNative(function() {}, 'show'),
    hide: makeNative(function() {}, 'hide'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener'),
    overlaysContent: false
  };

  // Content Index - 在 Chrome 150 中未在 navigator 上暴露（已移除/从未实现）
  // 如果需要可手动开启：navigator.contentIndex = { ... }

  // Scheduler API (navigator.scheduling)
  navigator.scheduling = {
    isInputPending: makeNative(function(options) {
      return false;
    }, 'isInputPending')
  };

  // WebGPU (navigator.gpu)
  function GPU() {}
  makeNative(GPU, 'GPU');
  navigator.gpu = {
    requestAdapter: makeNative(function(options) {
      return Promise.resolve(null);
    }, 'requestAdapter'),
    wgslLanguageFeatures: {
      size: 0,
      has: makeNative(function(feature) { return false; }, 'has'),
      keys: makeNative(function() { return []; }, 'keys'),
      values: makeNative(function() { return []; }, 'values'),
      entries: makeNative(function() { return []; }, 'entries'),
      forEach: makeNative(function(cb) {}, 'forEach')
    }
  };
  Object.defineProperty(navigator.gpu, Symbol.toStringTag, {
    value: 'GPU', writable: false, configurable: true, enumerable: false
  });

  // Ink API (navigator.ink)
  navigator.ink = {
    requestPresenter: makeNative(function(presentationType) {
      return Promise.resolve({
        updateInkTrailStartPoint: makeNative(function(param) {}, 'updateInkTrailStartPoint'),
        expectedImprovement: 0
      });
    }, 'requestPresenter')
  };

  // Presentation API
  navigator.presentation = {
    defaultRequest: null,
    receiver: null
  };
  Object.defineProperty(navigator.presentation, Symbol.toStringTag, {
    value: 'Presentation',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // Remote Playback API - 在真实 Chrome 中不在 navigator 上（在 HTMLMediaElement 上）
  // 已移除以匹配真实浏览器

  // Managed Configuration API
  // 真实浏览器：getManagedConfiguration (不是 getManagedConfig), onmanagedconfigurationchange
  navigator.managed = {
    getManagedConfiguration: makeNative(function() {
      return Promise.resolve({});
    }, 'getManagedConfiguration'),
    onmanagedconfigurationchange: null
  };
  Object.defineProperty(navigator.managed, Symbol.toStringTag, {
    value: 'NavigatorManagedData',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // Window Controls Overlay (真实 Chrome 中为对象，非 undefined)
  // 注意：navigator.windowControlsDOM 不存在；windowControlsOverlay 才是真实属性
  navigator.windowControlsOverlay = {
    visible: false,
    ongeometrychange: null,
    getTitlebarAreaRect: makeNative(function getTitlebarAreaRect() {
      return { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 };
    }, 'getTitlebarAreaRect'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
  };
  Object.defineProperty(navigator.windowControlsOverlay, Symbol.toStringTag, {
    value: 'WindowControlsOverlay',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // ── 新增 API（匹配 Chrome 150）──

  // UserActivation API (navigator.userActivation)
  navigator.userActivation = {
    hasBeenActive: true,
    isActive: true
  };
  Object.defineProperty(navigator.userActivation, Symbol.toStringTag, {
    value: 'UserActivation',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // Device Posture API (navigator.devicePosture)
  navigator.devicePosture = {
    type: 'continuous', // 'continuous' | 'folded'
    onchange: null,
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
  };
  Object.defineProperty(navigator.devicePosture, Symbol.toStringTag, {
    value: 'DevicePosture',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // Keyboard API (navigator.keyboard) - Chrome 68+
  navigator.keyboard = {
    getLayoutMap: makeNative(function getLayoutMap() {
      return Promise.resolve(new Map());
    }, 'getLayoutMap'),
    lock: makeNative(function lock(keyCodes) {
      return Promise.resolve();
    }, 'lock'),
    unlock: makeNative(function unlock() {}, 'unlock')
  };
  Object.defineProperty(navigator.keyboard, Symbol.toStringTag, {
    value: 'Keyboard',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // Vibration API (navigator.vibrate) - 真实 Chrome 中存在
  navigator.vibrate = makeNative(function vibrate(pattern) {
    return false; // 在桌面/无振动设备上返回 false
  }, 'vibrate');

  // Badging API (navigator.setAppBadge / clearAppBadge) - Chrome 81+
  navigator.setAppBadge = makeNative(function setAppBadge(contents) {
    return Promise.resolve();
  }, 'setAppBadge');
  navigator.clearAppBadge = makeNative(function clearAppBadge() {
    return Promise.resolve();
  }, 'clearAppBadge');

  // Web MIDI API (navigator.requestMIDIAccess)
  navigator.requestMIDIAccess = makeNative(function requestMIDIAccess(options) {
    return Promise.reject(new DOMException('Access to the feature "midi" is not allowed.', 'SecurityError'));
  }, 'requestMIDIAccess');

  // Encrypted Media Extensions (navigator.requestMediaKeySystemAccess)
  navigator.requestMediaKeySystemAccess = makeNative(function requestMediaKeySystemAccess(keySystem, supportedConfigurations) {
    return Promise.reject(new DOMException('EME not available', 'NotSupportedError'));
  }, 'requestMediaKeySystemAccess');

  // Related Apps API (navigator.getInstalledRelatedApps)
  navigator.getInstalledRelatedApps = makeNative(function getInstalledRelatedApps() {
    return Promise.resolve([]);
  }, 'getInstalledRelatedApps');

  // Storage Buckets API (navigator.storageBuckets) - Chrome 122+
  navigator.storageBuckets = {
    open: makeNative(function open(name, options) {
      return Promise.resolve({});
    }, 'open'),
    delete: makeNative(function _delete(name) {
      return Promise.resolve(true);
    }, 'delete'),
    keys: makeNative(function keys() {
      return Promise.resolve([]);
    }, 'keys')
  };
  Object.defineProperty(navigator.storageBuckets, Symbol.toStringTag, {
    value: 'StorageBucketManager',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // Navigator Login API (navigator.login) - Chrome 122+
  navigator.login = {
    setStatus: makeNative(function setStatus(status) {
      return Promise.resolve();
    }, 'setStatus')
  };
  Object.defineProperty(navigator.login, Symbol.toStringTag, {
    value: 'NavigatorLogin',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // Deprecated storage APIs (WebKit) - fireyejs.js uses these
  // 注意：真实 Chrome 中 queryUsageAndQuota/requestQuota 仅在
  // navigator.webkitTemporaryStorage 和 navigator.webkitPersistentStorage 上
  // 不在 navigator 本身上

  // ── 安装到 sandbox ──
  sandbox.Navigator = Navigator;
  sandbox.navigator = navigator;
  sandbox.clientInformation = navigator; // 别名

  // 修正原型链
  Object.setPrototypeOf(navigator, Navigator.prototype);
  // 确保 Navigator.prototype.constructor 不可枚举（浏览器行为）
  Object.defineProperty(Navigator.prototype, 'constructor', {
    value: Navigator,
    writable: true,
    configurable: true,
    enumerable: false
  });

  // ── 关键：将 navigator 实例上的所有 own 属性迁移到 Navigator.prototype 上作为 getter
  // 真实浏览器中 navigator 实例没有任何 own 属性，所有属性都在 Navigator.prototype 上
  // 这是反指纹检测的关键点：Object.getOwnPropertyNames(navigator) === []
  (function migrateToPrototype() {
    const ownProps = Object.getOwnPropertyNames(navigator);
    const ownSymbols = Object.getOwnPropertySymbols(navigator);

    // 跳过这些属性（不应迁移到原型）
    const skipKeys = new Set(['constructor']);

    for (const key of ownProps) {
      if (skipKeys.has(key)) continue;
      const desc = Object.getOwnPropertyDescriptor(navigator, key);
      if (!desc) continue;

      const protoDesc = {
        enumerable: desc.enumerable !== false,
        configurable: true // 浏览器中通常为 configurable: true
      };

      if (desc.get || desc.set) {
        // 已经是访问器属性
        if (desc.get) protoDesc.get = desc.get;
        if (desc.set) protoDesc.set = desc.set;
      } else {
        // 数据属性 -> 转换为 getter（每次访问返回同一引用/值）
        // 使用闭包捕获当前值，set 修改闭包变量
        let storedValue = desc.value;
        protoDesc.get = function() { return storedValue; };
        if (desc.writable) {
          protoDesc.set = function(v) { storedValue = v; };
        }
      }

      try {
        Object.defineProperty(Navigator.prototype, key, protoDesc);
      } catch (e) { /* 属性可能已存在 */ }
      // 删除实例上的属性（让原型上的 getter 接管）
      try { delete navigator[key]; } catch (e) {}
    }

    for (const sym of ownSymbols) {
      if (skipKeys.has(sym.toString())) continue;
      const desc = Object.getOwnPropertyDescriptor(navigator, sym);
      if (!desc) continue;
      try {
        Object.defineProperty(Navigator.prototype, sym, desc);
      } catch (e) {}
      try { delete navigator[sym]; } catch (e) {}
    }
  })();

  Object.defineProperty(Navigator.prototype, Symbol.toStringTag, {
    value: 'Navigator',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(plugins, Symbol.toStringTag, {
    value: 'PluginArray',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(mimeTypes, Symbol.toStringTag, {
    value: 'MimeTypeArray',
    writable: false,
    configurable: true,
    enumerable: false
  });

  // 检查点
  if (cfg.__verify) {
    console.log('[verify] navigator.userAgent:', navigator.userAgent);
    console.log('[verify] navigator.platform:', navigator.platform);
    console.log('[verify] navigator.plugins.length:', navigator.plugins.length);
    console.log('[verify] navigator.mimeTypes.length:', navigator.mimeTypes.length);
    console.log('[verify] navigator own props count:', Object.getOwnPropertyNames(navigator).length);
    console.log('[verify] Navigator.prototype props count:', Object.getOwnPropertyNames(Navigator.prototype).length);
  }
}

module.exports = { install };
