/**
 * 缺口检测 — Node.js 包装器，实际调用 Python OpenCV
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FIND_GAP_PY = path.join(__dirname, '..', 'scripts', 'find_gap.py');

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { rejectUnauthorized: false }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

/**
 * 找缺口：下载图片 → Python OpenCV 处理 → 返回结果
 */
async function findGap(bgUrl, spriteUrl, cropXY, _cropWH, _opts) {
  const [sx, sy] = cropXY;
  const [sw, sh] = _cropWH;

  console.log('  下载背景图...');
  const bgBuf = await fetch(bgUrl);
  console.log('  下载滑块图...');
  const spBuf = await fetch(spriteUrl);

  const tmpDir = '/tmp';
  const bgPath = path.join(tmpDir, `bg_${Date.now()}.png`);
  const spPath = path.join(tmpDir, `sp_${Date.now()}.png`);

  // PNG 尾部多余字节处理
  const stripTail = (buf) => {
    if (buf[0] !== 0x89) return buf;  // JPEG 不用处理
    let pos = 8;
    while (pos < buf.length - 4) {
      const len = buf.readUInt32BE(pos);
      if (buf.slice(pos+4, pos+8).toString() === 'IEND') return buf.slice(0, pos + 12);
      pos += 12 + len;
    }
    return buf;
  };

  fs.writeFileSync(bgPath, stripTail(bgBuf));
  fs.writeFileSync(spPath, stripTail(spBuf));

  console.log(`  调用 OpenCV... (裁剪 ${sx},${sy} ${sw}x${sh})`);
  const t0 = Date.now();
  const stdout = execFileSync('python3', [FIND_GAP_PY, bgPath, spPath, String(sx), String(sy), String(sw), String(sh)], {
    timeout: 30000,
    encoding: 'utf8'
  }).trim();
  const elapsed = Date.now() - t0;

  // 清理
  try { fs.unlinkSync(bgPath); fs.unlinkSync(spPath); } catch(e) {}

  const result = JSON.parse(stdout);
  if (result.error) throw new Error(result.error);

  console.log(`  OpenCV 耗时: ${elapsed}ms`);
  console.log(`  缺口: x=${result.x}, y=${result.y}, 匹配分=${result.score}`);
  return result;
}

module.exports = { findGap };
