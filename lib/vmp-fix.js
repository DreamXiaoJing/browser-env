'use strict';

/**
 * VMP 源码预处理器
 * 
 * 修复 VMP 中因变量提升导致函数对象被 push 调用的问题。
 * 原理：在 VMP 源码中找到所有 .push() 调用，在之前插入类型守卫，
 * 确保 push 目标始终是数组。
 */

/**
 * 保护 VMP 代码中的所有 .push() 调用
 * @param {string} vmpCode 原始 VMP 源代码
 * @returns {string} 添加保护后的 VMP 代码
 */
function protectPushCalls(vmpCode) {
  let result = vmpCode;
  let modifiedCount = 0;
  
  // 找到所有 VAR.push( 模式
  // 变量名由字母、数字、$、_ 组成
  const pushPattern = /([\w$]+)\.push\(/g;
  let match;
  const replacements = [];
  
  // 收集所有需要替换的位置（从后往前，避免偏移）
  while ((match = pushPattern.exec(vmpCode)) !== null) {
    const varName = match[1];
    const fullMatch = match[0]; // e.g., "_$f0.push("
    
    // 检查是否在字符串中
    if (isInString(vmpCode, match.index)) continue;
    
    // 生成替换：VAR.push( → (typeof VAR!=='object'||VAR===null)&&(VAR=[]),VAR.push(
    const replacement = `(typeof ${varName}!=='object'||${varName}===null)&&(${varName}=[]),${fullMatch}`;
    
    replacements.push({
      start: match.index,
      end: match.index + fullMatch.length,
      replacement
    });
    
    modifiedCount++;
  }
  
  // 从后往前应用替换
  replacements.sort((a, b) => b.start - a.start);
  
  for (const rep of replacements) {
    result = result.substring(0, rep.start) + rep.replacement + result.substring(rep.end);
  }
  
  console.log(`[VMP-FIX] Protected ${modifiedCount} .push() calls`);
  return result;
}

/**
 * 检查位置是否在字符串字面量中
 */
function isInString(code, pos) {
  // Simple check: scan for quotes
  let inSingle = false, inDouble = false;
  for (let i = 0; i < pos; i++) {
    const c = code[i];
    if (c === '\\') { i++; continue; } // skip escaped
    if (c === "'" && !inDouble) inSingle = !inSingle;
    if (c === '"' && !inSingle) inDouble = !inDouble;
  }
  return inSingle || inDouble;
}

/**
 * 整体修复 VMP：应用所有保护措施
 */
function fixVMP(vmpCode) {
  let code = vmpCode;
  
  console.log('[VMP-FIX] Applying protections...');
  
  // 修复1：保护所有 push 调用
  code = protectPushCalls(code);
  
  const originalSize = (vmpCode.length / 1024).toFixed(1);
  const newSize = (code.length / 1024).toFixed(1);
  console.log(`[VMP-FIX] ${originalSize} KB → ${newSize} KB`);
  
  return code;
}

module.exports = {
  fixVMP,
  protectPushCalls
};

// 独立运行测试
if (require.main === module) {
  const path = require('path');
  const fs = require('fs');
  const https = require('https');
  const { BrowserEnv } = require(path.join(__dirname, '..', 'index'));
  
  function get(url) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      https.get({
        hostname: u.hostname, path: u.pathname+u.search,
        headers: {'User-Agent': 'Mozilla/5.0 Chrome/131'}, rejectUnauthorized: false
      }, r => { let d=''; r.on('data', c => d+=c); r.on('end', () => resolve(d)); })
      .on('error', reject).end();
    });
  }
  
  (async function() {
    console.log('[TEST] Downloading 412 challenge...');
    const html = await get('https://www.nmpa.gov.cn/xxgk/ggtg/index_1.html');
    
    const cdM = html.match(/\$_ts\.cd\s*=\s*"([^"]+)"/);
    const tsCd = cdM ? cdM[1] : '';
    const nsdM = html.match(/\$_ts\.nsd\s*=\s*(\d+)/);
    const tsNsd = nsdM ? nsdM[1] : '';
    const srcM = html.match(/src=["']([^"']+\.js[^"']*)["']/i);
    const vmpUrl = srcM ? (srcM[1].startsWith('http') ? srcM[1] : 'https://www.nmpa.gov.cn' + srcM[1]) : '';
    
    console.log('[TEST] Downloading VMP...');
    const vmpCode = await get(vmpUrl);
    console.log(`[TEST] VMP size: ${(vmpCode.length/1024).toFixed(1)} KB`);
    
    // Apply fix
    const fixedCode = fixVMP(vmpCode);
    
    // Create env
    const env = new BrowserEnv({
      location: { href: 'https://www.nmpa.gov.cn/xxgk/ggtg/index_1.html' },
      navigator: { userAgent: 'Mozilla/5.0 Chrome/131' }
    });
    env.create();
    
    // Init $_ts
    env.run('window.$_ts={};$_ts.cd=' + JSON.stringify(tsCd) + ';$_ts.nsd=' + (tsNsd||0) + ';');
    
    // Head scripts
    const headScripts = [];
    const scriptRe = /<script[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = scriptRe.exec(html))) {
      const c = m[1].trim();
      if (c && !c.startsWith('<') && c.length > 3 && m.index < html.indexOf('</body>'))
        headScripts.push(c);
    }
    for (const sc of headScripts) {
      try { env.run(sc, 'h.js'); } catch(e) {}
    }
    
    // Execute FIXED VMP
    console.log('\n[TEST] Executing FIXED VMP...');
    try {
      env.run(fixedCode, 'vmp-fixed.js');
      console.log('[TEST] ✓ VMP executed successfully');
    } catch(e) {
      console.log('[TEST] ✗ VMP error:', e.message);
      console.log('STACK:', e.stack.split('\n').slice(0,6).join('\n'));
    }
    
    // Results
    console.log('\n[TEST] $_ts keys:', env.run("Object.keys($_ts).join(',')"));
    console.log('[TEST] typeof lcd:', env.run('typeof $_ts.lcd'));
    console.log('[TEST] lcd is function:', env.run('typeof $_ts.lcd === "function"'));
    
    // Try lcd
    if (env.run('typeof $_ts.lcd === "function"')) {
      console.log('\n[TEST] Calling $_ts.lcd()...');
      try {
        env.run('__flushTimers && __flushTimers(50)');
        env.run('$_ts.lcd()');
        console.log('[TEST] ✓ lcd() done');
        env.run('__flushTimers && __flushTimers(200)');
        const cookie = env.run('document.cookie');
        console.log('[TEST] document.cookie:', cookie);
      } catch(e) {
        console.log('[TEST] lcd() error:', e.message);
      }
    }
    
    env.destroy();
  })().catch(e => console.log('FATAL:', e.message, e.stack));
}
