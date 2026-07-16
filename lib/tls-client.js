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

  // User-Agent
  if (browserInfo.userAgent) {
    headers['User-Agent'] = browserInfo.userAgent;
  }

  // Accept
  headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';

  // Accept-Language
  const langs = browserInfo.languages || ['zh-CN', 'zh', 'en'];
  if (langs.length > 0) {
    const qualityLangs = langs.map((lang, i) => i === 0 ? lang : `${lang};q=${(1 - i * 0.1).toFixed(1)}`);
    headers['Accept-Language'] = qualityLangs.join(',');
  }

  // Accept-Encoding
  headers['Accept-Encoding'] = 'gzip, deflate, br, zstd';

  // Cache-Control
  headers['Cache-Control'] = 'max-age=0';

  // Connection
  headers['Connection'] = 'keep-alive';

  // Upgrade-Insecure-Requests
  headers['Upgrade-Insecure-Requests'] = '1';

  // Sec-Fetch-* (Chrome 特有)
  headers['Sec-Fetch-Dest'] = 'document';
  headers['Sec-Fetch-Mode'] = 'navigate';
  headers['Sec-Fetch-Site'] = 'none';
  headers['Sec-Fetch-User'] = '?1';

  // Sec-Ch-Ua (客户端提示，基于 userAgentData)
  if (browserInfo.userAgentData && browserInfo.userAgentData.brands) {
    const brands = browserInfo.userAgentData.brands;
    headers['Sec-Ch-Ua'] = brands.map(b => `"${b.brand}";v="${b.version}"`).join(', ');
    headers['Sec-Ch-Ua-Mobile'] = browserInfo.userAgentData.mobile ? '?1' : '?0';

    const platform = browserInfo.userAgentData.platform;
    if (platform) {
      headers['Sec-Ch-Ua-Platform'] = `"${platform}"`;
    }
  }

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

  const clientIdentifier = config.clientIdentifier || ClientIdentifier.chrome_131;

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

  _session = new Session({
    clientIdentifier,
    timeout: config.timeout || 30000,
    insecureSkipVerify: config.insecureSkipVerify !== false,
    randomTlsExtensionOrder: config.randomTlsExtensionOrder !== false,
    proxy: config.proxy || undefined,
  });

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
    headers['User-Agent'] = _userAgent;
    lowerKeys.add('user-agent');
  }
  for (const [k, v] of Object.entries(_defaultHeaders)) {
    if (!lowerKeys.has(k.toLowerCase())) {
      headers[k] = v;
      lowerKeys.add(k.toLowerCase());
    }
  }

  // 2. 用户自定义头覆盖默认头
  const userHeaders = options.headers || {};
  for (const [k, v] of Object.entries(userHeaders)) {
    headers[k] = v;
  }

  const reqOptions = {
    headers: headers,
    followRedirects: options.followRedirects !== false,
  };

  if (options.body) {
    reqOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await _session[httpMethod](url, reqOptions);
  const body = await response.text();

  return {
    status: response.status,
    statusText: response.ok ? 'OK' : '',
    headers: response.headers || {},
    body: body,
    url: response.url || url,
  };
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
