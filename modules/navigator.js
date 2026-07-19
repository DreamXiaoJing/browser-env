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
    mimeTypesLength: 0,
    pluginsLength: 0,

    // Java
    javaEnabled: makeNative(function javaEnabled() { return false; }, 'javaEnabled'),

    // 已废弃但必须存在
    taintEnabled: makeNative(function taintEnabled() { return false; }, 'taintEnabled'),
    preference: makeNative(function preference() {}, 'preference')
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

  // Chrome 131 典型插件
  const defaultPlugins = cfg.plugins || [
    {
      name: 'Chrome PDF Plugin',
      description: 'Portable Document Format',
      filename: 'internal-pdf-viewer',
      mimeTypes: [
        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
        { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' }
      ]
    },
    {
      name: 'Chrome PDF Viewer',
      description: '',
      filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
      mimeTypes: [
        { type: 'application/pdf', suffixes: 'pdf', description: '' }
      ]
    },
    {
      name: 'Native Client',
      description: '',
      filename: 'internal-nacl-plugin',
      mimeTypes: [
        { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
        { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' }
      ]
    }
  ];

  for (const pData of defaultPlugins) {
    const plugin = new Plugin();
    plugin.name = pData.name;
    plugin.description = pData.description;
    plugin.filename = pData.filename;
    const types = [];
    for (const mtData of pData.mimeTypes) {
      const mt = new MimeType();
      mt.type = mtData.type;
      mt.suffixes = mtData.suffixes;
      mt.description = mtData.description;
      mt.enabledPlugin = plugin;
      types.push(mt);
      mimeTypes[mtData.type] = mt;
      mimeTypes[mimeTypes.length++] = mt;
    }
    plugin.length = types.length;
    for (let i = 0; i < types.length; i++) {
      plugin[i] = types[i];
      plugin[types[i].type] = types[i];
    }
    plugins[plugin.name] = plugin;
    plugins[plugins.length++] = plugin;
  }

  navigator.plugins = plugins;
  navigator.mimeTypes = mimeTypes;
  navigator.pluginsLength = plugins.length;
  navigator.mimeTypesLength = mimeTypes.length;

  // ── userAgentData（可选，Chrome 89+）──
  if (cfg.userAgentData !== false) {
    const uaHints = cfg.userAgentData || {
      brands: [
        { brand: 'Google Chrome', version: '131' },
        { brand: 'Chromium', version: '131' },
        { brand: 'Not_A Brand', version: '24' }
      ],
      mobile: isMobile,
      platform: isiPhone || isiPad ? 'iOS' : isAndroid ? 'Android' : 'Windows',
      architecture: isMobile ? 'arm64' : 'x86_64',
      bitness: isMobile ? '64' : '64',
      model: isiPhone ? 'iPhone' : isiPad ? 'iPad' : '',
      platformVersion: isiPhone || isiPad ? '16.6.0' : isAndroid ? '13.0.0' : '15.0.0',
      wow64: !isMobile,
      fullVersion: '131.0.6778.109',
      uaFullVersion: '131.0.6778.109'
    };

    // UAData 对象
    const uaData = {
      brands: uaHints.brands,
      mobile: uaHints.mobile,
      platform: uaHints.platform,
      architecture: uaHints.architecture,
      bitness: uaHints.bitness,
      model: uaHints.model,
      platformVersion: uaHints.platformVersion,
      wow64: uaHints.wow64,
      fullVersionList: uaHints.brands,
      getHighEntropyValues: makeNative(function getHighEntropyValues(hints) {
        const result = {
          architecture: uaHints.architecture,
          bitness: uaHints.bitness,
          model: uaHints.model,
          platformVersion: uaHints.platformVersion,
          uaFullVersion: uaHints.uaFullVersion || uaHints.fullVersion,
          fullVersionList: uaHints.brands,
          wow64: uaHints.wow64,
          brands: uaHints.brands,
          mobile: uaHints.mobile,
          platform: uaHints.platform
        };
        if (hints.includes('locale')) {
          result.locale = 'zh-CN';
        }
        return Promise.resolve(result);
      }, 'getHighEntropyValues'),
      toJSON: makeNative(function toJSON() {
        return { brands: this.brands, mobile: this.mobile, platform: this.platform };
      }, 'toJSON')
    };

    navigator.userAgentData = uaData;
  }

  // ── Connection（navigator.connection）──
  if (cfg.connection !== false) {
    const connCfg = cfg.connection || {};
    const connection = {
      effectiveType: connCfg.effectiveType || '4g',
      rtt: connCfg.rtt || 50,
      downlink: connCfg.downlink || 10,
      downlinkMax: connCfg.downlinkMax || Infinity,
      saveData: connCfg.saveData || false,
      type: connCfg.type || 'wifi',
      onchange: null,
      addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
      removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener')
    };
    // 添加 EventTarget 原型链
    const connectionProto = { constructor: function NetworkInformation() {} };
    makeNative(connectionProto.constructor, 'NetworkInformation');
    Object.setPrototypeOf(connection, connectionProto);
    navigator.connection = connection;
  }

  // ── 其他子对象 ├─
  // mediaCapabilities（Chrome 66+）
  navigator.mediaCapabilities = {
    query: makeNative(function query(queryConfig) {
      return Promise.resolve({
        supported: true,
        smooth: true,
        powerEfficient: true,
        configuration: queryConfig || {}
      });
    }, 'query'),
    encodingInfo: makeNative(function encodingInfo(queryConfig) {
      return Promise.resolve({
        supported: true,
        smooth: true,
        powerEfficient: true,
        configuration: queryConfig || {}
      });
    }, 'encodingInfo')
  };

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

  // Content Index
  navigator.contentIndex = {
    add: makeNative(function(description) {
      return Promise.resolve();
    }, 'add'),
    delete: makeNative(function(id) {
      return Promise.resolve();
    }, 'delete'),
    getAll: makeNative(function() {
      return Promise.resolve([]);
    }, 'getAll')
  };

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

  // Remote Playback API
  navigator.remotePlayback = {
    state: 'disconnected',
    watchAvailability: makeNative(function(callback) {
      return Promise.resolve(false);
    }, 'watchAvailability'),
    cancelWatchAvailability: makeNative(function(id) {
      return Promise.resolve();
    }, 'cancelWatchAvailability'),
    prompt: makeNative(function() {
      return Promise.resolve();
    }, 'prompt')
  };

  // Managed Configuration API
  navigator.managed = {
    getManagedConfig: makeNative(function() {
      return Promise.resolve({});
    }, 'getManagedConfig')
  };

  // Window Controls Overlay
  navigator.windowControlsDOM = undefined;

  // Deprecated storage APIs (WebKit) - fireyejs.js uses these
  navigator.queryUsageAndQuota = makeNative(function(callback, errorCallback) {
    if (typeof callback === 'function') {
      callback(0, 0);
    }
  }, 'queryUsageAndQuota');
  navigator.requestQuota = makeNative(function(type, size, callback, errorCallback) {
    if (typeof callback === 'function') {
      callback(size);
    }
  }, 'requestQuota');

  // User Agent Client Hints API (high entropy values)
  if (navigator.userAgentData) {
    navigator.userAgentData.getHighEntropyValues = makeNative(function(hints) {
      return Promise.resolve({
        architecture: 'x86',
        bitness: '64',
        brands: navigator.userAgentData.brands || [],
        fullVersionList: navigator.userAgentData.brands || [],
        mobile: false,
        model: '',
        platform: 'Windows',
        platformVersion: '15.0.0',
        uaFullVersion: '131.0.0.0',
        wow64: false
      });
    }, 'getHighEntropyValues');
  }

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

  Object.defineProperty(navigator, Symbol.toStringTag, {
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
  }
}

module.exports = { install };
