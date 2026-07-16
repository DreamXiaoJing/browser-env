'use strict';

/**
 * TLS native 库下载器
 *
 * 自动检测当前平台和架构，从 GitHub 下载对应的 tls-client native 库。
 * 支持：Windows (x64/x86), Linux (x64/arm64), macOS (x64/arm64)。
 *
 * 库文件保存到 os.tmpdir()，与 node-tls-client 的加载路径一致。
 */

const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * 根据平台和架构获取 native 库文件信息
 * 与 node-tls-client 内部的 LibraryHandler.retrieveFileInfo() 保持一致
 * @returns {{name: string, downloadName: string, platform: string, arch: string}}
 */
function getNativeInfo() {
  const platform = process.platform;
  const arch = process.arch;

  const map = {
    darwin: {
      arm64: {
        name: 'tls-client-arm64.dylib',
        downloadName: 'tls-client-darwin-arm64-{version}.dylib',
      },
      x64: {
        name: 'tls-client-x86.dylib',
        downloadName: 'tls-client-darwin-amd64-{version}.dylib',
      },
    },
    win32: {
      x64: {
        name: 'tls-client-64.dll',
        downloadName: 'tls-client-windows-64-{version}.dll',
      },
      ia32: {
        name: 'tls-client-32.dll',
        downloadName: 'tls-client-windows-32-{version}.dll',
      },
    },
    linux: {
      arm64: {
        name: 'tls-client-arm64.so',
        downloadName: 'tls-client-linux-arm64-{version}.so',
      },
      x64: {
        name: 'tls-client-x64.so',
        downloadName: 'tls-client-ubuntu-amd64-{version}.so',
      },
      default: {
        name: 'tls-client-amd64.so',
        downloadName: 'tls-client-ubuntu-amd64-{version}.so',
      },
    },
  };

  const info = map[platform]?.[arch] || map.linux.default;
  return { ...info, platform, arch };
}

/**
 * 从 GitHub API 获取最新版本号
 * @returns {Promise<string>} 版本号，如 'v1.15.1'
 */
function getLatestVersion() {
  return new Promise((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path: '/repos/bogdanfinn/tls-client/releases/latest',
      headers: { 'user-agent': 'node' },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          const release = JSON.parse(data);
          resolve(release.tag_name);
        } else {
          reject(new Error(`GitHub API returned ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * 下载文件（支持重定向）
 * @param {string} url - 下载 URL
 * @param {string} dest - 目标路径
 * @returns {Promise<void>}
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlink(dest, () => {});
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', err => {
      file.close();
      fs.unlink(dest, () => reject(err));
    });
  });
}

/**
 * 检查 native 库是否已存在
 * @param {string} [libPath] - 自定义路径，默认 os.tmpdir()
 * @returns {boolean}
 */
function exists(libPath) {
  const info = getNativeInfo();
  const dest = libPath || path.join(os.tmpdir(), info.name);
  return fs.existsSync(dest);
}

/**
 * 下载当前平台的 native 库
 * @param {object} [options] - 选项
 * @param {string} [options.version] - 指定版本，如 'v1.15.1'，默认获取最新
 * @param {string} [options.dest] - 自定义保存路径，默认 os.tmpdir()
 * @param {boolean} [options.force] - 强制重新下载（即使已存在）
 * @returns {Promise<string>} 库文件路径
 */
async function downloadNativeLib(options = {}) {
  const info = getNativeInfo();
  const destPath = options.dest || path.join(os.tmpdir(), info.name);

  // 检查是否已存在
  if (!options.force && fs.existsSync(destPath)) {
    const size = fs.statSync(destPath).size;
    if (size > 0) {
      console.log(`[tls-download] ${info.name} 已存在 (${size} bytes): ${destPath}`);
      return destPath;
    }
  }

  // 获取版本号
  let version = options.version;
  if (!version) {
    console.log('[tls-download] 正在获取最新版本...');
    version = await getLatestVersion();
  }
  console.log(`[tls-download] 版本: ${version}`);

  // 构建下载 URL
  const downloadName = info.downloadName.replace('{version}', version.replace(/^v/, ''));
  const url = `https://github.com/bogdanfinn/tls-client/releases/download/${version}/${downloadName}`;

  console.log(`[tls-download] 平台: ${info.platform}/${info.arch}`);
  console.log(`[tls-download] 文件: ${info.name}`);
  console.log(`[tls-download] 下载: ${url}`);
  console.log(`[tls-download] 保存到: ${destPath}`);

  await downloadFile(url, destPath);

  const size = fs.statSync(destPath).size;
  console.log(`[tls-download] 下载完成! ${size} bytes`);

  // Linux/macOS 设置可执行权限
  if (info.platform !== 'win32') {
    fs.chmodSync(destPath, 0o755);
    console.log(`[tls-download] 已设置可执行权限`);
  }

  return destPath;
}

module.exports = {
  getNativeInfo,
  getLatestVersion,
  downloadNativeLib,
  exists,
};
