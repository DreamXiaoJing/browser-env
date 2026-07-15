'use strict';

/**
 * 京东 h5st 签名示例 — browser-env
 *
 * 在补环境沙箱中加载 ParamsSign，生成 h5st 并请求京东 API。
 *
 * 用法: node examples/h5st.js
 */

const crypto = require('crypto');
const { createEnv } = require('../');
const env = createEnv({},'./h5st_5.3.js');
env.run('window.HTMLAllCollection = undefined;'); // 重点

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
console.log('h5st length:', h5st.length);

params.h5st = h5st;
const url = 'https://api.m.jd.com/api?' + new URLSearchParams(params).toString();

// 使用沙箱内的 XMLHttpRequest（支持同步模式）
const XMLHttpRequest = env.context.XMLHttpRequest;
const xhr = new XMLHttpRequest();
xhr.open('GET', url, true);
xhr.setRequestHeader('authority', 'api.m.jd.com');
xhr.setRequestHeader('accept', '*/*');
xhr.setRequestHeader('accept-language', 'zh-CN,zh;q=0.9,en;q=0.8');
xhr.setRequestHeader('access-control-request-headers', 'x-referer-page,x-rp-client');
xhr.setRequestHeader('access-control-request-method', 'GET');
xhr.setRequestHeader('cache-control', 'no-cache');
xhr.setRequestHeader('origin', 'https://m.jd.com');
xhr.setRequestHeader('pragma', 'no-cache');
xhr.setRequestHeader('referer', 'https://m.jd.com/');
xhr.setRequestHeader('sec-fetch-dest', 'empty');
xhr.setRequestHeader('sec-fetch-mode', 'cors');
xhr.setRequestHeader('sec-fetch-site', 'same-site');
xhr.setRequestHeader('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

xhr.onload = function() {
    console.log('Response:', xhr.responseText);
    console.log('Status:', xhr.status);
    env.destroy();
};

xhr.onerror = function(e) {
    console.log('Error:', e);
    env.destroy();
};

xhr.send();

