const { BrowserEnv, createEnv } = require('../index');

// 方式 1：类方式
const env = new BrowserEnv({
    navigator: {
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...'
    },
    document: { URL: 'https://example.com' }
});
env.create();

// 运行 JS
const ua = env.run('navigator.userAgent');
console.log('User Agent:', ua);
env.run('window.innerWidth = 1920');
const width = env.run('window.innerWidth');
console.log('innerWidth:', width);

// 方式 2：一次性 API
const {  run } = createEnv({
    navigator: { platform: 'Linux x86_64' }
});
run('console.log(navigator.platform)');