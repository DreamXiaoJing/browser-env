# browser-env

**Node.js 浏览器补环境框架** — 在 Node.js `vm` 沙箱中构建完整的浏览器环境，用于 JS 逆向分析。

## 设计原理

vs `jsdom`：jsdom 试图模拟 DOM 规范，但原型链、`native toString`、`document.all` 等细节与真实浏览器偏差大。

vs `puppeteer/playwright`：需要启动真实浏览器进程，资源开销大。

**本框架**：在 Node.js `vm` 中纯 JS 模拟，聚焦三个核心：

1. **原型链精确** — `instanceof`、`constructor`、`prototype` 完全匹配
2. **Native 保护** — `Function.prototype.toString` 返回 `function X() { [native code] }`
3. **模块化设计** — 按需加载，依赖管理，可自定义

## 快速开始

```javascript
const { BrowserEnv, createEnv } = require('./index');

// 方式 1：类方式
const env = new BrowserEnv({
    navigator: {
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...'
    },
    document: { URL: 'https://example.com' }
});
const ctx = env.create();

// 运行 JS
const ua = env.run('navigator.userAgent');
console.log('User Agent:', ua);
env.run('window.innerWidth = 1920');
const width = env.run('window.innerWidth');
console.log('innerWidth:', width);

// 方式 2：一次性 API
const { context, run } = createEnv({
    navigator: { platform: 'Linux x86_64' }
});
run('console.log(navigator.platform)');

// 加载 URL 并执行脚本
await env.loadUrl('http://example.com');
console.log('页面标题:', env.run('document.title'));

// 解析 HTML 并执行脚本
env.parseHtml('<html><head><script>window.test = "hello";</script></head></html>');
console.log('test:', env.run('window.test'));
```

## API

### BrowserEnv 类

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `new BrowserEnv(config)` | 创建环境实例 | BrowserEnv |
| `env.create()` | 创建并初始化浏览器环境 | vm context |
| `env.run(code, filename)` | 在沙箱中执行 JS 代码，若 code 为文件路径则自动加载文件 | 执行结果 |
| `env.loadUrl(url)` | 加载 URL 并执行页面脚本 | Promise |
| `env.parseHtml(html)` | 解析 HTML 并执行内联脚本 | 解析结果 |
| `env.getEnvTrace()` | 获取环境访问日志 | { log, summary } |
| `env.stopTracing()` | 停止 Proxy 观察 | void |
| `env.destroy()` | 关闭环境 | void |

### createEnv(config, code)

快速创建并初始化环境的一次性 API：

```javascript
const { run, loadUrl, parseHtml, destroy } = createEnv({
    navigator: { platform: 'Win32' }
}, 'console.log("Hello")');

run('navigator.userAgent');
await loadUrl('http://example.com');
parseHtml('<html><script>...</script></html>');
destroy();
```

## 配置

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `navigator` | object | UA、platform、language、plugins 等 |
| `location` | object | href、protocol、host 等 |
| `document` | object | URL、cookie、readyState 等 |
| `screen` | object | width、height、colorDepth 等 |
| `performance` | object | timing、navigation、memory 等 |
| `crypto` | object | getRandomValues 种子 |
| `storage` | object | localStorage 持久化路径 |
| `canvas` | object | toDataURL、WebGL vendor/renderer |
| `audio` | object | sampleRate、fingerprintData |
| `webrtc` | object | localIP、iceUfrag 等 |
| `modules` | array | 自定义模块列表 |
| `proxyObserver` | boolean | 启用 Proxy 访问追踪（调试用） |

## 模块架构

```
browser-env/
├── index.js              # 入口：BrowserEnv 类
├── lib/
│   ├── sandbox.js        # VM 上下文创建
│   ├── guard.js          # Native 保护工具
│   ├── module-loader.js  # 模块加载系统
│   ├── proxy-observer.js # 环境缺口追踪
│   ├── document-all-fix.js # document.all 修复
│   ├── find-gap.js       # 环境缺口检测
│   └── vmp-fix.js        # VMP 相关修复
├── modules/
│   ├── navigator.js      # ✓ navigator, plugins, mimeTypes
│   ├── location.js       # ✓ [LegacyUnforgeable]
│   ├── history.js        # ✓ pushState/replaceState
│   ├── screen.js         # ✓ 分辨率, 色深
│   ├── document.js       # ✓ all, createElement, cookie, textContent
│   ├── crypto.js         # ✓ getRandomValues, randomUUID, subtle
│   ├── performance.js    # ✓ now, timing, memory, marks
│   ├── storage.js        # ✓ localStorage(文件), sessionStorage
│   ├── timers.js         # ✓ setTimeout, rAF, idleCallback
│   ├── fetch.js          # ✓ Thenable fetch
│   ├── xmlhttprequest.js # ✓ 同步/异步 XHR
│   ├── websocket.js      # ✓ WS stub
│   ├── canvas.js         # ✓ Canvas 2D + WebGL
│   ├── audio.js          # ✓ AudioContext + OfflineAudioContext
│   ├── webrtc.js         # ✓ RTCPeerConnection + ICE
│   ├── worker.js         # ✓ Worker, MessageChannel, BroadcastChannel
│   ├── chrome.js         # ✓ chrome 对象
│   ├── events.js         # ✓ 事件系统
│   ├── dom-extra.js      # ✓ DOM 扩展 API
│   └── url-loader.js     # ✓ URL 加载与脚本执行
├── examples/
│   ├── tb.js             # 淘宝相关示例
│   ├── boss.js           # Boss 直聘示例
│   ├── wencai.js         # 问财示例
│   ├── h5st.js           # h5st 相关示例
│   ├── fireyejs.js       # 火眼相关示例
│   └── test.js           # 测试脚本
└── Dockerfile
```

## 日志模式

启用 `proxyObserver: true` 后，会自动追踪环境访问并打印日志：

```javascript
const env = createEnv({ proxyObserver: true });
env.run('navigator.userAgent');
// 输出: [TRACE] get navigator.userAgent | "Mozilla/5.0 ..."
```

日志格式：`[TRACE] 操作类型 属性路径 | 值 (原型)`

## URL 加载与脚本执行

`loadUrl` 和 `parseHtml` 方法会自动执行页面中的 JavaScript：

```javascript
// 加载远程页面
await env.loadUrl('http://example.com');

// 解析 HTML 字符串
env.parseHtml(`
<!DOCTYPE html>
<html>
<head>
  <script>
    window.testVar = 'hello world';
    window.testFunc = function() { return 'result'; };
  </script>
</head>
<body>
  <div id="content">Hello</div>
  <script>
    document.getElementById('content').textContent = 'Modified';
  </script>
</body>
</html>
`);

// 访问执行后的变量
console.log(env.run('window.testVar'));      // hello world
console.log(env.run('window.testFunc()'));   // result
console.log(env.run('document.getElementById("content").textContent')); // Modified
```

支持的脚本类型：
- 内联脚本（`<script>...</script>`）
- 外部脚本（`<script src="...">`）
- `async`/`defer` 属性
- `DOMContentLoaded` 和 `load` 事件

## 示例

查看 [examples/](examples/) 目录获取更多使用示例。

## 特性

- ✅ 完整的 BOM/DOM 模拟
- ✅ 精确的原型链和 native toString 保护
- ✅ 支持 fetch、XHR、WebSocket
- ✅ Canvas 2D 和 WebGL 支持
- ✅ AudioContext 支持
- ✅ WebRTC 支持
- ✅ Worker 支持
- ✅ localStorage 持久化
- ✅ URL 加载与脚本执行
- ✅ 环境访问日志追踪
- ✅ 模块化设计，按需加载
