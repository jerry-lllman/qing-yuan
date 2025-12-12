/**
 * Signal Protocol 持久化存储实现
 * 将 ISignalStorageAdapter 适配为 Signal 库要求的各种 Store
 */
import {
  IdentityKeyStore,
  SessionStore,
  PreKeyStore,
  SignedPreKeyStore,
  KyberPreKeyStore,
  PrivateKey,
  PublicKey,
  ProtocolAddress,
  SessionRecord,
  PreKeyRecord,
  SignedPreKeyRecord,
  KyberPreKeyRecord,
  Direction,
  IdentityChange,
} from '@signalapp/libsignal-client';
import type { ISignalStorageAdapter } from './types';

/**
 * 持久化身份密钥存储
 * 实现 Signal 的 IdentityKeyStore 接口
 */
export class PersistentIdentityKeyStore extends IdentityKeyStore {
  private identityKeyPair: { publicKey: PublicKey; privateKey: PrivateKey } | null = null;
  private registrationId: number | null = null;

  constructor(private readonly storage: ISignalStorageAdapter) {
    super();
  }

  /**
   * 初始化存储（从持久化存储加载密钥）
   */
  async initialize(): Promise<void> {
    const keyPair = await this.storage.getIdentityKeyPair();
    if (keyPair) {
      this.identityKeyPair = {
        publicKey: PublicKey.deserialize(Buffer.from(keyPair.publicKey)),
        privateKey: PrivateKey.deserialize(Buffer.from(keyPair.privateKey)),
      };
    }
    this.registrationId = await this.storage.getLocalRegistrationId();
  }

  /**
   * 检查是否已初始化
   */
  get isInitialized(): boolean {
    return this.identityKeyPair !== null && this.registrationId !== null;
  }

  /**
   * 设置身份密钥对（首次初始化时）
   */
  async setIdentityKeyPair(publicKey: PublicKey, privateKey: PrivateKey): Promise<void> {
    this.identityKeyPair = { publicKey, privateKey };
    await this.storage.saveIdentityKeyPair(
      new Uint8Array(publicKey.serialize()),
      new Uint8Array(privateKey.serialize())
    );
  }

  /**
   * 设置注册 ID（首次初始化时）
   */
  async setRegistrationId(id: number): Promise<void> {
    this.registrationId = id;
    await this.storage.saveLocalRegistrationId(id);
  }

  async getIdentityKey(): Promise<PrivateKey> {
    if (!this.identityKeyPair) {
      throw new Error('Identity key pair not initialized. Call initialize() first.');
    }
    return this.identityKeyPair.privateKey;
  }

  /**
   * 获取身份公钥
   */
  getIdentityPublicKey(): PublicKey {
    if (!this.identityKeyPair) {
      throw new Error('Identity key pair not initialized. Call initialize() first.');
    }
    return this.identityKeyPair.publicKey;
  }

  async getLocalRegistrationId(): Promise<number> {
    if (this.registrationId === null) {
      throw new Error('Registration ID not initialized. Call initialize() first.');
    }
    return this.registrationId;
  }

  async saveIdentity(name: ProtocolAddress, key: PublicKey): Promise<IdentityChange> {
    const address = name.toString();
    const existingKey = await this.storage.getRemoteIdentity(address);
    const newKeyBytes = new Uint8Array(key.serialize());

    if (existingKey) {
      const changed = !this.arraysEqual(existingKey, newKeyBytes);
      await this.storage.saveRemoteIdentity(address, newKeyBytes);
      return changed ? IdentityChange.ReplacedExisting : IdentityChange.NewOrUnchanged;
    }

    await this.storage.saveRemoteIdentity(address, newKeyBytes);
    return IdentityChange.NewOrUnchanged;
  }

  async isTrustedIdentity(
    name: ProtocolAddress,
    key: PublicKey,
    _direction: Direction
  ): Promise<boolean> {
    const address = name.toString();
    const existingKey = await this.storage.getRemoteIdentity(address);

    if (!existingKey) {
      // 首次见到的身份默认信任
      return true;
    }

    return this.arraysEqual(existingKey, new Uint8Array(key.serialize()));
  }

  async getIdentity(name: ProtocolAddress): Promise<PublicKey | null> {
    const address = name.toString();
    const keyBytes = await this.storage.getRemoteIdentity(address);

    if (!keyBytes) {
      return null;
    }

    return PublicKey.deserialize(Buffer.from(keyBytes));
  }

  private arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

/**
 * 持久化会话存储
 * 实现 Signal 的 SessionStore 接口
 */
export class PersistentSessionStore extends SessionStore {
  constructor(private readonly storage: ISignalStorageAdapter) {
    super();
  }

  async saveSession(name: ProtocolAddress, record: SessionRecord): Promise<void> {
    const address = name.toString();
    await this.storage.saveSession(address, new Uint8Array(record.serialize()));
  }

  async getSession(name: ProtocolAddress): Promise<SessionRecord | null> {
    const address = name.toString();
    const data = await this.storage.getSession(address);

    if (!data) {
      return null;
    }

    return SessionRecord.deserialize(Buffer.from(data));
  }

  async getExistingSessions(addresses: ProtocolAddress[]): Promise<SessionRecord[]> {
    const records: SessionRecord[] = [];

    for (const address of addresses) {
      const session = await this.getSession(address);
      if (session) {
        records.push(session);
      }
    }

    return records;
  }

  /**
   * 删除会话
   */
  async removeSession(name: ProtocolAddress): Promise<void> {
    await this.storage.removeSession(name.toString());
  }

  /**
   * 获取所有会话地址
   */
  async getAllSessionAddresses(): Promise<string[]> {
    return this.storage.getAllSessionAddresses();
  }
}

/**
 * 持久化预密钥存储
 * 实现 Signal 的 PreKeyStore 接口
 */
export class PersistentPreKeyStore extends PreKeyStore {
  constructor(private readonly storage: ISignalStorageAdapter) {
    super();
  }

  async savePreKey(id: number, record: PreKeyRecord): Promise<void> {
    await this.storage.savePreKey(id, new Uint8Array(record.serialize()));
  }

  async getPreKey(id: number): Promise<PreKeyRecord> {
    const data = await this.storage.getPreKey(id);

    if (!data) {
      throw new Error(`PreKey ${id} not found`);
    }

    return PreKeyRecord.deserialize(Buffer.from(data));
  }

  async removePreKey(id: number): Promise<void> {
    await this.storage.removePreKey(id);
  }

  /**
   * 获取所有预密钥 ID
   */
  async getAllPreKeyIds(): Promise<number[]> {
    return this.storage.getAllPreKeyIds();
  }
}

/**
 * 持久化签名预密钥存储
 * 实现 Signal 的 SignedPreKeyStore 接口
 */
export class PersistentSignedPreKeyStore extends SignedPreKeyStore {
  constructor(private readonly storage: ISignalStorageAdapter) {
    super();
  }

  async saveSignedPreKey(id: number, record: SignedPreKeyRecord): Promise<void> {
    await this.storage.saveSignedPreKey(id, new Uint8Array(record.serialize()));
  }

  async getSignedPreKey(id: number): Promise<SignedPreKeyRecord> {
    const data = await this.storage.getSignedPreKey(id);

    if (!data) {
      throw new Error(`SignedPreKey ${id} not found`);
    }

    return SignedPreKeyRecord.deserialize(Buffer.from(data));
  }

  /**
   * 删除签名预密钥
   */
  async removeSignedPreKey(id: number): Promise<void> {
    await this.storage.removeSignedPreKey(id);
  }
}

/**
 * 持久化 Kyber 预密钥存储
 * 实现 Signal 的 KyberPreKeyStore 接口
 */
export class PersistentKyberPreKeyStore extends KyberPreKeyStore {
  constructor(private readonly storage: ISignalStorageAdapter) {
    super();
  }

  async saveKyberPreKey(id: number, record: KyberPreKeyRecord): Promise<void> {
    await this.storage.saveKyberPreKey(id, new Uint8Array(record.serialize()));
  }

  async getKyberPreKey(id: number): Promise<KyberPreKeyRecord> {
    const data = await this.storage.getKyberPreKey(id);

    if (!data) {
      throw new Error(`KyberPreKey ${id} not found`);
    }

    return KyberPreKeyRecord.deserialize(Buffer.from(data));
  }

  async markKyberPreKeyUsed(id: number): Promise<void> {
    await this.storage.markKyberPreKeyUsed(id);
  }
}

/**
 * Signal Store 集合
 * 包含所有 Signal Protocol 需要的存储
 */
export interface SignalStores {
  identityStore: PersistentIdentityKeyStore;
  sessionStore: PersistentSessionStore;
  preKeyStore: PersistentPreKeyStore;
  signedPreKeyStore: PersistentSignedPreKeyStore;
  kyberPreKeyStore: PersistentKyberPreKeyStore;
}

/**
 * 创建 Signal Protocol 存储集合
 * @param storage Signal 存储适配器
 * @returns Signal 存储集合
 */
export function createSignalStores(storage: ISignalStorageAdapter): SignalStores {
  return {
    identityStore: new PersistentIdentityKeyStore(storage),
    sessionStore: new PersistentSessionStore(storage),
    preKeyStore: new PersistentPreKeyStore(storage),
    signedPreKeyStore: new PersistentSignedPreKeyStore(storage),
    kyberPreKeyStore: new PersistentKyberPreKeyStore(storage),
  };
}

/**
 * 初始化所有存储（从持久化加载）
 */
export async function initializeSignalStores(stores: SignalStores): Promise<void> {
  await stores.identityStore.initialize();
}
