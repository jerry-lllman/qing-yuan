/**
 * 密钥生成模块测试
 */
import { describe, it, expect } from 'vitest';
import {
  generateRegistrationId,
  generateIdentityKeyPair,
  generatePreKeys,
  generateSignedPreKey,
  verifySignedPreKey,
  generateKeys,
  createPreKeyBundle,
  shouldRotateSignedPreKey,
  toBase64,
  fromBase64,
} from './index';

describe('Base64 工具函数', () => {
  it('应该正确进行 Base64 编解码', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const base64 = toBase64(original);
    const decoded = fromBase64(base64);

    expect(base64).toBe('AQIDBAU=');
    expect(decoded).toEqual(original);
  });
});

describe('generateRegistrationId', () => {
  it('应该生成 1-16380 范围内的随机数', () => {
    for (let i = 0; i < 100; i++) {
      const id = generateRegistrationId();
      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(16380);
    }
  });

  it('多次生成应该产生不同的值', () => {
    const ids = new Set<number>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateRegistrationId());
    }
    // 100 次生成应该至少有 10 个不同的值
    expect(ids.size).toBeGreaterThan(10);
  });
});

describe('generateIdentityKeyPair', () => {
  it('应该生成有效的密钥对', () => {
    const keyPair = generateIdentityKeyPair();

    expect(keyPair).toHaveProperty('publicKey');
    expect(keyPair).toHaveProperty('privateKey');
    expect(typeof keyPair.publicKey).toBe('string');
    expect(typeof keyPair.privateKey).toBe('string');
    // Base64 编码的密钥应该有一定长度
    expect(keyPair.publicKey.length).toBeGreaterThan(10);
    expect(keyPair.privateKey.length).toBeGreaterThan(10);
  });

  it('多次生成应该产生不同的密钥对', () => {
    const keyPair1 = generateIdentityKeyPair();
    const keyPair2 = generateIdentityKeyPair();

    expect(keyPair1.publicKey).not.toBe(keyPair2.publicKey);
    expect(keyPair1.privateKey).not.toBe(keyPair2.privateKey);
  });
});

describe('generatePreKeys', () => {
  it('应该生成指定数量的预密钥', () => {
    const preKeys = generatePreKeys(10, 1);

    expect(preKeys).toHaveLength(10);
  });

  it('预密钥 ID 应该从指定值开始递增', () => {
    const preKeys = generatePreKeys(5, 100);

    expect(preKeys[0]?.keyId).toBe(100);
    expect(preKeys[1]?.keyId).toBe(101);
    expect(preKeys[4]?.keyId).toBe(104);
  });

  it('每个预密钥应该包含完整的密钥信息', () => {
    const preKeys = generatePreKeys(3, 1);

    for (const preKey of preKeys) {
      expect(preKey).toHaveProperty('keyId');
      expect(preKey).toHaveProperty('publicKey');
      expect(preKey).toHaveProperty('privateKey');
      expect(typeof preKey.publicKey).toBe('string');
      expect(typeof preKey.privateKey).toBe('string');
    }
  });

  it('每个预密钥应该是唯一的', () => {
    const preKeys = generatePreKeys(10, 1);
    const publicKeys = preKeys.map((pk) => pk.publicKey);
    const uniqueKeys = new Set(publicKeys);

    expect(uniqueKeys.size).toBe(preKeys.length);
  });
});

describe('generateSignedPreKey', () => {
  it('应该生成有效的签名预密钥', () => {
    const identityKeyPair = generateIdentityKeyPair();
    const signedPreKey = generateSignedPreKey(identityKeyPair.privateKey, 1);

    expect(signedPreKey).toHaveProperty('keyId', 1);
    expect(signedPreKey).toHaveProperty('publicKey');
    expect(signedPreKey).toHaveProperty('privateKey');
    expect(signedPreKey).toHaveProperty('signature');
    expect(signedPreKey).toHaveProperty('timestamp');
    expect(signedPreKey.timestamp).toBeLessThanOrEqual(Date.now());
  });
});

describe('verifySignedPreKey', () => {
  it('应该验证有效的签名', () => {
    const identityKeyPair = generateIdentityKeyPair();
    const signedPreKey = generateSignedPreKey(identityKeyPair.privateKey, 1);

    const isValid = verifySignedPreKey(identityKeyPair.publicKey, signedPreKey);
    expect(isValid).toBe(true);
  });

  it('应该拒绝无效的签名', () => {
    const identityKeyPair1 = generateIdentityKeyPair();
    const identityKeyPair2 = generateIdentityKeyPair();
    const signedPreKey = generateSignedPreKey(identityKeyPair1.privateKey, 1);

    // 使用错误的公钥验证
    const isValid = verifySignedPreKey(identityKeyPair2.publicKey, signedPreKey);
    expect(isValid).toBe(false);
  });

  it('应该拒绝被篡改的签名', () => {
    const identityKeyPair = generateIdentityKeyPair();
    const signedPreKey = generateSignedPreKey(identityKeyPair.privateKey, 1);

    // 篡改签名
    const tamperedSignedPreKey = {
      ...signedPreKey,
      signature: toBase64(new Uint8Array([1, 2, 3, 4])),
    };

    const isValid = verifySignedPreKey(identityKeyPair.publicKey, tamperedSignedPreKey);
    expect(isValid).toBe(false);
  });
});

describe('generateKeys', () => {
  it('应该生成完整的密钥集合', () => {
    const keys = generateKeys();

    expect(keys).toHaveProperty('identityKeyPair');
    expect(keys).toHaveProperty('registrationId');
    expect(keys).toHaveProperty('preKeys');
    expect(keys).toHaveProperty('signedPreKey');

    // 默认生成 100 个预密钥
    expect(keys.preKeys).toHaveLength(100);
  });

  it('应该支持自定义选项', () => {
    const keys = generateKeys({
      preKeyCount: 50,
      preKeyStartId: 200,
      signedPreKeyId: 5,
    });

    expect(keys.preKeys).toHaveLength(50);
    expect(keys.preKeys[0]?.keyId).toBe(200);
    expect(keys.signedPreKey.keyId).toBe(5);
  });

  it('签名预密钥应该能被验证', () => {
    const keys = generateKeys();
    const isValid = verifySignedPreKey(keys.identityKeyPair.publicKey, keys.signedPreKey);

    expect(isValid).toBe(true);
  });
});

describe('createPreKeyBundle', () => {
  it('应该创建不包含一次性预密钥的密钥包', () => {
    const keys = generateKeys({ preKeyCount: 10 });
    const bundle = createPreKeyBundle('user-123', 1, keys);

    expect(bundle.userId).toBe('user-123');
    expect(bundle.deviceId).toBe(1);
    expect(bundle.registrationId).toBe(keys.registrationId);
    expect(bundle.identityKey).toBe(keys.identityKeyPair.publicKey);
    expect(bundle.signedPreKeyId).toBe(keys.signedPreKey.keyId);
    expect(bundle.signedPreKey).toBe(keys.signedPreKey.publicKey);
    expect(bundle.signedPreKeySignature).toBe(keys.signedPreKey.signature);
    expect(bundle.preKeyId).toBeUndefined();
    expect(bundle.preKey).toBeUndefined();
  });

  it('应该创建包含一次性预密钥的密钥包', () => {
    const keys = generateKeys({ preKeyCount: 10 });
    const bundle = createPreKeyBundle('user-456', 2, keys, 5);

    expect(bundle.preKeyId).toBe(keys.preKeys[5]?.keyId);
    expect(bundle.preKey).toBe(keys.preKeys[5]?.publicKey);
  });
});

describe('shouldRotateSignedPreKey', () => {
  it('新的签名预密钥不需要轮换', () => {
    const identityKeyPair = generateIdentityKeyPair();
    const signedPreKey = generateSignedPreKey(identityKeyPair.privateKey, 1);

    expect(shouldRotateSignedPreKey(signedPreKey)).toBe(false);
  });

  it('超过有效期的签名预密钥需要轮换', () => {
    const identityKeyPair = generateIdentityKeyPair();
    const signedPreKey = generateSignedPreKey(identityKeyPair.privateKey, 1);

    // 模拟 8 天前创建的密钥
    const oldSignedPreKey = {
      ...signedPreKey,
      timestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
    };

    expect(shouldRotateSignedPreKey(oldSignedPreKey)).toBe(true);
  });

  it('应该支持自定义最大有效期', () => {
    const identityKeyPair = generateIdentityKeyPair();
    const signedPreKey = generateSignedPreKey(identityKeyPair.privateKey, 1);

    // 1 小时前创建的密钥
    const oldSignedPreKey = {
      ...signedPreKey,
      timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 小时前
    };

    // 自定义 1 小时有效期
    const oneHourMs = 60 * 60 * 1000;
    expect(shouldRotateSignedPreKey(oldSignedPreKey, oneHourMs)).toBe(true);
  });
});
