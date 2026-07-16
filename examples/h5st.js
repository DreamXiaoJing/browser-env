'use strict';

/**
 * 京东 h5st 签名示例 — browser-env
 *
 * 在补环境沙箱中加载 ParamsSign，生成 h5st 并请求京东 API。
 * 使用 TLS 指纹 + 自动浏览器请求头，模拟真实 Chrome 浏览器。
 *
 * 用法: node examples/h5st.js
 *      npm test
 */

const crypto = require('crypto');
const path = require('path');
const { createEnv } = require('../');

(async function main() {
  // 1. 创建环境并加载 h5st 脚本
  const env = createEnv({
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  }, path.join(__dirname, 'h5st_5.3.js'));

  env.run('window.HTMLAllCollection = undefined;');

  // 2. 初始化 TLS（自动从 navigator 提取 UA 和浏览器头）
  console.log('正在初始化 TLS...');
  await env.initTLS({
    clientIdentifier: 'chrome_131',
    randomTlsExtensionOrder: true
  });
  console.log('TLS 已就绪\n');

  // 3. 生成 h5st 签名
  const params = {
    appid: "jd-cphdeveloper-m",
    functionId: "recommend_like_m",
    body: "{\"func\":\"item_rec\",\"recpos\":6163,\"param\":\"{\\\"pagenum\\\":1,\\\"pagecount\\\":20,\\\"startpos\\\":20,\\\"ptag\\\":\\\"\\\",\\\"sku\\\":\\\"\\\",\\\"cid1\\\":\\\"\\\",\\\"cid2\\\":\\\"\\\",\\\"cid3\\\":\\\"\\\"}\",\"clientPageId\":\"\",\"clientVersion\":\"2.0\"}",
    "x-api-eid-token": "",
    loginType: "2"
  };

  const bodyHash = crypto.createHash('sha256').update(params.body, 'utf8').digest('hex');
  console.log('bodyHash:', bodyHash);

  const h5st = env.run(`
    var _ParamsSign = new window.ParamsSign({appId: "2088b"});
    _ParamsSign._$sdnmd({
      "appid": "jd-cphdeveloper-m",
      "functionId": "recommend_like_m",
      "body": "${bodyHash}",
    }).h5st;
  `);

  console.log('h5st:', h5st);
  console.log('h5st 长度:', h5st.length);

  // 4. 使用 TLS 请求京东 API（异步模式 + 自动浏览器头）
  params.h5st = h5st;
  const url = 'https://api.m.jd.com/api?' + new URLSearchParams(params).toString();

  console.log('\n正在请求京东 API...');
  env.run(`
    new Promise((resolve) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', ${JSON.stringify(url)}, true);
      xhr.setRequestHeader('referer', 'https://m.jd.com/');
      xhr.setRequestHeader('origin', 'https://m.jd.com');
      xhr.onload = function() {
        console.log('Status:', xhr.status);
        console.log('Response:', xhr.responseText.substring(0, 500));
        resolve();
      };
      xhr.onerror = function(e) {
        console.log('请求失败:', e.type);
        resolve();
      };
      xhr.send();
    });
  `).then(() => {
    env.destroyTLS();
    env.destroy();
    process.exit(0);
  });
})();
