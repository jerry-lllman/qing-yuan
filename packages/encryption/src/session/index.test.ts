/**
 * 会话管理模块测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { SignalSessionManager, createSessionManager, generateKyberPreKey } from './index';
import { generateKeys, createPreKeyBundle, fromBase64 } from '../keys';
import { PrivateKey, CiphertextMessageType } from '@signalapp/libsignal-client';

describe('generateKyberPreKey', () => {
  it('应该生成有效的 Kyber 预密钥', () => {
    const keys = generateKeys({ preKeyCount: 10 });
    const privateKeyBytes = fromBase64(keys.identityKeyPair.privateKey);
    const identityPrivateKey = PrivateKey.deserialize(Buffer.from(privateKeyBytes));

    const kyberPreKey = generateKyberPreKey(identityPrivateKey, 1);

    expect(kyberPreKey.keyId).toBe(1);
    expect(kyberPreKey.keyPair).toBeDefined();
    expect(kyberPreKey.signature).toBeInstanceOf(Uint8Array);
    expect(kyberPreKey.signature.length).toBeGreaterThan(0);
    expect(kyberPreKey.timestamp).toBeLessThanOrEqual(Date.now());
  });
});

describe('SignalSessionManager', () => {
  let aliceKeys: ReturnType<typeof generateKeys>;
  let bobKeys: ReturnType<typeof generateKeys>;
  let aliceManager: SignalSessionManager;
  let bobManager: SignalSessionManager;

  beforeEach(() => {
    // 为 Alice 和 Bob 生成密钥
    aliceKeys = generateKeys({ preKeyCount: 10 });
    bobKeys = generateKeys({ preKeyCount: 10 });

    // 创建会话管理器
    aliceManager = createSessionManager(aliceKeys, 1);
    bobManager = createSessionManager(bobKeys, 1);
  });

  describe('创建会话管理器', () => {
    it('应该正确初始化会话管理器', () => {
      expect(aliceManager.getRegistrationId()).toBe(aliceKeys.registrationId);
      expect(aliceManager.getDeviceId()).toBe(1);
      expect(aliceManager.getIdentityPublicKey()).toBeTruthy();
    });

    it('应该生成 Kyber 预密钥信息', () => {
      const kyberInfo = aliceManager.getKyberPreKeyInfo();

      expect(kyberInfo).not.toBeNull();
      expect(kyberInfo?.keyId).toBe(1);
      expect(kyberInfo?.publicKey).toBeTruthy();
      expect(kyberInfo?.signature).toBeTruthy();
    });
  });

  describe('会话建立与加密通信', () => {
    it('应该能够建立会话', async () => {
      // Bob 的预密钥包
      const bobBundle = createPreKeyBundle('bob', 1, bobKeys, 0);
      const bobKyberInfo = bobManager.getKyberPreKeyInfo();

      expect(bobKyberInfo).not.toBeNull();

      // Alice 使用 Bob 的预密钥包建立会话
      await aliceManager.createSession(
        bobBundle,
        bobKyberInfo!.keyId,
        bobKyberInfo!.publicKey,
        bobKyberInfo!.signature
      );

      // 验证会话已建立
      const hasSession = await aliceManager.hasSession('bob', 1);
      expect(hasSession).toBe(true);

      // 验证会话状态
      const sessionState = aliceManager.getSessionState('bob', 1);
      expect(sessionState).not.toBeNull();
      expect(sessionState?.established).toBe(true);
      expect(sessionState?.remoteUserId).toBe('bob');
      expect(sessionState?.remoteDeviceId).toBe(1);
    });

    it('应该能够加密和解密消息', async () => {
      // Bob 的预密钥包
      const bobBundle = createPreKeyBundle('bob', 1, bobKeys, 0);
      const bobKyberInfo = bobManager.getKyberPreKeyInfo();

      // Alice 使用 Bob 的预密钥包建立会话
      await aliceManager.createSession(
        bobBundle,
        bobKyberInfo!.keyId,
        bobKyberInfo!.publicKey,
        bobKyberInfo!.signature
      );

      // Alice 发送消息给 Bob
      const plaintext = 'Hello, Bob! This is a secret message.';
      const encrypted = await aliceManager.encrypt('bob', 1, plaintext);

      expect(encrypted.type).toBe(CiphertextMessageType.PreKey); // 首次消息是 PreKey 消息
      expect(encrypted.content).toBeTruthy();
      expect(encrypted.deviceId).toBe(1);
      expect(encrypted.registrationId).toBe(aliceKeys.registrationId);

      // Bob 解密消息
      const decrypted = await bobManager.decrypt('alice', 1, {
        ...encrypted,
        // 模拟 Alice 的设备信息
        deviceId: 1,
        registrationId: aliceKeys.registrationId,
      });

      expect(decrypted).toBe(plaintext);
    });

    it('应该能够双向通信', async () => {
      // Alice 和 Bob 互相建立会话
      const bobBundle = createPreKeyBundle('bob', 1, bobKeys, 0);
      const bobKyberInfo = bobManager.getKyberPreKeyInfo();
      await aliceManager.createSession(
        bobBundle,
        bobKyberInfo!.keyId,
        bobKyberInfo!.publicKey,
        bobKyberInfo!.signature
      );

      // Alice -> Bob
      const msg1 = 'Hello Bob!';
      const enc1 = await aliceManager.encrypt('bob', 1, msg1);
      const dec1 = await bobManager.decrypt('alice', 1, enc1);
      expect(dec1).toBe(msg1);

      // Bob -> Alice (现在 Bob 也有了与 Alice 的会话)
      const msg2 = 'Hello Alice!';
      const enc2 = await bobManager.encrypt('alice', 1, msg2);
      const dec2 = await aliceManager.decrypt('bob', 1, enc2);
      expect(dec2).toBe(msg2);

      // 后续消息应该是 Whisper 消息
      const msg3 = 'Another message';
      const enc3 = await aliceManager.encrypt('bob', 1, msg3);
      expect(enc3.type).toBe(CiphertextMessageType.Whisper);

      const dec3 = await bobManager.decrypt('alice', 1, enc3);
      expect(dec3).toBe(msg3);
    });

    it('应该能够处理长消息', async () => {
      const bobBundle = createPreKeyBundle('bob', 1, bobKeys, 0);
      const bobKyberInfo = bobManager.getKyberPreKeyInfo();
      await aliceManager.createSession(
        bobBundle,
        bobKyberInfo!.keyId,
        bobKyberInfo!.publicKey,
        bobKyberInfo!.signature
      );

      // 生成长消息
      const longMessage = 'A'.repeat(10000);
      const encrypted = await aliceManager.encrypt('bob', 1, longMessage);
      const decrypted = await bobManager.decrypt('alice', 1, encrypted);

      expect(decrypted).toBe(longMessage);
    });

    it('应该能够处理 Unicode 消息', async () => {
      const bobBundle = createPreKeyBundle('bob', 1, bobKeys, 0);
      const bobKyberInfo = bobManager.getKyberPreKeyInfo();
      await aliceManager.createSession(
        bobBundle,
        bobKyberInfo!.keyId,
        bobKyberInfo!.publicKey,
        bobKyberInfo!.signature
      );

      const unicodeMessage = '你好世界！🎉 مرحبا بالعالم 🌍';
      const encrypted = await aliceManager.encrypt('bob', 1, unicodeMessage);
      const decrypted = await bobManager.decrypt('alice', 1, encrypted);

      expect(decrypted).toBe(unicodeMessage);
    });
  });

  describe('会话状态管理', () => {
    it('应该正确追踪多个会话', async () => {
      // 创建第三个用户 Charlie
      const charlieKeys = generateKeys({ preKeyCount: 10 });
      const charlieManager = createSessionManager(charlieKeys, 1);

      // Alice 与 Bob 建立会话
      const bobBundle = createPreKeyBundle('bob', 1, bobKeys, 0);
      const bobKyberInfo = bobManager.getKyberPreKeyInfo();
      await aliceManager.createSession(
        bobBundle,
        bobKyberInfo!.keyId,
        bobKyberInfo!.publicKey,
        bobKyberInfo!.signature
      );

      // Alice 与 Charlie 建立会话
      const charlieBundle = createPreKeyBundle('charlie', 1, charlieKeys, 0);
      const charlieKyberInfo = charlieManager.getKyberPreKeyInfo();
      await aliceManager.createSession(
        charlieBundle,
        charlieKyberInfo!.keyId,
        charlieKyberInfo!.publicKey,
        charlieKyberInfo!.signature
      );

      // 验证所有会话
      const allSessions = aliceManager.getAllSessionStates();
      expect(allSessions).toHaveLength(2);

      expect(await aliceManager.hasSession('bob', 1)).toBe(true);
      expect(await aliceManager.hasSession('charlie', 1)).toBe(true);
      expect(await aliceManager.hasSession('unknown', 1)).toBe(false);
    });

    it('应该能够删除会话', async () => {
      const bobBundle = createPreKeyBundle('bob', 1, bobKeys, 0);
      const bobKyberInfo = bobManager.getKyberPreKeyInfo();
      await aliceManager.createSession(
        bobBundle,
        bobKyberInfo!.keyId,
        bobKyberInfo!.publicKey,
        bobKyberInfo!.signature
      );

      expect(aliceManager.getSessionState('bob', 1)).not.toBeNull();

      await aliceManager.deleteSession('bob', 1);

      expect(aliceManager.getSessionState('bob', 1)).toBeNull();
    });

    it('未建立会话时应该返回 null', () => {
      const state = aliceManager.getSessionState('unknown', 1);
      expect(state).toBeNull();
    });
  });
});

describe('createSessionManager', () => {
  it('应该创建有效的会话管理器', () => {
    const keys = generateKeys({ preKeyCount: 10 });
    const manager = createSessionManager(keys, 2);

    expect(manager).toBeInstanceOf(SignalSessionManager);
    expect(manager.getDeviceId()).toBe(2);
  });

  it('设备 ID 默认应该为 1', () => {
    const keys = generateKeys({ preKeyCount: 10 });
    const manager = createSessionManager(keys);

    expect(manager.getDeviceId()).toBe(1);
  });
});
