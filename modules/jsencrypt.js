'use strict';

const { makeNative } = require('../lib/guard');

/**
 * JSEncrypt 模块
 *
 * 复刻浏览器端的 JSEncrypt 库（travist/jsencrypt）行为，
 * 用于在补环境沙箱中运行依赖 window.JSEncrypt 的前端加密代码。
 *
 * 基于 Node.js 原生 crypto 模块实现，与浏览器 JSEncrypt 完全兼容：
 * - 支持公钥加密（PKCS#1 v1.5 padding）
 * - 支持私钥解密
 * - 支持 OAEP 填充加密
 * - 支持签名/验签（PKCS#1 v1.5）
 * - 支持 SHA-256 签名/验签
 * - 支持 getPublicKey / getPrivateKey 等 API
 * - encrypt() 返回 base64 字符串，与浏览器一致
 * - decrypt() 输入 base64 字符串，返回明文
 *
 * 关键兼容点：
 * 1. 输入的 PEM 密钥可能没有 header/footer（JSEncrypt 内部会自动补全）
 * 2. 输入可能是 PKCS#1 或 PKCS#8 格式的公钥/私钥
 * 3. encrypt 失败返回 false（不是抛异常）
 * 4. 默认 key size 为 1024，public exponent 为 65537
 */

function install(sandbox, config = {}) {
  const nodeCrypto = require('crypto');

  // ── 工具函数 ──

  /**
   * 标准化 PEM 密钥：确保有正确的 header/footer 和换行
   * JSEncrypt 接受的格式非常宽松：
   * - 带或不带 header/footer
   * - 单行或多行 base64
   * - PKCS#1 或 PKCS#8 格式
   */
  function normalizePem(key, type) {
    if (typeof key !== 'string') return key;
    let str = key.trim();

    // 已经是 PEM 格式
    if (str.includes('-----BEGIN')) {
      return str;
    }

    // 去除可能的 whitespace
    const b64 = str.replace(/\s+/g, '');

    // 根据内容判断是公钥还是私钥的 header
    // 注意：JSEncrypt 的 setPublicKey/setPrivateKey 会传入 type
    // 但实际密钥格式（PKCS#1 vs PKCS#8）需要尝试解析后才知道
    if (type === 'public') {
      // 默认使用 PKCS#8 PUBLIC KEY（最常见）
      // 如果解析失败，再尝试 PKCS#1 RSA PUBLIC KEY
      return [
        '-----BEGIN PUBLIC KEY-----',
        ...b64.match(/.{1,64}/g) || [b64],
        '-----END PUBLIC KEY-----',
        ''
      ].join('\n');
    } else {
      // 私钥默认尝试 PKCS#8 PRIVATE KEY
      return [
        '-----BEGIN PRIVATE KEY-----',
        ...b64.match(/.{1,64}/g) || [b64],
        '-----END PRIVATE KEY-----',
        ''
      ].join('\n');
    }
  }

  /**
   * 尝试将密钥字符串转换为 Node.js 可识别的 PEM 格式
   * 按顺序尝试：PKCS#8、PKCS#1、自动检测
   */
  function loadKey(keyStr, isPublic) {
    if (!keyStr || typeof keyStr !== 'string') return null;

    // 1. 如果已经是 PEM 格式，直接尝试
    if (keyStr.includes('-----BEGIN')) {
      return tryCreateKey(keyStr, isPublic);
    }

    // 2. 尝试作为 PKCS#8 格式
    const pkcs8Pem = normalizePem(keyStr, isPublic ? 'public' : 'private');
    const key1 = tryCreateKey(pkcs8Pem, isPublic);
    if (key1) return key1;

    // 3. 尝试作为 PKCS#1 格式
    const pkcs1Type = isPublic ? 'RSA PUBLIC KEY' : 'RSA PRIVATE KEY';
    const b64 = keyStr.replace(/\s+/g, '');
    const pkcs1Pem = [
      `-----BEGIN ${pkcs1Type}-----`,
      ...(b64.match(/.{1,64}/g) || [b64]),
      `-----END ${pkcs1Type}-----`,
      ''
    ].join('\n');
    const key2 = tryCreateKey(pkcs1Pem, isPublic);
    if (key2) return key2;

    return null;
  }

  function tryCreateKey(pem, isPublic) {
    try {
      if (isPublic) {
        return nodeCrypto.createPublicKey(pem);
      } else {
        return nodeCrypto.createPrivateKey(pem);
      }
    } catch (e) {
      return null;
    }
  }

  /**
   * 从公钥对象导出 PEM 字符串（PKCS#8 PKCS#1 都尝试）
   */
  function exportPublicKeyPem(key) {
    try {
      // 优先 PKCS#1（浏览器 JSEncrypt 默认导出 PKCS#1）
      const pkcs1 = key.export({ type: 'pkcs1', format: 'pem' });
      return pkcs1;
    } catch (e) {
      try {
        return key.export({ type: 'spki', format: 'pem' });
      } catch (e2) {
        return null;
      }
    }
  }

  function exportPrivateKeyPem(key) {
    try {
      // 浏览器 JSEncrypt 默认导出 PKCS#1
      return key.export({ type: 'pkcs1', format: 'pem' });
    } catch (e) {
      try {
        return key.export({ type: 'pkcs8', format: 'pem' });
      } catch (e2) {
        return null;
      }
    }
  }

  /**
   * 从 PEM 字符串中提取 base64 部分（去除 header/footer）
   */
  function pemToBase64(pem) {
    if (!pem) return '';
    return pem
      .replace(/-----[^-]+-----/g, '')
      .replace(/\s+/g, '');
  }

  /**
   * 判断密钥是否为 RSA 密钥
   */
  function isRsaKey(key) {
    if (!key) return false;
    try {
      const jwk = key.export({ format: 'jwk' });
      return jwk.kty === 'RSA';
    } catch (e) {
      return false;
    }
  }

  // ── JSEncryptRSAKey 内部类（不暴露给沙箱）──
  class JSEncryptRSAKey {
    constructor(key) {
      this.publicKey = null;     // Node KeyObject (public)
      this.privateKey = null;    // Node KeyObject (private)
      this.keySize = 0;          // 密钥位数（如 1024、2048）

      if (key) {
        if (typeof key === 'string') {
          this.parseKey(key);
        } else if (typeof key === 'object') {
          this.parsePropertiesFrom(key);
        }
      }
    }

    /**
     * 解析 PEM 字符串密钥
     */
    parseKey(keyStr) {
      // 先尝试作为私钥解析
      let privKey = loadKey(keyStr, false);
      if (privKey && isRsaKey(privKey)) {
        this.privateKey = privKey;
        // 从私钥派生公钥
        try {
          this.publicKey = nodeCrypto.createPublicKey(privKey);
        } catch (e) {}
        this.keySize = getKeySize(privKey);
        return true;
      }

      // 再尝试作为公钥解析
      let pubKey = loadKey(keyStr, true);
      if (pubKey && isRsaKey(pubKey)) {
        this.publicKey = pubKey;
        this.keySize = getKeySize(pubKey);
        return true;
      }

      return false;
    }

    parsePropertiesFrom(obj) {
      // 浏览器 JSEncrypt 支持传入 { n, e, d, p, q, ... } 形式的对象
      // 这里简化实现：如果对象有 n 和 e，尝试构建 JWK
      try {
        if (obj.n && obj.e) {
          const jwk = {
            kty: 'RSA',
            n: obj.n,
            e: obj.e,
            key_ops: ['encrypt']
          };
          if (obj.d) {
            jwk.d = obj.d;
            if (obj.p) jwk.p = obj.p;
            if (obj.q) jwk.q = obj.q;
            if (obj.dp) jwk.dp = obj.dp;
            if (obj.dq) jwk.dq = obj.dq;
            if (obj.qinv) jwk.qi = obj.qinv;
            jwk.key_ops = ['decrypt'];
          }
          const key = nodeCrypto.createKey({
            key: jwk,
            format: 'jwk'
          });
          if (obj.d) {
            this.privateKey = key;
            this.publicKey = nodeCrypto.createPublicKey(key);
          } else {
            this.publicKey = key;
          }
          this.keySize = getKeySize(key);
          return true;
        }
      } catch (e) {}
      return false;
    }

    /**
     * 加密（PKCS#1 v1.5 padding）
     */
    encrypt(str) {
      if (!this.publicKey) return null;
      try {
        const buf = nodeCrypto.publicEncrypt(
          {
            key: this.publicKey,
            padding: nodeCrypto.constants.RSA_PKCS1_PADDING
          },
          Buffer.from(str, 'utf8')
        );
        return buf.toString('hex');
      } catch (e) {
        return null;
      }
    }

    /**
     * OAEP 填充加密
     */
    encryptOAEP(str) {
      if (!this.publicKey) return null;
      try {
        const buf = nodeCrypto.publicEncrypt(
          {
            key: this.publicKey,
            padding: nodeCrypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          Buffer.from(str, 'utf8')
        );
        return buf.toString('hex');
      } catch (e) {
        return null;
      }
    }

    /**
     * 解密
     * 返回明文字符串，失败返回 null
     *
     * 实现说明：Node.js 的 privateDecrypt(RSA_PKCS1_PADDING) 在 padding
     * 无效时仍可能"成功"返回乱码（OpenSSL 行为）。为匹配浏览器 JSEncrypt
     * 在无效密文时返回 false 的行为，先用 NO_PADDING 解密，手动验证
     * PKCS#1 v1.5 padding 格式（0x00 0x02 <PS> 0x00 <M>），格式不符返回 null。
     */
    decrypt(hexStr) {
      if (!this.privateKey) return null;
      try {
        const buf = Buffer.from(hexStr, 'hex');
        // 用 NO_PADDING 解密得到原始数据（含 padding）
        let raw;
        try {
          raw = nodeCrypto.privateDecrypt(
            {
              key: this.privateKey,
              padding: nodeCrypto.constants.RSA_NO_PADDING
            },
            buf
          );
        } catch (e) {
          return null;
        }

        // 验证 PKCS#1 v1.5 padding 格式：0x00 0x02 <PS>=non-zero bytes> 0x00 <M>
        if (raw.length < 11 || raw[0] !== 0x00 || raw[1] !== 0x02) {
          return null;
        }
        // 查找分隔符 0x00（PS 段至少 8 字节非零）
        let sepIdx = -1;
        for (let i = 2; i < raw.length; i++) {
          if (raw[i] === 0x00) {
            if (i >= 10) { // 2 + 8 = 10，PS 至少 8 字节
              sepIdx = i;
            }
            break;
          }
        }
        if (sepIdx === -1) return null;

        return raw.slice(sepIdx + 1).toString('utf8');
      } catch (e) {
        return null;
      }
    }

    /**
     * 签名（PKCS#1 v1.5）
     */
    sign(str, digestMethod, digestName) {
      if (!this.privateKey) return null;
      try {
        let data;
        if (typeof digestMethod === 'function') {
          // digestMethod 接收字符串，返回 hex
          const hashHex = digestMethod(str);
          data = Buffer.from(hashHex, 'hex');
        } else {
          data = Buffer.from(str, 'utf8');
        }

        const algorithm = digestName || 'RSA-SHA256';
        // Node 的 sign 使用 algorithm + key，会自动做 hash
        // 但 JSEncrypt 的 sign 期望传入的是已经 hash 过的数据
        // 这里我们用 createSign 然后用 RSA_PKCS1_PADDING
        const signer = nodeCrypto.createSign(algorithm);
        signer.update(str, 'utf8');
        const signature = signer.sign({
          key: this.privateKey,
          padding: nodeCrypto.constants.RSA_PKCS1_PADDING
        });
        return signature.toString('hex');
      } catch (e) {
        return null;
      }
    }

    /**
     * 验签
     */
    verify(str, signatureHex, digestMethod, digestName) {
      if (!this.publicKey) return false;
      try {
        const signature = Buffer.from(signatureHex, 'hex');
        const algorithm = digestName || 'RSA-SHA256';
        const verifier = nodeCrypto.createVerify(algorithm);
        verifier.update(str, 'utf8');
        return verifier.verify(
          {
            key: this.publicKey,
            padding: nodeCrypto.constants.RSA_PKCS1_PADDING
          },
          signature
        );
      } catch (e) {
        return false;
      }
    }

    /**
     * 生成新密钥（与浏览器行为一致：1024 bit, e=65537）
     */
    generate(keySize, publicExponent) {
      const size = parseInt(keySize, 10) || 1024;
      // publicExponent 在 Node 中不能直接指定，这里忽略（默认即 65537）
      const { privateKey, publicKey } = nodeCrypto.generateKeyPairSync('rsa', {
        modulusLength: size,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
      });
      this.privateKey = nodeCrypto.createPrivateKey(privateKey);
      this.publicKey = nodeCrypto.createPublicKey(publicKey);
      this.keySize = size;
    }

    generateAsync(keySize, publicExponent, cb) {
      // 异步生成
      const size = parseInt(keySize, 10) || 1024;
      nodeCrypto.generateKeyPair('rsa', {
        modulusLength: size,
        publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs1', format: 'pem' }
      }, (err, publicKey, privateKey) => {
        if (err) {
          if (typeof cb === 'function') cb();
          return;
        }
        this.privateKey = nodeCrypto.createPrivateKey(privateKey);
        this.publicKey = nodeCrypto.createPublicKey(publicKey);
        this.keySize = size;
        if (typeof cb === 'function') cb();
      });
    }

    getPrivateKey() {
      if (!this.privateKey) return '';
      const pem = exportPrivateKeyPem(this.privateKey);
      return pem || '';
    }

    getPublicBaseKeyB64() {
      if (!this.publicKey) return '';
      const pem = exportPublicKeyPem(this.publicKey);
      return pemToBase64(pem);
    }

    getPrivateBaseKeyB64() {
      if (!this.privateKey) return '';
      const pem = exportPrivateKeyPem(this.privateKey);
      return pemToBase64(pem);
    }

    getPublicKey() {
      if (!this.publicKey) return '';
      const pem = exportPublicKeyPem(this.publicKey);
      return pem || '';
    }
  }

  function getKeySize(key) {
    try {
      // 通过 JWK 的 n 字段长度推算密钥位数
      const jwk = key.export({ format: 'jwk' });
      if (jwk.n) {
        // base64url 字符串长度 * 6 / 8 = 字节数，再 * 8 = 位数
        const nBytes = Math.floor(jwk.n.replace(/-/g, '+').replace(/_/g, '/').length * 3 / 4);
        return nBytes * 8;
      }
    } catch (e) {}
    return 0;
  }

  // ── base64 工具（JSEncrypt 内部使用）──
  // hex -> base64
  function hex2b64(hex) {
    if (!hex || hex === false) return false;
    const buf = Buffer.from(hex, 'hex');
    return buf.toString('base64');
  }

  // base64 -> hex
  function b64tohex(b64) {
    if (!b64) return '';
    try {
      const buf = Buffer.from(b64, 'base64');
      return buf.toString('hex');
    } catch (e) {
      return '';
    }
  }

  // ── JSEncrypt 主类 ──
  class JSEncrypt {
    constructor(options) {
      options = options || {};
      this.default_key_size = options.default_key_size
        ? parseInt(options.default_key_size, 10)
        : 1024;
      this.default_public_exponent = options.default_public_exponent || '010001';
      this.log = options.log || false;
      this.key = options.key || null;
      // 如果 options.key 是字符串，先解析
      if (typeof this.key === 'string') {
        const k = new JSEncryptRSAKey();
        k.parseKey(this.key);
        this.key = k;
      } else if (this.key && !this.key.publicKey && !this.key.privateKey) {
        // 不是 JSEncryptRSAKey 实例
        this.key = null;
      }
    }

    setKey(key) {
      if (key) {
        if (this.log && this.key) {
          console.warn('A key was already set, overriding existing.');
        }
        this.key = new JSEncryptRSAKey(key);
      } else if (!this.key && this.log) {
        console.error('A key was not set.');
      }
    }

    setPrivateKey(privkey) {
      this.setKey(privkey);
    }

    setPublicKey(pubkey) {
      this.setKey(pubkey);
    }

    decrypt(str) {
      try {
        const result = this.getKey().decrypt(b64tohex(str));
        return result === null ? false : result;
      } catch (ex) {
        return false;
      }
    }

    encrypt(str) {
      try {
        const hex = this.getKey().encrypt(str);
        if (hex === null || hex === false) return false;
        return hex2b64(hex);
      } catch (ex) {
        return false;
      }
    }

    encryptOAEP(str) {
      try {
        const hex = this.getKey().encryptOAEP(str);
        if (hex === null || hex === false) return false;
        return hex2b64(hex);
      } catch (ex) {
        return false;
      }
    }

    sign(str, digestMethod, digestName) {
      try {
        const sig = this.getKey().sign(str, digestMethod, digestName);
        return sig ? hex2b64(sig) : false;
      } catch (ex) {
        return false;
      }
    }

    signSha256(str) {
      return this.sign(str, null, 'sha256');
    }

    verify(str, signature, digestMethod) {
      try {
        return this.getKey().verify(str, b64tohex(signature), digestMethod);
      } catch (ex) {
        return false;
      }
    }

    verifySha256(str, signature) {
      return this.verify(str, signature, null, 'sha256');
    }

    getKey(cb) {
      if (!this.key) {
        this.key = new JSEncryptRSAKey();
        if (cb && {}.toString.call(cb) === '[object Function]') {
          this.key.generateAsync(
            this.default_key_size,
            this.default_public_exponent,
            cb
          );
          return;
        }
        this.key.generate(this.default_key_size, this.default_public_exponent);
      }
      return this.key;
    }

    getPrivateKey() {
      return this.getKey().getPrivateKey();
    }

    getPrivateKeyB64() {
      return this.getKey().getPrivateBaseKeyB64();
    }

    getPublicKey() {
      return this.getKey().getPublicKey();
    }

    getPublicKeyB64() {
      return this.getKey().getPublicBaseKeyB64();
    }
  }

  // 静态 version 属性（与浏览器行为一致）
  try {
    Object.defineProperty(JSEncrypt, 'version', {
      value: '3.3.2',
      writable: false,
      configurable: true,
      enumerable: true
    });
  } catch (e) {}

  // 让 JSEncrypt 构造函数看起来像 native
  makeNative(JSEncrypt, 'JSEncrypt');

  // ── 安装到 sandbox ──
  sandbox.JSEncrypt = JSEncrypt;
  sandbox.jsencrypt = { JSEncrypt }; // 部分 UMD 引用形式

  // 检查点
  if (config.__verify) {
    console.log('[verify] JSEncrypt installed:', typeof sandbox.JSEncrypt);
    console.log('[verify] JSEncrypt.version:', JSEncrypt.version);
  }
}

module.exports = { install };
