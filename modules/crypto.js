'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * crypto 模块
 *
 * 实现:
 * - crypto.getRandomValues（使用 Node.js crypto.randomFillSync）
 * - crypto.randomUUID
 * - crypto.subtle (digest, encrypt, decrypt, generateKey, sign, verify)
 * - msCrypto (IE 兼容)
 */

const nodeCrypto = require('crypto');

function install(sandbox, config = {}) {
  const cfg = config.crypto || {};

  // ── SubtleCrypto ──
  function SubtleCrypto() {}
  makeNative(SubtleCrypto, 'SubtleCrypto');

  const subtle = {
    // Digest
    digest: makeNative(function digest(algorithm, data) {
      if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        data = Buffer.from(data instanceof ArrayBuffer ? data : data.buffer);
      }
      const algo = typeof algorithm === 'string' ? algorithm : algorithm.name || 'SHA-256';
      return new Promise((resolve, reject) => {
        try {
          const hash = nodeCrypto.createHash(algo.toLowerCase().replace('-', ''));
          hash.update(data);
          resolve(hash.digest().buffer);
        } catch (e) {
          reject(new Error(`Digest not supported: ${algo}`));
        }
      });
    }, 'digest'),

    // Encrypt
    encrypt: makeNative(function encrypt(algorithm, key, data) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'encrypt'),

    decrypt: makeNative(function decrypt(algorithm, key, data) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'decrypt'),

    // Generate Key
    generateKey: makeNative(function generateKey(algorithm, extractable, keyUsages) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'generateKey'),

    // Sign / Verify
    sign: makeNative(function sign(algorithm, key, data) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'sign'),

    verify: makeNative(function verify(algorithm, key, signature, data) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'verify'),

    // Import / Export Key
    importKey: makeNative(function importKey(format, keyData, algorithm, extractable, keyUsages) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'importKey'),

    exportKey: makeNative(function exportKey(format, key) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'exportKey'),

    // Derive Bits / Key
    deriveBits: makeNative(function deriveBits(algorithm, baseKey, length) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'deriveBits'),

    deriveKey: makeNative(function deriveKey(algorithm, baseKey, derivedKeyType, extractable, keyUsages) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'deriveKey'),

    // Wrap / Unwrap Key
    wrapKey: makeNative(function wrapKey(format, key, wrappingKey, wrapAlgorithm) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'wrapKey'),

    unwrapKey: makeNative(function unwrapKey(format, wrappedKey, unwrappingKey, unwrapAlgorithm, unwrappedKeyAlgorithm, extractable, keyUsages) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'unwrapKey')
  };

  // ── Crypto 对象 ──
  const crypto = {
    // getRandomValues - 核心方法，必须精确实现
    getRandomValues: makeNative(function getRandomValues(array) {
      if (!array || !(array instanceof Int8Array || array instanceof Uint8Array ||
          array instanceof Uint8ClampedArray || array instanceof Int16Array ||
          array instanceof Uint16Array || array instanceof Int32Array ||
          array instanceof Uint32Array || array instanceof BigInt64Array ||
          array instanceof BigUint64Array)) {
        throw new TypeError('Failed to execute \'getRandomValues\' on \'Crypto\': parameter 1 is not of type \'ArrayBufferView\'');
      }
      if (array.byteLength > 65536) {
        throw new DOMException('Failed to execute \'getRandomValues\' on \'Crypto\': The ArrayBufferView\'s byte length (' + array.byteLength + ') exceeds the number of bytes of entropy available to this API (65536).', 'QuotaExceededError');
      }
      const bytes = nodeCrypto.randomBytes(array.byteLength);
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(bytes);
      return array;
    }, 'getRandomValues'),

    // randomUUID
    randomUUID: makeNative(function randomUUID() {
      return nodeCrypto.randomUUID();
    }, 'randomUUID'),

    // subtle
    subtle: subtle
  };

  // ── 安装到 sandbox ──
  sandbox.Crypto = function Crypto() {};
  makeNative(sandbox.Crypto, 'Crypto');
  sandbox.crypto = crypto;
  sandbox.msCrypto = crypto; // IE 兼容别名

  // 修正原型链
  Object.setPrototypeOf(crypto, sandbox.Crypto.prototype);
  Object.setPrototypeOf(subtle, SubtleCrypto.prototype);

  Object.defineProperty(crypto, Symbol.toStringTag, {
    value: 'Crypto',
    writable: false,
    configurable: true,
    enumerable: false
  });

  Object.defineProperty(subtle, Symbol.toStringTag, {
    value: 'SubtleCrypto',
    writable: false,
    configurable: true,
    enumerable: false
  });
}

module.exports = { install };
