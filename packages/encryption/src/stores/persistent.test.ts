/**
 * 持久化存储测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PersistentIdentityKeyStore,
  PersistentSessionStore,
  PersistentPreKeyStore,
  PersistentSignedPreKeyStore,
  PersistentKyberPreKeyStore,
  createSignalStores,
  initializeSignalStores,
} from './persistent';
import type { ISignalStorageAdapter } from './types';
import {
  PrivateKey,
  PublicKey,
  ProtocolAddress,
  SessionRecord,
  PreKeyRecord,
  SignedPreKeyRecord,
  KyberPreKeyRecord,
  KEMKeyPair,
  Direction,
  IdentityChange,
} from '@signalapp/libsignal-client';

/**
 * 创建模拟 Signal 存储适配器
 */
function createMockStorage(): ISignalStorageAdapter {
  const store = new Map<string, Uint8Array | number>();

  return {
    async getIdentityKeyPair() {
      const pub = store.get('identity:public');
      const priv = store.get('identity:private');
      if (pub instanceof Uint8Array && priv instanceof Uint8Array) {
        return { publicKey: pub, privateKey: priv };
      }
      return null;
    },

    async saveIdentityKeyPair(publicKey: Uint8Array, privateKey: Uint8Array) {
      store.set('identity:public', publicKey);
      store.set('identity:private', privateKey);
    },

    async getLocalRegistrationId() {
      const id = store.get('registrationId');
      return typeof id === 'number' ? id : null;
    },

    async saveLocalRegistrationId(id: number) {
      store.set('registrationId', id);
    },

    async getRemoteIdentity(address: string) {
      const key = store.get(`remote:${address}`);
      return key instanceof Uint8Array ? key : null;
    },

    async saveRemoteIdentity(address: string, identityKey: Uint8Array) {
      store.set(`remote:${address}`, identityKey);
    },

    async getSession(address: string) {
      const session = store.get(`session:${address}`);
      return session instanceof Uint8Array ? session : null;
    },

    async saveSession(address: string, session: Uint8Array) {
      store.set(`session:${address}`, session);
    },

    async removeSession(address: string) {
      store.delete(`session:${address}`);
    },

    async getAllSessionAddresses() {
      const addresses: string[] = [];
      for (const key of store.keys()) {
        if (typeof key === 'string' && key.startsWith('session:')) {
          addresses.push(key.replace('session:', ''));
        }
      }
      return addresses;
    },

    async getPreKey(id: number) {
      const key = store.get(`prekey:${id}`);
      return key instanceof Uint8Array ? key : null;
    },

    async savePreKey(id: number, preKey: Uint8Array) {
      store.set(`prekey:${id}`, preKey);
    },

    async removePreKey(id: number) {
      store.delete(`prekey:${id}`);
    },

    async getAllPreKeyIds() {
      const ids: number[] = [];
      for (const key of store.keys()) {
        if (typeof key === 'string' && key.startsWith('prekey:')) {
          ids.push(parseInt(key.replace('prekey:', ''), 10));
        }
      }
      return ids;
    },

    async getSignedPreKey(id: number) {
      const key = store.get(`signedprekey:${id}`);
      return key instanceof Uint8Array ? key : null;
    },

    async saveSignedPreKey(id: number, signedPreKey: Uint8Array) {
      store.set(`signedprekey:${id}`, signedPreKey);
    },

    async removeSignedPreKey(id: number) {
      store.delete(`signedprekey:${id}`);
    },

    async getKyberPreKey(id: number) {
      const key = store.get(`kyberprekey:${id}`);
      return key instanceof Uint8Array ? key : null;
    },

    async saveKyberPreKey(id: number, kyberPreKey: Uint8Array) {
      store.set(`kyberprekey:${id}`, kyberPreKey);
    },

    async markKyberPreKeyUsed(id: number) {
      store.set(`kyberprekey:${id}:used`, 1);
    },
  };
}

describe('PersistentIdentityKeyStore', () => {
  let storage: ISignalStorageAdapter;
  let store: PersistentIdentityKeyStore;
  let identityKeyPair: { publicKey: PublicKey; privateKey: PrivateKey };

  beforeEach(async () => {
    storage = createMockStorage();
    store = new PersistentIdentityKeyStore(storage);

    // 生成测试密钥对
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.getPublicKey();
    identityKeyPair = { publicKey, privateKey };
  });

  it('should initialize from storage', async () => {
    // 先保存密钥
    await storage.saveIdentityKeyPair(
      new Uint8Array(identityKeyPair.publicKey.serialize()),
      new Uint8Array(identityKeyPair.privateKey.serialize())
    );
    await storage.saveLocalRegistrationId(12345);

    // 初始化
    await store.initialize();

    expect(store.isInitialized).toBe(true);
    expect(await store.getLocalRegistrationId()).toBe(12345);
  });

  it('should not be initialized without stored keys', async () => {
    await store.initialize();
    expect(store.isInitialized).toBe(false);
  });

  it('should set and get identity key pair', async () => {
    await store.setIdentityKeyPair(identityKeyPair.publicKey, identityKeyPair.privateKey);
    await store.setRegistrationId(12345);

    expect(store.isInitialized).toBe(true);

    const privateKey = await store.getIdentityKey();
    expect(privateKey.serialize()).toEqual(identityKeyPair.privateKey.serialize());

    const publicKey = store.getIdentityPublicKey();
    expect(publicKey.serialize()).toEqual(identityKeyPair.publicKey.serialize());
  });

  it('should save and get remote identity', async () => {
    await store.setIdentityKeyPair(identityKeyPair.publicKey, identityKeyPair.privateKey);
    await store.setRegistrationId(12345);

    const remoteKey = PrivateKey.generate().getPublicKey();
    const address = ProtocolAddress.new('user1', 1);

    const result = await store.saveIdentity(address, remoteKey);
    expect(result).toBe(IdentityChange.NewOrUnchanged);

    const retrieved = await store.getIdentity(address);
    expect(retrieved?.serialize()).toEqual(remoteKey.serialize());
  });

  it('should detect identity change', async () => {
    await store.setIdentityKeyPair(identityKeyPair.publicKey, identityKeyPair.privateKey);
    await store.setRegistrationId(12345);

    const address = ProtocolAddress.new('user1', 1);
    const key1 = PrivateKey.generate().getPublicKey();
    const key2 = PrivateKey.generate().getPublicKey();

    // 首次保存
    await store.saveIdentity(address, key1);

    // 更改身份
    const result = await store.saveIdentity(address, key2);
    expect(result).toBe(IdentityChange.ReplacedExisting);
  });

  it('should trust first seen identity', async () => {
    await store.setIdentityKeyPair(identityKeyPair.publicKey, identityKeyPair.privateKey);
    await store.setRegistrationId(12345);

    const address = ProtocolAddress.new('user1', 1);
    const key = PrivateKey.generate().getPublicKey();

    const trusted = await store.isTrustedIdentity(address, key, Direction.Sending);
    expect(trusted).toBe(true);
  });

  it('should trust matching identity', async () => {
    await store.setIdentityKeyPair(identityKeyPair.publicKey, identityKeyPair.privateKey);
    await store.setRegistrationId(12345);

    const address = ProtocolAddress.new('user1', 1);
    const key = PrivateKey.generate().getPublicKey();

    await store.saveIdentity(address, key);

    const trusted = await store.isTrustedIdentity(address, key, Direction.Sending);
    expect(trusted).toBe(true);
  });

  it('should not trust different identity', async () => {
    await store.setIdentityKeyPair(identityKeyPair.publicKey, identityKeyPair.privateKey);
    await store.setRegistrationId(12345);

    const address = ProtocolAddress.new('user1', 1);
    const key1 = PrivateKey.generate().getPublicKey();
    const key2 = PrivateKey.generate().getPublicKey();

    await store.saveIdentity(address, key1);

    const trusted = await store.isTrustedIdentity(address, key2, Direction.Sending);
    expect(trusted).toBe(false);
  });
});

describe('PersistentSessionStore', () => {
  let storage: ISignalStorageAdapter;
  let store: PersistentSessionStore;

  beforeEach(() => {
    storage = createMockStorage();
    store = new PersistentSessionStore(storage);
  });

  it('should return null for non-existent session', async () => {
    const address = ProtocolAddress.new('user1', 1);
    const session = await store.getSession(address);
    expect(session).toBeNull();
  });

  it('should get all session addresses', async () => {
    const addresses = await store.getAllSessionAddresses();
    expect(addresses).toEqual([]);
  });
});

describe('PersistentPreKeyStore', () => {
  let storage: ISignalStorageAdapter;
  let store: PersistentPreKeyStore;

  beforeEach(() => {
    storage = createMockStorage();
    store = new PersistentPreKeyStore(storage);
  });

  it('should save and get pre key', async () => {
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.getPublicKey();
    const record = PreKeyRecord.new(1, publicKey, privateKey);

    await store.savePreKey(1, record);
    const retrieved = await store.getPreKey(1);

    expect(retrieved.id()).toBe(1);
    expect(retrieved.publicKey().serialize()).toEqual(publicKey.serialize());
  });

  it('should throw for non-existent pre key', async () => {
    await expect(store.getPreKey(999)).rejects.toThrow('PreKey 999 not found');
  });

  it('should remove pre key', async () => {
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.getPublicKey();
    const record = PreKeyRecord.new(1, publicKey, privateKey);

    await store.savePreKey(1, record);
    await store.removePreKey(1);

    await expect(store.getPreKey(1)).rejects.toThrow();
  });

  it('should get all pre key ids', async () => {
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.getPublicKey();

    await store.savePreKey(1, PreKeyRecord.new(1, publicKey, privateKey));
    await store.savePreKey(2, PreKeyRecord.new(2, publicKey, privateKey));
    await store.savePreKey(3, PreKeyRecord.new(3, publicKey, privateKey));

    const ids = await store.getAllPreKeyIds();
    expect(ids.sort()).toEqual([1, 2, 3]);
  });
});

describe('PersistentSignedPreKeyStore', () => {
  let storage: ISignalStorageAdapter;
  let store: PersistentSignedPreKeyStore;

  beforeEach(() => {
    storage = createMockStorage();
    store = new PersistentSignedPreKeyStore(storage);
  });

  it('should save and get signed pre key', async () => {
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.getPublicKey();
    const signature = Buffer.from('test-signature');
    const record = SignedPreKeyRecord.new(1, Date.now(), publicKey, privateKey, signature);

    await store.saveSignedPreKey(1, record);
    const retrieved = await store.getSignedPreKey(1);

    expect(retrieved.id()).toBe(1);
    expect(retrieved.publicKey().serialize()).toEqual(publicKey.serialize());
  });

  it('should throw for non-existent signed pre key', async () => {
    await expect(store.getSignedPreKey(999)).rejects.toThrow('SignedPreKey 999 not found');
  });

  it('should remove signed pre key', async () => {
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.getPublicKey();
    const signature = Buffer.from('test-signature');
    const record = SignedPreKeyRecord.new(1, Date.now(), publicKey, privateKey, signature);

    await store.saveSignedPreKey(1, record);
    await store.removeSignedPreKey(1);

    await expect(store.getSignedPreKey(1)).rejects.toThrow();
  });
});

describe('PersistentKyberPreKeyStore', () => {
  let storage: ISignalStorageAdapter;
  let store: PersistentKyberPreKeyStore;

  beforeEach(() => {
    storage = createMockStorage();
    store = new PersistentKyberPreKeyStore(storage);
  });

  it('should save and get kyber pre key', async () => {
    const keyPair = KEMKeyPair.generate();
    const signature = Buffer.from('test-signature');
    const record = KyberPreKeyRecord.new(1, Date.now(), keyPair, signature);

    await store.saveKyberPreKey(1, record);
    const retrieved = await store.getKyberPreKey(1);

    expect(retrieved.id()).toBe(1);
  });

  it('should throw for non-existent kyber pre key', async () => {
    await expect(store.getKyberPreKey(999)).rejects.toThrow('KyberPreKey 999 not found');
  });

  it('should mark kyber pre key used', async () => {
    const keyPair = KEMKeyPair.generate();
    const signature = Buffer.from('test-signature');
    const record = KyberPreKeyRecord.new(1, Date.now(), keyPair, signature);

    await store.saveKyberPreKey(1, record);
    await store.markKyberPreKeyUsed(1);

    // 应该不会抛出错误
  });
});

describe('createSignalStores', () => {
  it('should create all stores', () => {
    const storage = createMockStorage();
    const stores = createSignalStores(storage);

    expect(stores.identityStore).toBeInstanceOf(PersistentIdentityKeyStore);
    expect(stores.sessionStore).toBeInstanceOf(PersistentSessionStore);
    expect(stores.preKeyStore).toBeInstanceOf(PersistentPreKeyStore);
    expect(stores.signedPreKeyStore).toBeInstanceOf(PersistentSignedPreKeyStore);
    expect(stores.kyberPreKeyStore).toBeInstanceOf(PersistentKyberPreKeyStore);
  });
});

describe('initializeSignalStores', () => {
  it('should initialize identity store', async () => {
    const storage = createMockStorage();
    const stores = createSignalStores(storage);

    // 先保存密钥
    const privateKey = PrivateKey.generate();
    const publicKey = privateKey.getPublicKey();
    await storage.saveIdentityKeyPair(
      new Uint8Array(publicKey.serialize()),
      new Uint8Array(privateKey.serialize())
    );
    await storage.saveLocalRegistrationId(12345);

    await initializeSignalStores(stores);

    expect(stores.identityStore.isInitialized).toBe(true);
  });
});
