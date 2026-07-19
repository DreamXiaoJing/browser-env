'use strict';

/**
 * TLS 客户端管理器
 *
 * 使用 node-tls-client 模拟真实浏览器的 TLS 指纹（JA3/JA4）。
 * 底层基于 utls，可以完美模拟 Chrome/Firefox/Safari 的 TLS 握手。
 */

let _tlsClient = null;
let _initialized = false;
let _session = null;
let _userAgent = '';
let _defaultHeaders = {};
let _cookieJarEnabled = false;

/**
 * 根据浏览器信息生成默认请求头
 * @param {object} browserInfo - 浏览器信息
 * @param {string} browserInfo.userAgent - UA
 * @param {string} browserInfo.language - 主语言
 * @param {Array} browserInfo.languages - 语言列表
 * @param {object} browserInfo.userAgentData - UA 熵提示
 * @param {boolean} browserInfo.isMobile - 是否移动端
 * @returns {object} 默认请求头
 */
function buildDefaultHeaders(browserInfo = {}) {
  const headers = {};

  // User-Agent（HTTP/2 下所有头小写，匹配真实 Chrome 行为）
  if (browserInfo.userAgent) {
    headers['user-agent'] = browserInfo.userAgent;
  }

  // Accept-Language
  const langs = browserInfo.languages || ['zh-CN', 'zh', 'en'];
  if (langs.length > 0) {
    const qualityLangs = langs.map((lang, i) => i === 0 ? lang : `${lang};q=${(1 - i * 0.1).toFixed(1)}`);
    headers['accept-language'] = qualityLangs.join(',');
  }

  // Accept-Encoding
  headers['accept-encoding'] = 'gzip, deflate, br, zstd';

  // Sec-Ch-Ua (客户端提示，基于 userAgentData)
  if (browserInfo.userAgentData && browserInfo.userAgentData.brands) {
    const brands = browserInfo.userAgentData.brands;
    headers['sec-ch-ua'] = brands.map(b => `"${b.brand}";v="${b.version}"`).join(', ');
    headers['sec-ch-ua-mobile'] = browserInfo.userAgentData.mobile ? '?1' : '?0';

    const platform = browserInfo.userAgentData.platform;
    if (platform) {
      headers['sec-ch-ua-platform'] = `"${platform}"`;
    }
  }

  // 注意：以下头不应作为默认头，应根据请求类型显式设置：
  // - accept (导航: text/html,...; XHR: application/json,...)
  // - cache-control (导航: max-age=0; XHR: 不发送)
  // - connection (HTTP/2 禁止发送，HTTP/1.1 才需要)
  // - upgrade-insecure-requests (仅导航请求)
  // - sec-fetch-dest/mode/site/user (导航和 XHR 值不同)

  return headers;
}

/**
 * 初始化 TLS 客户端
 * @param {object} config - TLS 配置
 * @param {string} config.clientIdentifier - 客户端标识符，如 'chrome_131'
 * @param {number} config.timeout - 请求超时（毫秒）
 * @param {boolean} config.insecureSkipVerify - 跳过证书验证
 * @param {boolean} config.randomTlsExtensionOrder - 随机化 TLS 扩展顺序
 * @param {string} config.proxy - 代理服务器
 * @param {string} config.userAgent - 默认 User-Agent
 * @param {object} config.browserInfo - 浏览器信息（用于自动生成默认头）
 * @param {object} config.defaultHeaders - 默认请求头（覆盖自动生成的头）
 * @returns {Promise<void>}
 */
async function initTLSClient(config = {}) {
  if (_initialized) return;

  const { initTLS, Session, ClientIdentifier } = require('node-tls-client');
  const { downloadNativeLib, exists: nativeLibExists } = require('./tls-download');

  // 自动检查并下载 native 库（如果不存在）
  if (!nativeLibExists()) {
    console.log('[tls-client] native 库不存在，正在自动下载...');
    try {
      await downloadNativeLib();
    } catch (e) {
      throw new Error(`TLS native 库下载失败: ${e.message}。请手动运行: node -e "require('./lib/tls-download').downloadNativeLib().then(p=>console.log('下载到:',p))"`);
    }
  }

  await initTLS();

  _userAgent = config.userAgent || '';

  // 自动生成浏览器默认头
  const browserInfo = config.browserInfo || {};
  if (!_userAgent && browserInfo.userAgent) {
    _userAgent = browserInfo.userAgent;
  }
  _defaultHeaders = buildDefaultHeaders({
    userAgent: _userAgent,
    language: browserInfo.language,
    languages: browserInfo.languages,
    userAgentData: browserInfo.userAgentData,
    isMobile: browserInfo.isMobile
  });

  // 用户自定义头覆盖自动生成的头
  if (config.defaultHeaders) {
    for (const [k, v] of Object.entries(config.defaultHeaders)) {
      _defaultHeaders[k] = v;
    }
  }

  // 构建 Session 配置
  const sessionConfig = {
    timeout: config.timeout || 30000,
    insecureSkipVerify: config.insecureSkipVerify !== false,
    proxy: config.proxy || undefined,
    withoutCookieJar: true,
    // HTTP/2 头顺序（匹配真实 Chrome 131 POST XHR 请求）
    // 默认顺序：sec-ch-ua → sec-ch-ua-platform → sec-ch-ua-mobile → user-agent →
    // accept → origin → sec-fetch-* → referer → accept-encoding → accept-language →
    // content-type → 自定义头 → cookie
    headerOrder: config.headerOrder || [
      'sec-ch-ua',
      'sec-ch-ua-platform',
      'sec-ch-ua-mobile',
      'user-agent',
      'accept',
      'origin',
      'sec-fetch-site',
      'sec-fetch-mode',
      'sec-fetch-dest',
      'referer',
      'accept-encoding',
      'accept-language',
      'content-type',
      'x-referer-page',
      'x-rp-client',
      'x-api-eid-token',
      'cookie'
    ]
  };

  if (config.ja3string) {
    // 使用自定义 JA3 字符串精确匹配浏览器 TLS 指纹
    console.log('[tls-client] 使用自定义 JA3:', config.ja3string.substring(0, 80) + '...');
    sessionConfig.ja3string = config.ja3string;
    sessionConfig.h2Settings = config.h2Settings || {
      'HEADER_TABLE_SIZE': 65536,
      'ENABLE_PUSH': 0,
      'INITIAL_WINDOW_SIZE': 6291456,
      'MAX_HEADER_LIST_SIZE': 262144
    };
    sessionConfig.h2SettingsOrder = config.h2SettingsOrder || ['HEADER_TABLE_SIZE', 'ENABLE_PUSH', 'INITIAL_WINDOW_SIZE', 'MAX_HEADER_LIST_SIZE'];
    sessionConfig.pseudoHeaderOrder = config.pseudoHeaderOrder || [':method', ':authority', ':scheme', ':path'];
    sessionConfig.connectionFlow = config.connectionFlow || 15663105;
    sessionConfig.certCompressionAlgo = config.certCompressionAlgo || 'zlib';
    sessionConfig.supportedVersions = config.supportedVersions || ['GREASE', '0x0304', '0x0303'];
    sessionConfig.supportedSignatureAlgorithms = config.supportedSignatureAlgorithms || [
      '0x0403', '0x0804', '0x0401', '0x0503', '0x0805', '0x0501', '0x0806', '0x0601',
      '0x0201'
    ];
    sessionConfig.keyShareCurves = config.keyShareCurves || ['GREASE', '0x001d', '0x0017', '0x0018'];
    sessionConfig.alpnProtocols = config.alpnProtocols || ['h2', 'http/1.1'];
    sessionConfig.alpsProtocols = config.alpsProtocols || ['h2'];
    sessionConfig.randomTlsExtensionOrder = config.randomTlsExtensionOrder || false;
  } else {
    let clientIdentifier = config.clientIdentifier || ClientIdentifier.chrome_131;

    if (typeof clientIdentifier === 'string') {
      const strId = clientIdentifier.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (ClientIdentifier[strId]) {
        clientIdentifier = ClientIdentifier[strId];
        console.log('[tls-client] 转换 clientIdentifier:', strId, '->', clientIdentifier);
      } else {
        console.warn('[tls-client] 未知的 clientIdentifier:', clientIdentifier, '使用默认值');
        clientIdentifier = ClientIdentifier.chrome_131;
      }
    }

    sessionConfig.clientIdentifier = clientIdentifier;
    sessionConfig.randomTlsExtensionOrder = config.randomTlsExtensionOrder !== false;
  }

  _session = new Session(sessionConfig);

  // 记录 cookie 配置，用于自定义请求时处理
  _cookieJarEnabled = !config.withoutCookieJar;

  _tlsClient = { Session, ClientIdentifier };
  _initialized = true;
}

/**
 * 检查 TLS 客户端是否已初始化
 * @returns {boolean}
 */
function isInitialized() {
  return _initialized;
}

/**
 * 获取 TLS session
 * @returns {Session|null}
 */
function getSession() {
  return _session;
}

/**
 * 发送 TLS 请求
 * @param {string} method - HTTP 方法
 * @param {string} url - 请求 URL
 * @param {object} options - 请求选项
 * @param {object} options.headers - 请求头
 * @param {*} options.body - 请求体
 * @param {boolean} options.followRedirects - 是否跟随重定向
 * @returns {Promise<object>} 响应对象 { status, statusText, headers, body }
 */
async function tlsRequest(method, url, options = {}) {
  if (!_session) {
    throw new Error('TLS client not initialized. Call initTLSClient() first.');
  }

  const httpMethod = method.toLowerCase();
  const validMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

  if (!validMethods.includes(httpMethod)) {
    throw new Error(`Unsupported HTTP method: ${method}`);
  }

  // 合并默认头 + 用户自定义头（用户头优先）
  const headers = {};
  const lowerKeys = new Set();

  // 1. 注入默认浏览器头（如果用户未提供）
  if (_userAgent) {
    headers['user-agent'] = _userAgent;
    lowerKeys.add('user-agent');
  }
  for (const [k, v] of Object.entries(_defaultHeaders)) {
    if (!lowerKeys.has(k.toLowerCase())) {
      headers[k] = v;
      lowerKeys.add(k.toLowerCase());
    }
  }

  // 2. 用户自定义头覆盖默认头（大小写不敏感）
  const userHeaders = options.headers || {};
  for (const [k, v] of Object.entries(userHeaders)) {
    if (v === undefined || v === null) continue;
    const lowerK = k.toLowerCase();
    // 删除同名（大小写不同）的旧头
    for (const existingKey of Object.keys(headers)) {
      if (existingKey.toLowerCase() === lowerK) {
        delete headers[existingKey];
        break;
      }
    }
    // 空字符串表示删除该头（不发送）
    if (v === '') continue;
    headers[k] = String(v);
  }

  const reqOptions = {
    headers: headers,
    followRedirects: options.followRedirects !== false,
    proxy: options.proxy || undefined
  };

  if (options.body) {
    reqOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  if (process.env.DEBUG_TLS) {
    console.log('[tls-request]', method, url);
    console.log('[tls-request] headers:', JSON.stringify(headers, null, 2));
  }

  try {
    const response = await _session[httpMethod](url, reqOptions);
    const body = await response.text();

    return {
      status: response.status,
      statusText: response.ok ? 'OK' : '',
      headers: response.headers || {},
      cookies: response.cookies || [],
      body: body,
      url: response.url || url,
    };
  } catch (e) {
    throw new Error(`TLS request failed: ${e.message}`);
  }
}

/**
 * 销毁 TLS 客户端
 * @returns {Promise<void>}
 */
async function destroyTLSClient() {
  if (_session) {
    try {
      await _session.close();
    } catch (e) {
      // 忽略关闭错误
    }
    _session = null;
  }

  if (_initialized) {
    const { destroyTLS } = require('node-tls-client');
    try {
      await destroyTLS();
    } catch (e) {
      // 忽略销毁错误
    }
  }

  _tlsClient = null;
  _initialized = false;
  _userAgent = '';
  _defaultHeaders = {};
}

module.exports = {
  initTLSClient,
  isInitialized,
  getSession,
  tlsRequest,
  destroyTLSClient,
};
