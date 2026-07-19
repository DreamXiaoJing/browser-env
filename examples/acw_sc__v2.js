const { createEnv } = require('../');

const origLog = console.log;
const origError = console.error;

const env = createEnv({
    location: { href: 'https://www.gongkaoleida.com/' },
    navigator: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
});

origLog('1. 开始加载页面...');

env.loadUrl('https://www.gongkaoleida.com/')
  .then(result => {
    origLog('2. 页面加载完成, HTML 长度:', result.html.length);

    // url-loader 的 DOMContentLoaded 通过 setTimeout(0) 调度，进入 pendingZeroDelay 队列
    // 立即刷新队列，让 DOMContentLoaded 触发 l()
    if (typeof env.context.__flushTimers === 'function') {
      env.context.__flushTimers(20);
    }

    origLog('3. cookie after flush:', env.context.document.cookie);

    // setTimeout(reload, 2) 是非 0 延迟，由 Node setTimeout 处理
    // 等待 50ms 让它执行
    setTimeout(() => {
      // 再次 flush（reload 内部可能再入队 0 延迟任务）
      if (typeof env.context.__flushTimers === 'function') {
        env.context.__flushTimers(20);
      }
      origLog('4. final cookie:', env.context.document.cookie);
      process.exit(0);
    }, 50);
  })
  .catch(err => {
    origError('加载失败:', err.message);
    origError(err.stack);
    process.exit(1);
  });
