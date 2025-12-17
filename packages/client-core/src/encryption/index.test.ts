/**
 * 加密客户端测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EncryptionClient, createEncryptionClient } from './index';
import { MemoryStorageAdapter } from '../storage/adapters/memory';

// Mock encryption 模块
vi.mock('@qyra/encryption', () => {
  const mockManager = {
    initialize: vi.fn(),
    getIdentityPublicKey: vi.fn(() => 'mock-public-key-base64'),
    getRegistrationId: vi.fn(() => 12345),
    getDeviceId: vi.fn(() => 1),
    getKyberPreKeyInfo: vi.fn(() => ({
      keyId: 1,
      publicKey: 'mock-kyber-public-key',
      signature: 'mock-kyber-signature',
    })),
    createSession: vi.fn(),
    hasSession: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn(),
    deleteSession: vi.fn(),
    getSessionState: vi.fn(),
    getAllSessionStates: vi.fn(() => []),
  };

  return {
    createPersistentSessionManager: vi.fn(() => mockManager),
    generateKeys: vi.fn(() => ({
      identityKeyPair: {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
      },
      registrationId: 12345,
      signedPreKey: {
        keyId: 1,
        publicKey: 'mock-signed-prekey-public',
        privateKey: 'mock-signed-prekey-private',
        signature: 'mock-signature',
        timestamp: Date.now(),
      },
      preKeys: [],
    })),
  };
});

describe('EncryptionClient', () => {
  let storage: MemoryStorageAdapter;
  let client: EncryptionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new MemoryStorageAdapter({ namespace: 'encryption' });
    client = createEncryptionClient({ storage, deviceId: 1 });
  });

  describe('initialization', () => {
    it('should start in uninitialized state', () => {
      expect(client.getState()).toBe('uninitialized');
      expect(client.getError()).toBeNull();
    });

    it('should initialize successfully', async () => {
      const result = await client.initialize();

      expect(client.getState()).toBe('ready');
      // Mock manager.initialize() 成功不会返回新密钥
      // 新密钥只在 manager.initialize() 抛出错误时才生成
    });

    it('should throw if already initializing', async () => {
      const promise = client.initialize();

      await expect(client.initialize()).rejects.toThrow('Client is already initializing');

      await promise;
    });

    it('should not reinitialize when already ready', async () => {
      await client.initialize();
      const result = await client.initialize();

      expect(result).toBeNull();
    });
  });

  describe('device key info', () => {
    it('should get device key info after initialization', async () => {
      await client.initialize();

      const info = client.getDeviceKeyInfo();

      expect(info).toEqual({
        identityKey: 'mock-public-key-base64',
        registrationId: 12345,
        deviceId: 1,
      });
    });

    it('should throw if not initialized', () => {
      expect(() => client.getDeviceKeyInfo()).toThrow('Encryption client not ready');
    });
  });

  describe('kyber pre key info', () => {
    it('should get kyber pre key info after initialization', async () => {
      await client.initialize();

      const info = client.getKyberPreKeyInfo();

      expect(info).toEqual({
        keyId: 1,
        publicKey: 'mock-kyber-public-key',
        signature: 'mock-kyber-signature',
      });
    });
  });

  describe('session management', () => {
    it('should check session existence', async () => {
      await client.initialize();

      const { createPersistentSessionManager } = await import('@qyra/encryption');
      const mockManager = (createPersistentSessionManager as any).mock.results[0].value;
      mockManager.hasSession.mockResolvedValue(true);

      const hasSession = await client.hasSession('user1', 1);

      expect(hasSession).toBe(true);
      expect(mockManager.hasSession).toHaveBeenCalledWith('user1', 1);
    });

    it('should get session state', async () => {
      await client.initialize();

      const { createPersistentSessionManager } = await import('@qyra/encryption');
      const mockManager = (createPersistentSessionManager as any).mock.results[0].value;
      mockManager.getSessionState.mockReturnValue({
        remoteUserId: 'user1',
        remoteDeviceId: 1,
        established: true,
        createdAt: 1000,
        lastActiveAt: 2000,
      });

      const state = client.getSessionState('user1', 1);

      expect(state).toEqual({
        remoteUserId: 'user1',
        remoteDeviceId: 1,
        established: true,
        createdAt: 1000,
        lastActiveAt: 2000,
      });
    });

    it('should get all session states', async () => {
      await client.initialize();

      const states = client.getAllSessionStates();

      expect(states).toEqual([]);
    });

    it('should delete session', async () => {
      await client.initialize();

      const { createPersistentSessionManager } = await import('@qyra/encryption');
      const mockManager = (createPersistentSessionManager as any).mock.results[0].value;
      mockManager.deleteSession.mockResolvedValue(undefined);

      await client.deleteSession('user1', 1);

      expect(mockManager.deleteSession).toHaveBeenCalledWith('user1', 1);
    });
  });

  describe('encryption and decryption', () => {
    it('should encrypt message', async () => {
      await client.initialize();

      const { createPersistentSessionManager } = await import('@qyra/encryption');
      const mockManager = (createPersistentSessionManager as any).mock.results[0].value;
      mockManager.encrypt.mockResolvedValue({
        type: 3,
        deviceId: 1,
        registrationId: 12345,
        content: 'encrypted-content-base64',
      });

      const result = await client.encrypt('user1', 1, 'Hello');

      expect(result).toEqual({
        type: 3,
        deviceId: 1,
        registrationId: 12345,
        content: 'encrypted-content-base64',
      });
      expect(mockManager.encrypt).toHaveBeenCalledWith('user1', 1, 'Hello');
    });

    it('should decrypt message', async () => {
      await client.initialize();

      const { createPersistentSessionManager } = await import('@qyra/encryption');
      const mockManager = (createPersistentSessionManager as any).mock.results[0].value;
      mockManager.decrypt.mockResolvedValue('Hello');

      const message = {
        type: 3,
        deviceId: 1,
        registrationId: 12345,
        content: 'encrypted-content-base64',
      };

      const result = await client.decrypt('user1', 1, message);

      expect(result).toBe('Hello');
      expect(mockManager.decrypt).toHaveBeenCalledWith('user1', 1, message);
    });
  });

  describe('storage access', () => {
    it('should get signal storage', async () => {
      const signalStorage = client.getSignalStorage();
      expect(signalStorage).toBeDefined();
    });

    it('should get underlying storage', () => {
      const underlyingStorage = client.getStorage();
      expect(underlyingStorage).toBe(storage);
    });
  });

  describe('create session', () => {
    it('should create session with pre key bundle', async () => {
      await client.initialize();

      const { createPersistentSessionManager } = await import('@qyra/encryption');
      const mockManager = (createPersistentSessionManager as any).mock.results[0].value;
      mockManager.createSession.mockResolvedValue(undefined);

      const bundle = {
        userId: 'user1',
        deviceId: 1,
        registrationId: 12345,
        identityKey: 'identity-key-base64',
        signedPreKeyId: 1,
        signedPreKey: 'signed-prekey-base64',
        signedPreKeySignature: 'signature-base64',
        preKeyId: 1,
        preKey: 'prekey-base64',
        kyberPreKeyId: 1,
        kyberPreKey: 'kyber-prekey-base64',
        kyberPreKeySignature: 'kyber-signature-base64',
      };

      await client.createSession(bundle);

      expect(mockManager.createSession).toHaveBeenCalledWith(
        {
          userId: 'user1',
          deviceId: 1,
          registrationId: 12345,
          identityKey: 'identity-key-base64',
          signedPreKeyId: 1,
          signedPreKey: 'signed-prekey-base64',
          signedPreKeySignature: 'signature-base64',
          preKeyId: 1,
          preKey: 'prekey-base64',
        },
        1,
        'kyber-prekey-base64',
        'kyber-signature-base64'
      );
    });
  });
});

describe('createEncryptionClient', () => {
  it('should create an EncryptionClient instance', () => {
    const storage = new MemoryStorageAdapter({ namespace: 'encryption' });
    const client = createEncryptionClient({ storage });

    expect(client).toBeInstanceOf(EncryptionClient);
  });
});
